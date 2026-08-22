package main

import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"os"
	"strings"
	"time"
)

const resendAPIURL = "https://api.resend.com/emails"

type Mailer interface {
	Configured() bool
	Send(to, subject, body string) error
}

func newMailerFromEnv() (Mailer, error) {
	provider := strings.ToLower(strings.TrimSpace(os.Getenv("EMAIL_PROVIDER")))
	if provider == "" {
		if os.Getenv("RESEND_API_KEY") != "" || os.Getenv("EMAIL_FROM") != "" {
			provider = "resend"
		} else {
			provider = "smtp"
		}
	}
	switch provider {
	case "smtp":
		return newSMTPMailerFromEnv(), nil
	case "resend":
		return newResendMailerFromEnv(), nil
	default:
		return nil, fmt.Errorf("unsupported EMAIL_PROVIDER %q (use smtp or resend)", provider)
	}
}

type SMTPMailer struct {
	host, port, username, password, from string
}

func newSMTPMailerFromEnv() *SMTPMailer {
	return &SMTPMailer{host: os.Getenv("SMTP_HOST"), port: envOr("SMTP_PORT", "587"), username: os.Getenv("SMTP_USERNAME"), password: os.Getenv("SMTP_PASSWORD"), from: os.Getenv("SMTP_FROM")}
}

func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func (m *SMTPMailer) Configured() bool {
	return m != nil && m.host != "" && m.port != "" && m.from != ""
}

func (m *SMTPMailer) Send(to, subject, body string) error {
	if !m.Configured() {
		return fmt.Errorf("SMTP is not configured")
	}
	if _, err := mail.ParseAddress(to); err != nil {
		return fmt.Errorf("invalid recipient address")
	}
	if strings.ContainsAny(to+m.from, "\r\n") {
		return fmt.Errorf("invalid email address")
	}
	address := net.JoinHostPort(m.host, m.port)
	conn, err := net.DialTimeout("tcp", address, 10*time.Second)
	if err != nil {
		return err
	}
	client, err := smtp.NewClient(conn, m.host)
	if err != nil {
		conn.Close()
		return err
	}
	defer client.Close()
	if ok, _ := client.Extension("STARTTLS"); ok {
		if err := client.StartTLS(&tls.Config{ServerName: m.host, MinVersion: tls.VersionTLS12}); err != nil {
			return err
		}
	} else if m.host != "localhost" && m.host != "127.0.0.1" {
		return fmt.Errorf("SMTP server does not support STARTTLS")
	}
	if m.username != "" {
		if err := client.Auth(smtp.PlainAuth("", m.username, m.password, m.host)); err != nil {
			return err
		}
	}
	if err := client.Mail(m.from); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	message := "From: " + m.from + "\r\nTo: " + to + "\r\nSubject: " + subject + "\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n" + body
	if _, err := w.Write([]byte(message)); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return client.Quit()
}

type ResendMailer struct {
	apiKey   string
	from     string
	endpoint string
	client   *http.Client
}

func newResendMailerFromEnv() *ResendMailer {
	return &ResendMailer{
		apiKey:   strings.TrimSpace(os.Getenv("RESEND_API_KEY")),
		from:     strings.TrimSpace(os.Getenv("EMAIL_FROM")),
		endpoint: resendAPIURL,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

func (m *ResendMailer) Configured() bool {
	return m != nil && m.apiKey != "" && m.from != "" && m.endpoint != "" && m.client != nil
}

func (m *ResendMailer) Send(to, subject, body string) error {
	if !m.Configured() {
		return fmt.Errorf("Resend is not configured")
	}
	if _, err := mail.ParseAddress(to); err != nil {
		return fmt.Errorf("invalid recipient address")
	}
	if _, err := mail.ParseAddress(m.from); err != nil {
		return fmt.Errorf("invalid sender address")
	}
	if strings.ContainsAny(subject, "\r\n") {
		return fmt.Errorf("invalid email subject")
	}

	payload, err := json.Marshal(struct {
		From    string   `json:"from"`
		To      []string `json:"to"`
		Subject string   `json:"subject"`
		Text    string   `json:"text"`
	}{From: m.from, To: []string{to}, Subject: subject, Text: body})
	if err != nil {
		return fmt.Errorf("encode Resend request: %w", err)
	}
	req, err := http.NewRequest(http.MethodPost, m.endpoint, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("create Resend request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+m.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := m.client.Do(req)
	if err != nil {
		return fmt.Errorf("send email with Resend: %w", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 8<<10))
	if resp.StatusCode < http.StatusOK || resp.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("Resend returned HTTP %d", resp.StatusCode)
	}
	return nil
}
