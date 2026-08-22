package main

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func generateToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

type signupRequest struct {
	EmployeeID string `json:"employee_id"`
	Email      string `json:"email"`
	Password   string `json:"password"`
}

func signupHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		var req signupRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		req.EmployeeID = strings.TrimSpace(req.EmployeeID)
		req.Email = strings.ToLower(strings.TrimSpace(req.Email))
		if req.EmployeeID == "" || req.Email == "" || len(req.Password) < 8 {
			writeError(w, http.StatusBadRequest, "employee_id, email, and a password of at least 8 characters are required")
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not hash password")
			return
		}
		verifyToken, err := generateToken()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not generate verification token")
			return
		}
		expiresAt := time.Now().Add(24 * time.Hour)
		verifyTokenHash := sha256.Sum256([]byte(verifyToken))

		var userID int
		err = pool.QueryRow(r.Context(), `
			INSERT INTO users (employee_id, email, password_hash, role, verification_token, verification_expires_at)
			VALUES ($1, $2, $3, 'employee', $4, $5)
			RETURNING id
		`, req.EmployeeID, req.Email, string(hash), hex.EncodeToString(verifyTokenHash[:]), expiresAt).Scan(&userID)
		if err != nil {
			writeError(w, http.StatusConflict, "employee_id or email already registered")
			return
		}

		if _, err := pool.Exec(r.Context(),
			`INSERT INTO employee_profiles (user_id) VALUES ($1)`, userID,
		); err != nil {
			log.Printf("signup: create profile row: %v", err)
		}

		// No SMTP provider configured yet — log the verification link instead
		// of sending it. The token/endpoint are real; only delivery is stubbed.
		if os.Getenv("APP_ENV") == "production" {
			log.Printf("email verification requested for user %d", userID)
		} else {
			log.Printf("development verification link for %s: /auth/verify?token=%s", req.Email, verifyToken)
		}

		writeJSON(w, http.StatusCreated, map[string]interface{}{
			"id":          userID,
			"employee_id": req.EmployeeID,
			"email":       req.Email,
			"role":        "employee",
		})
	}
}

func verifyHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		if token == "" {
			writeError(w, http.StatusBadRequest, "missing token")
			return
		}
		tokenHash := sha256.Sum256([]byte(token))
		tag, err := pool.Exec(r.Context(), `
			UPDATE users
			SET email_verified = TRUE, verification_token = NULL
			WHERE verification_token = $1 AND verification_expires_at > now()
		`, hex.EncodeToString(tokenHash[:]))
		if err != nil || tag.RowsAffected() == 0 {
			writeError(w, http.StatusBadRequest, "invalid or expired token")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "verified"})
	}
}

type signinRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func signinHandler(pool *pgxpool.Pool, mailer *SMTPMailer) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		var req signinRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		var userID int
		req.Email = strings.ToLower(strings.TrimSpace(req.Email))
		var passwordHash, role string
		var emailVerified, mustChangePassword bool
		err := pool.QueryRow(r.Context(),
			`SELECT id, password_hash, role, email_verified, must_change_password FROM users WHERE lower(email) = $1`, req.Email,
		).Scan(&userID, &passwordHash, &role, &emailVerified, &mustChangePassword)
		if err == pgx.ErrNoRows {
			writeError(w, http.StatusUnauthorized, "invalid email or password")
			return
		} else if err != nil {
			writeError(w, http.StatusInternalServerError, "sign in failed")
			return
		}

		if bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)) != nil {
			writeError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		if !emailVerified {
			writeError(w, http.StatusForbidden, "verify your email before signing in")
			return
		}
		if mustChangePassword {
			if err := sendFirstLoginOTP(r.Context(), pool, mailer, userID, req.Email); err != nil {
				writeError(w, http.StatusServiceUnavailable, "could not send password setup code")
				return
			}
			writeJSON(w, http.StatusOK, map[string]interface{}{"password_change_required": true, "email": req.Email})
			return
		}

		session, err := sessions.Create(r.Context(), userID, role, r.UserAgent())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create session")
			return
		}
		token, err := issueToken(userID, role, session.ID)
		if err != nil {
			_ = sessions.Revoke(r.Context(), session.ID)
			writeError(w, http.StatusInternalServerError, "could not issue token")
			return
		}
		setAuthCookie(w, token)
		writeJSON(w, http.StatusOK, map[string]string{"role": role})
	}
}

func logoutHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if sessions != nil {
			if c, err := parseToken(requestToken(r)); err == nil {
				_ = sessions.Revoke(r.Context(), c.ID)
			}
		}
		clearAuthCookie(w)
		w.WriteHeader(http.StatusNoContent)
	}
}

func sessionsHandler() http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		items, err := sessions.List(r.Context(), userID(r), sessionID(r))
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list sessions")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{"sessions": items})
	})
}

func logoutAllHandler() http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if err := sessions.RevokeAll(r.Context(), userID(r)); err != nil {
			writeError(w, http.StatusInternalServerError, "could not revoke sessions")
			return
		}
		clearAuthCookie(w)
		w.WriteHeader(http.StatusNoContent)
	})
}

func meHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		var employeeID, email, role string
		err := pool.QueryRow(r.Context(),
			`SELECT employee_id, email, role FROM users WHERE id = $1`, userID(r),
		).Scan(&employeeID, &email, &role)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "account unavailable")
			return
		}
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"id": userID(r), "employee_id": employeeID, "email": email, "role": role,
		})
	})
}
