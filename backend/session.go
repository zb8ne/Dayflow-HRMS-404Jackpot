package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Session struct {
	ID        string    `json:"id"`
	UserID    int       `json:"user_id"`
	Role      string    `json:"role"`
	UserAgent string    `json:"user_agent,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

type SessionView struct {
	ID        string    `json:"id"`
	UserAgent string    `json:"user_agent,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
	Current   bool      `json:"current"`
}

type SessionManager struct {
	redis *redis.Client
	ttl   time.Duration
}

func NewSessionManager(client *redis.Client, ttl time.Duration) *SessionManager {
	return &SessionManager{redis: client, ttl: ttl}
}

func sessionTokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func sessionKey(hash string) string     { return "session:" + hash }
func userSessionsKey(userID int) string { return fmt.Sprintf("user_sessions:%d", userID) }

func (m *SessionManager) Create(ctx context.Context, userID int, role, userAgent string) (*Session, error) {
	publicID, err := generateToken()
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	s := &Session{ID: publicID, UserID: userID, Role: role, UserAgent: userAgent, CreatedAt: now, ExpiresAt: now.Add(m.ttl)}
	data, err := json.Marshal(s)
	if err != nil {
		return nil, err
	}
	hash := sessionTokenHash(publicID)
	pipe := m.redis.TxPipeline()
	pipe.Set(ctx, sessionKey(hash), data, m.ttl)
	pipe.SAdd(ctx, userSessionsKey(userID), hash)
	pipe.Expire(ctx, userSessionsKey(userID), m.ttl)
	if _, err := pipe.Exec(ctx); err != nil {
		return nil, err
	}
	return s, nil
}

func (m *SessionManager) Authenticate(ctx context.Context, sessionID string) (*Session, error) {
	if sessionID == "" {
		return nil, errors.New("missing session id")
	}
	data, err := m.redis.Get(ctx, sessionKey(sessionTokenHash(sessionID))).Bytes()
	if err != nil {
		return nil, err
	}
	var s Session
	if err := json.Unmarshal(data, &s); err != nil || s.UserID <= 0 || (s.Role != "admin" && s.Role != "employee") || time.Now().UTC().After(s.ExpiresAt) {
		return nil, errors.New("invalid session")
	}
	return &s, nil
}

func (m *SessionManager) Revoke(ctx context.Context, sessionID string) error {
	if sessionID == "" {
		return nil
	}
	hash := sessionTokenHash(sessionID)
	s, err := m.Authenticate(ctx, sessionID)
	if err != nil {
		return m.redis.Del(ctx, sessionKey(hash)).Err()
	}
	pipe := m.redis.TxPipeline()
	pipe.Del(ctx, sessionKey(hash))
	pipe.SRem(ctx, userSessionsKey(s.UserID), hash)
	_, err = pipe.Exec(ctx)
	return err
}

func (m *SessionManager) RevokeAll(ctx context.Context, userID int) error {
	setKey := userSessionsKey(userID)
	hashes, err := m.redis.SMembers(ctx, setKey).Result()
	if err != nil {
		return err
	}
	keys := make([]string, 0, len(hashes)+1)
	for _, hash := range hashes {
		keys = append(keys, sessionKey(hash))
	}
	keys = append(keys, setKey)
	return m.redis.Del(ctx, keys...).Err()
}

func (m *SessionManager) List(ctx context.Context, userID int, currentID string) ([]SessionView, error) {
	hashes, err := m.redis.SMembers(ctx, userSessionsKey(userID)).Result()
	if err != nil {
		return nil, err
	}
	result := make([]SessionView, 0, len(hashes))
	for _, hash := range hashes {
		data, err := m.redis.Get(ctx, sessionKey(hash)).Bytes()
		if err == redis.Nil {
			_ = m.redis.SRem(ctx, userSessionsKey(userID), hash).Err()
			continue
		}
		if err != nil {
			return nil, err
		}
		var s Session
		if json.Unmarshal(data, &s) != nil {
			continue
		}
		result = append(result, SessionView{ID: s.ID, UserAgent: s.UserAgent, CreatedAt: s.CreatedAt, ExpiresAt: s.ExpiresAt, Current: s.ID == currentID})
	}
	return result, nil
}
