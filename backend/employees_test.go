package main

import (
	"regexp"
	"testing"
)

func TestGenerateOTPIsSixDigits(t *testing.T) {
	pattern := regexp.MustCompile(`^[0-9]{6}$`)
	for range 100 {
		otp, err := generateOTP()
		if err != nil {
			t.Fatal(err)
		}
		if !pattern.MatchString(otp) {
			t.Fatalf("invalid OTP format %q", otp)
		}
	}
}

func TestOTPHashIsKeyedAndIdentityBound(t *testing.T) {
	t.Setenv("JWT_SECRET", testJWTSecret)
	first, err := hashOTP("one@example.com", "123456")
	if err != nil {
		t.Fatal(err)
	}
	same, _ := hashOTP("ONE@example.com", "123456")
	otherUser, _ := hashOTP("two@example.com", "123456")
	if first != same {
		t.Fatal("email normalization changed the hash")
	}
	if first == otherUser || first == "123456" {
		t.Fatal("OTP hash is not identity-bound")
	}
}
