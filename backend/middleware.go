package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	ctxUserID      contextKey = "user_id"
	ctxRole        contextKey = "role"
	ctxSessionID   contextKey = "session_id"
	authCookieName            = "dayflow_access"
	jwtIssuer                 = "dayflow-api"
	jwtAudience               = "dayflow-web"
	accessTokenTTL            = 12 * time.Hour
)

var sessions *SessionManager

type claims struct {
	UserID int    `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

func jwtSecret() ([]byte, error) {
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 {
		return nil, fmt.Errorf("JWT_SECRET must contain at least 32 characters")
	}
	return []byte(secret), nil
}

func issueToken(userID int, role string, suppliedSessionID ...string) (string, error) {
	secret, err := jwtSecret()
	if err != nil {
		return "", err
	}
	sid := ""
	if len(suppliedSessionID) > 0 {
		sid = suppliedSessionID[0]
	}
	if sid == "" {
		sid, err = generateToken()
		if err != nil {
			return "", err
		}
	}
	now := time.Now().UTC()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims{UserID: userID, Role: role, RegisteredClaims: jwt.RegisteredClaims{
		Issuer: jwtIssuer, Subject: strconv.Itoa(userID), Audience: jwt.ClaimStrings{jwtAudience},
		ExpiresAt: jwt.NewNumericDate(now.Add(accessTokenTTL)), IssuedAt: jwt.NewNumericDate(now),
		NotBefore: jwt.NewNumericDate(now.Add(-5 * time.Second)), ID: sid,
	}})
	return token.SignedString(secret)
}

func parseToken(tokenStr string) (*claims, error) {
	secret, err := jwtSecret()
	if err != nil {
		return nil, err
	}
	c := &claims{}
	token, err := jwt.ParseWithClaims(tokenStr, c, func(_ *jwt.Token) (interface{}, error) { return secret, nil },
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithIssuer(jwtIssuer),
		jwt.WithAudience(jwtAudience), jwt.WithExpirationRequired())
	if err != nil {
		return nil, err
	}
	if !token.Valid || c.UserID <= 0 || c.Subject != strconv.Itoa(c.UserID) || c.ID == "" || (c.Role != "admin" && c.Role != "employee") {
		return nil, fmt.Errorf("invalid token claims")
	}
	return c, nil
}

func setAuthCookie(w http.ResponseWriter, token string) {
	secure, _ := strconv.ParseBool(os.Getenv("COOKIE_SECURE"))
	http.SetCookie(w, &http.Cookie{Name: authCookieName, Value: token, Path: "/", MaxAge: int(accessTokenTTL.Seconds()), HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode})
}

func clearAuthCookie(w http.ResponseWriter) {
	secure, _ := strconv.ParseBool(os.Getenv("COOKIE_SECURE"))
	http.SetCookie(w, &http.Cookie{Name: authCookieName, Value: "", Path: "/", MaxAge: -1, HttpOnly: true, Secure: secure, SameSite: http.SameSiteLaxMode})
}

func requestToken(r *http.Request) string {
	if cookie, err := r.Cookie(authCookieName); err == nil {
		return cookie.Value
	}
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(auth, "Bearer "))
	}
	return ""
}

func requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := requestToken(r)
		if token == "" || sessions == nil {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		c, err := parseToken(token)
		if err != nil {
			clearAuthCookie(w)
			writeError(w, http.StatusUnauthorized, "invalid or expired session")
			return
		}
		s, err := sessions.Authenticate(r.Context(), c.ID)
		if err != nil || s.UserID != c.UserID || s.Role != c.Role {
			clearAuthCookie(w)
			writeError(w, http.StatusUnauthorized, "invalid or expired session")
			return
		}
		ctx := context.WithValue(r.Context(), ctxUserID, s.UserID)
		ctx = context.WithValue(ctx, ctxRole, s.Role)
		ctx = context.WithValue(ctx, ctxSessionID, s.ID)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if userRole(r) != "admin" {
			writeError(w, http.StatusForbidden, "admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func userID(r *http.Request) int       { v, _ := r.Context().Value(ctxUserID).(int); return v }
func userRole(r *http.Request) string  { v, _ := r.Context().Value(ctxRole).(string); return v }
func sessionID(r *http.Request) string { v, _ := r.Context().Value(ctxSessionID).(string); return v }

func pathID(r *http.Request) (int, error) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	return strconv.Atoi(parts[len(parts)-1])
}
