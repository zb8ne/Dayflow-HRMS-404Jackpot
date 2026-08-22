package main

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const invitationTTL = 10 * time.Minute
const invitationMaxAttempts = 5

func sendFirstLoginOTP(ctx context.Context, pool *pgxpool.Pool, mailer *SMTPMailer, userID int, email string) error {
	if !mailer.Configured() {
		return fmt.Errorf("email service is not configured")
	}
	otp, err := generateOTP()
	if err != nil {
		return err
	}
	otpHash, err := hashOTP(email, otp)
	if err != nil {
		return err
	}
	tag, err := pool.Exec(ctx, `UPDATE employee_invitations SET otp_hash=$1,expires_at=$2,attempts=0,otp_sent_at=now() WHERE user_id=$3 AND used_at IS NULL AND (otp_sent_at IS NULL OR otp_sent_at < now()-interval '60 seconds')`, otpHash, time.Now().UTC().Add(invitationTTL), userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() != 1 {
		return fmt.Errorf("please wait before requesting another code")
	}
	body := "Your Dayflow password setup code is " + otp + ". It expires in 10 minutes. Never share this code with anyone."
	if err := mailer.Send(email, "Your Dayflow password setup code", body); err != nil {
		_, _ = pool.Exec(ctx, `UPDATE employee_invitations SET otp_hash=NULL,expires_at=NULL WHERE user_id=$1 AND otp_hash=$2`, userID, otpHash)
		return err
	}
	return nil
}

func generateOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func hashOTP(email, otp string) (string, error) {
	secret, err := jwtSecret()
	if err != nil {
		return "", err
	}
	h := hmac.New(sha256.New, secret)
	h.Write([]byte(strings.ToLower(strings.TrimSpace(email)) + ":" + otp))
	return hex.EncodeToString(h.Sum(nil)), nil
}

type createEmployeeRequest struct {
	EmployeeID string `json:"employee_id"`
	Email      string `json:"email"`
	FullName   string `json:"full_name"`
	JobTitle   string `json:"job_title"`
	Department string `json:"department"`
	Phone      string `json:"phone"`
	DateJoined string `json:"date_joined"`
}

func createEmployeeHandler(pool *pgxpool.Pool, mailer *SMTPMailer) http.HandlerFunc {
	return requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		if !mailer.Configured() {
			writeError(w, http.StatusServiceUnavailable, "email service is not configured")
			return
		}
		var req createEmployeeRequest
		if json.NewDecoder(r.Body).Decode(&req) != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		req.EmployeeID = strings.TrimSpace(req.EmployeeID)
		req.Email = strings.ToLower(strings.TrimSpace(req.Email))
		req.FullName = strings.TrimSpace(req.FullName)
		if req.EmployeeID == "" || req.Email == "" || req.FullName == "" || !strings.Contains(req.Email, "@") {
			writeError(w, http.StatusBadRequest, "employee_id, full_name, and a valid email are required")
			return
		}
		if req.DateJoined != "" {
			if _, err := time.Parse("2006-01-02", req.DateJoined); err != nil {
				writeError(w, http.StatusBadRequest, "date_joined must use YYYY-MM-DD")
				return
			}
		}
		temporaryPassword, err := generateTemporaryPassword()
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create employee")
			return
		}
		passwordHash, err := bcrypt.GenerateFromPassword([]byte(temporaryPassword), bcrypt.DefaultCost)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create employee")
			return
		}
		tx, err := pool.Begin(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create employee")
			return
		}
		defer tx.Rollback(r.Context())
		var id int
		err = tx.QueryRow(r.Context(), `INSERT INTO users (employee_id,email,password_hash,role,email_verified,must_change_password) VALUES ($1,$2,$3,'employee',TRUE,TRUE) RETURNING id`, req.EmployeeID, req.Email, string(passwordHash)).Scan(&id)
		if err != nil {
			writeError(w, http.StatusConflict, "employee_id or email already exists")
			return
		}
		_, err = tx.Exec(r.Context(), `INSERT INTO employee_profiles (user_id,full_name,job_title,department,phone,date_joined) VALUES ($1,$2,$3,$4,$5,NULLIF($6,'')::date)`, id, req.FullName, req.JobTitle, req.Department, req.Phone, req.DateJoined)
		if err == nil {
			_, err = tx.Exec(r.Context(), `INSERT INTO employee_invitations (user_id) VALUES ($1)`, id)
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not create employee")
			return
		}
		body := fmt.Sprintf("Hello %s,\n\nYour Dayflow account has been created. Your temporary password is: %s\n\nSign in with this password. We will then email a one-time code so you can choose your permanent password.\n\nIf you did not expect this account, contact your administrator.", req.FullName, temporaryPassword)
		if err := mailer.Send(req.Email, "Set up your Dayflow account", body); err != nil {
			writeError(w, http.StatusBadGateway, "employee was not created because the invitation email could not be sent")
			return
		}
		if err := tx.Commit(r.Context()); err != nil {
			writeError(w, http.StatusInternalServerError, "could not create employee")
			return
		}
		writeJSON(w, http.StatusCreated, map[string]interface{}{"id": id, "employee_id": req.EmployeeID, "email": req.Email, "status": "invited"})
	})
}

func generateTemporaryPassword() (string, error) {
	token, err := generateToken()
	if err != nil {
		return "", err
	}
	return "Df-" + token[:16], nil
}

type activateEmployeeRequest struct {
	Email    string `json:"email"`
	OTP      string `json:"otp"`
	Password string `json:"password"`
}

func activateEmployeeHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		var req activateEmployeeRequest
		if json.NewDecoder(r.Body).Decode(&req) != nil {
			writeError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		req.Email = strings.ToLower(strings.TrimSpace(req.Email))
		req.OTP = strings.TrimSpace(req.OTP)
		if len(req.OTP) != 6 || len(req.Password) < 8 {
			writeError(w, http.StatusBadRequest, "a 6-digit code and password of at least 8 characters are required")
			return
		}
		suppliedHash, err := hashOTP(req.Email, req.OTP)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "activation failed")
			return
		}
		var id, attempts int
		var storedHash string
		var expires time.Time
		err = pool.QueryRow(r.Context(), `SELECT u.id,i.otp_hash,i.expires_at,i.attempts FROM users u JOIN employee_invitations i ON i.user_id=u.id WHERE lower(u.email)=$1 AND u.must_change_password=TRUE AND i.used_at IS NULL AND i.otp_hash IS NOT NULL`, req.Email).Scan(&id, &storedHash, &expires, &attempts)
		if err != nil || attempts >= invitationMaxAttempts || time.Now().UTC().After(expires) {
			writeError(w, http.StatusBadRequest, "invalid or expired code")
			return
		}
		if !hmac.Equal([]byte(storedHash), []byte(suppliedHash)) {
			_, _ = pool.Exec(r.Context(), `UPDATE employee_invitations SET attempts=attempts+1 WHERE user_id=$1`, id)
			writeError(w, http.StatusBadRequest, "invalid or expired code")
			return
		}
		passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "activation failed")
			return
		}
		tx, err := pool.Begin(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, "activation failed")
			return
		}
		defer tx.Rollback(r.Context())
		tag, err := tx.Exec(r.Context(), `UPDATE employee_invitations SET used_at=now() WHERE user_id=$1 AND used_at IS NULL`, id)
		if err != nil || tag.RowsAffected() != 1 {
			writeError(w, http.StatusBadRequest, "invalid or expired code")
			return
		}
		if _, err = tx.Exec(r.Context(), `UPDATE users SET password_hash=$1,email_verified=TRUE,must_change_password=FALSE WHERE id=$2`, string(passwordHash), id); err != nil {
			writeError(w, http.StatusInternalServerError, "activation failed")
			return
		}
		if err = tx.Commit(r.Context()); err != nil {
			writeError(w, http.StatusInternalServerError, "activation failed")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "activated"})
	}
}
