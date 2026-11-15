package configs

import "testing"

func TestGetEnvInt64_ReturnsDefaultWhenValueMissing(t *testing.T) {
	t.Setenv("TEST_INT64", "")

	value := getEnvInt64("TEST_INT64", 42)

	if value != 42 {
		t.Fatalf("expected default value 42, got %d", value)
	}
}

func TestGetEnvInt64_ReturnsParsedValue(t *testing.T) {
	t.Setenv("TEST_INT64", "84")

	value := getEnvInt64("TEST_INT64", 42)

	if value != 84 {
		t.Fatalf("expected parsed value 84, got %d", value)
	}
}

func TestGetEnvInt64_ReturnsDefaultWhenValueIsZero(t *testing.T) {
	t.Setenv("TEST_INT64", "0")

	value := getEnvInt64("TEST_INT64", 42)

	if value != 42 {
		t.Fatalf("expected default value 42, got %d", value)
	}
}

func TestGetEnvInt64_ReturnsDefaultWhenValueIsNegative(t *testing.T) {
	t.Setenv("TEST_INT64", "-1")

	value := getEnvInt64("TEST_INT64", 42)

	if value != 42 {
		t.Fatalf("expected default value 42, got %d", value)
	}
}

func TestGetEnvInt64_ReturnsDefaultWhenValueIsInvalid(t *testing.T) {
	t.Setenv("TEST_INT64", "invalid")

	value := getEnvInt64("TEST_INT64", 42)

	if value != 42 {
		t.Fatalf("expected default value 42, got %d", value)
	}
}
