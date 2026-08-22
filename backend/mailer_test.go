package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func TestMailerFactorySelectsResend(t *testing.T) {
	t.Setenv("EMAIL_PROVIDER", "resend")
	t.Setenv("RESEND_API_KEY", "re_test_secret")
	t.Setenv("EMAIL_FROM", "Dayflow <onboarding@resend.dev>")

	mailer, err := newMailerFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := mailer.(*ResendMailer); !ok {
		t.Fatalf("mailer type = %T, want *ResendMailer", mailer)
	}
	if !mailer.Configured() {
		t.Fatal("Resend mailer should be configured")
	}
}

func TestMailerFactoryRejectsUnknownProvider(t *testing.T) {
	t.Setenv("EMAIL_PROVIDER", "unknown")
	if _, err := newMailerFromEnv(); err == nil {
		t.Fatal("expected unsupported provider error")
	}
}

func TestResendMailerSendsExpectedRequest(t *testing.T) {
	var gotAuthorization string
	var got struct {
		From    string   `json:"from"`
		To      []string `json:"to"`
		Subject string   `json:"subject"`
		Text    string   `json:"text"`
	}
	client := &http.Client{Timeout: time.Second, Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		gotAuthorization = r.Header.Get("Authorization")
		if r.Method != http.MethodPost {
			t.Errorf("method = %s, want POST", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/json" {
			t.Errorf("content type = %q", r.Header.Get("Content-Type"))
		}
		if err := json.NewDecoder(r.Body).Decode(&got); err != nil {
			t.Errorf("decode request: %v", err)
		}
		return &http.Response{
			StatusCode: http.StatusOK,
			Body:       io.NopCloser(bytes.NewBufferString(`{"id":"email-id"}`)),
			Header:     make(http.Header),
		}, nil
	})}

	mailer := &ResendMailer{
		apiKey:   "re_test_secret",
		from:     "Dayflow <onboarding@resend.dev>",
		endpoint: "https://api.resend.test/emails",
		client:   client,
	}
	if err := mailer.Send("person@example.com", "Welcome", "Temporary password"); err != nil {
		t.Fatal(err)
	}
	if gotAuthorization != "Bearer re_test_secret" {
		t.Fatalf("authorization header = %q", gotAuthorization)
	}
	if got.From != mailer.from || len(got.To) != 1 || got.To[0] != "person@example.com" || got.Subject != "Welcome" || got.Text != "Temporary password" {
		t.Fatalf("unexpected request payload: %+v", got)
	}
}

func TestResendMailerDoesNotExposeResponseBody(t *testing.T) {
	client := &http.Client{Timeout: time.Second, Transport: roundTripFunc(func(*http.Request) (*http.Response, error) {
		return &http.Response{
			StatusCode: http.StatusUnauthorized,
			Body:       io.NopCloser(bytes.NewBufferString(`{"message":"secret OTP 123456"}`)),
			Header:     make(http.Header),
		}, nil
	})}

	mailer := &ResendMailer{
		apiKey:   "re_test_secret",
		from:     "Dayflow <onboarding@resend.dev>",
		endpoint: "https://api.resend.test/emails",
		client:   client,
	}
	err := mailer.Send("person@example.com", "OTP", "123456")
	if err == nil {
		t.Fatal("expected provider error")
	}
	if !strings.Contains(err.Error(), "HTTP 401") || strings.Contains(err.Error(), "123456") {
		t.Fatalf("unsafe or unexpected error: %v", err)
	}
}

func TestResendMailerRejectsInvalidInput(t *testing.T) {
	mailer := &ResendMailer{
		apiKey:   "re_test_secret",
		from:     "Dayflow <onboarding@resend.dev>",
		endpoint: "https://example.invalid",
		client:   &http.Client{Timeout: time.Second},
	}
	tests := []struct {
		name, to, subject string
	}{
		{name: "recipient", to: "not-an-email", subject: "Welcome"},
		{name: "subject", to: "person@example.com", subject: "Welcome\r\nBcc: attacker@example.com"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if err := mailer.Send(test.to, test.subject, "body"); err == nil {
				t.Fatal("expected validation error")
			}
		})
	}
}
