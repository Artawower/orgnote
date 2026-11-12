package services

import (
	subscription "orgnote/app/infrastructure/generated"
	"orgnote/app/models"
	"testing"

	"github.com/oapi-codegen/runtime/types"
)

func TestActivationDomainFromClientAddress(t *testing.T) {
	tests := []struct {
		name          string
		clientAddress string
		expected      *string
	}{
		{
			name:          "extracts host from https url",
			clientAddress: "https://dev.org-note.com",
			expected:      stringPointer("dev.org-note.com"),
		},
		{
			name:          "keeps localhost port",
			clientAddress: "http://localhost:9000",
			expected:      stringPointer("localhost:9000"),
		},
		{
			name:          "supports raw host",
			clientAddress: "org-note.com",
			expected:      stringPointer("org-note.com"),
		},
		{
			name:          "trims whitespace",
			clientAddress: "  https://org-note.com/app  ",
			expected:      stringPointer("org-note.com"),
		},
		{
			name:          "ignores empty address",
			clientAddress: "",
			expected:      nil,
		},
		{
			name:          "ignores whitespace-only address",
			clientAddress: "   ",
			expected:      nil,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			actual := activationDomainFromClientAddress(test.clientAddress)
			assertStringPointersEqual(t, actual, test.expected)
		})
	}
}

func TestReconciledActiveFallback(t *testing.T) {
	if reconciledActiveFallback != "reconciled" {
		t.Fatalf("expected reconciledActiveFallback to be 'reconciled', got %q", reconciledActiveFallback)
	}
}

func TestNewSubscriptionActivation_PreservesActivationAndAccountEmail(t *testing.T) {
	activationEmail := "activation@example.com"
	activationDomain := "app.example.com"
	user := &models.User{
		Provider:   "github",
		ExternalID: "42",
		Email:      "account@example.com",
	}

	data := newSubscriptionActivation(user, "key", &activationEmail, &activationDomain)

	assertTypedEmailPointerEqual(t, data.Email, "activation@example.com")
	assertTypedEmailPointerEqual(t, data.ExternalEmail, "account@example.com")
	assertStringPointersEqual(t, data.ExternalProvider, stringPointer("github"))
	assertStringPointersEqual(t, data.ActivationDomain, stringPointer("app.example.com"))
	if data.ExternalId != "42" {
		t.Fatalf("expected external id 42, got %q", data.ExternalId)
	}
	if data.Key != "key" {
		t.Fatalf("expected key, got %q", data.Key)
	}
}

func TestNewSubscriptionActivation_AllowsMissingOptionalEmails(t *testing.T) {
	user := &models.User{Provider: "github", ExternalID: "42"}

	data := newSubscriptionActivation(user, "key", nil, nil)

	if data.Email != nil {
		t.Fatalf("expected activation email to be nil, got %v", data.Email)
	}
	if data.ExternalEmail != nil {
		t.Fatalf("expected external email to be nil, got %v", data.ExternalEmail)
	}
	if data.ActivationDomain != nil {
		t.Fatalf("expected activation domain to be nil, got %v", data.ActivationDomain)
	}
}

func TestSubscriptionActivationSpaceLimit_ReturnsValidLimit(t *testing.T) {
	limit := 1024

	spaceLimit, err := subscriptionActivationSpaceLimit(&subscription.SubscriptionInfo{SpaceLimit: &limit})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if spaceLimit != 1024 {
		t.Fatalf("expected space limit 1024, got %d", spaceLimit)
	}
}

func TestSubscriptionActivationSpaceLimit_ReturnsErrorWhenResponseIsEmpty(t *testing.T) {
	_, err := subscriptionActivationSpaceLimit(nil)

	if err == nil {
		t.Fatal("expected error for empty activation response")
	}
}

func TestSubscriptionActivationSpaceLimit_ReturnsErrorWhenLimitMissing(t *testing.T) {
	_, err := subscriptionActivationSpaceLimit(&subscription.SubscriptionInfo{})

	if err == nil {
		t.Fatal("expected error for missing space limit")
	}
}

func TestSubscriptionActivationSpaceLimit_ReturnsErrorWhenLimitInvalid(t *testing.T) {
	limit := 0

	_, err := subscriptionActivationSpaceLimit(&subscription.SubscriptionInfo{SpaceLimit: &limit})

	if err == nil {
		t.Fatal("expected error for invalid space limit")
	}
}

func stringPointer(value string) *string {
	return &value
}

func assertTypedEmailPointerEqual(t *testing.T, actual *types.Email, expected string) {
	t.Helper()

	if actual == nil {
		t.Fatalf("expected %q, got nil", expected)
	}
	if string(*actual) != expected {
		t.Fatalf("expected %q, got %q", expected, string(*actual))
	}
}

func assertStringPointersEqual(t *testing.T, actual *string, expected *string) {
	t.Helper()

	if actual == nil || expected == nil {
		if actual != expected {
			t.Fatalf("expected %v, got %v", expected, actual)
		}
		return
	}

	if *actual != *expected {
		t.Fatalf("expected %q, got %q", *expected, *actual)
	}
}
