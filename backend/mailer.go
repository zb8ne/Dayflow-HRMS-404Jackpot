package main

import (
	"crypto/tls"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"os"
	"strings"
	"time"
)

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
