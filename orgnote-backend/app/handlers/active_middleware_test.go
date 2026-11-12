package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"orgnote/app/models"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func parseErrorResponse(t *testing.T, resp *http.Response) HttpError[any] {
	t.Helper()
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	var httpErr HttpError[any]
	if err := json.Unmarshal(body, &httpErr); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	return httpErr
}

func readResponseBody(t *testing.T, resp *http.Response) string {
	t.Helper()
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	return string(body)
}

func createTestConfig(url, token *string) ActiveMiddlewareConfig {
	return ActiveMiddlewareConfig{
		AccessCheckerURL:   url,
		AccessCheckerToken: token,
	}
}

func TestNewActiveMiddleware_DisabledWhenNoAccessCheckerURL(t *testing.T) {
	token := "test-token"
	config := createTestConfig(nil, &token)

	middleware := NewActiveMiddleware(config)

	app := fiber.New()
	app.Use(middleware)
	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestNewActiveMiddleware_DisabledWhenEmptyAccessCheckerURL(t *testing.T) {
	emptyURL := ""
	token := "test-token"
	config := createTestConfig(&emptyURL, &token)

	middleware := NewActiveMiddleware(config)

	app := fiber.New()
	app.Use(middleware)
	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestNewActiveMiddleware_DisabledWhenNoAccessCheckerToken(t *testing.T) {
	url := "http://example.com"
	config := createTestConfig(&url, nil)

	middleware := NewActiveMiddleware(config)

	app := fiber.New()
	app.Use(middleware)
	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestNewActiveMiddleware_DisabledWhenEmptyAccessCheckerToken(t *testing.T) {
	url := "http://example.com"
	emptyToken := ""
	config := createTestConfig(&url, &emptyToken)

	middleware := NewActiveMiddleware(config)

	app := fiber.New()
	app.Use(middleware)
	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestActiveMiddleware_ReturnsUnauthorizedWhenNoUser(t *testing.T) {
	accessURL := "http://example.com"
	token := "test-token"
	config := createTestConfig(&accessURL, &token)

	middleware := NewActiveMiddleware(config)

	app := fiber.New()
	app.Use(middleware)
	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", resp.StatusCode)
	}

	httpErr := parseErrorResponse(t, resp)
	if httpErr.Message != ErrAuthRequired {
		t.Errorf("expected message %q, got %q", ErrAuthRequired, httpErr.Message)
	}
}

func TestActiveMiddleware_ReturnsForbiddenWhenUserNotActive(t *testing.T) {
	accessURL := "http://example.com"
	token := "test-token"
	config := createTestConfig(&accessURL, &token)

	middleware := NewActiveMiddleware(config)

	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("user", &models.User{
			Active: nil,
		})
		return c.Next()
	})
	app.Use(middleware)
	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != fiber.StatusForbidden {
		t.Errorf("expected status 403, got %d", resp.StatusCode)
	}

	httpErr := parseErrorResponse(t, resp)
	if httpErr.Message != ErrUserNotActive {
		t.Errorf("expected message %q, got %q", ErrUserNotActive, httpErr.Message)
	}
}

func TestActiveMiddleware_ReturnsForbiddenWhenActiveIsEmpty(t *testing.T) {
	accessURL := "http://example.com"
	token := "test-token"
	config := createTestConfig(&accessURL, &token)

	middleware := NewActiveMiddleware(config)

	emptyActive := ""
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("user", &models.User{
			Active: &emptyActive,
		})
		return c.Next()
	})
	app.Use(middleware)
	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != fiber.StatusForbidden {
		t.Errorf("expected status 403, got %d", resp.StatusCode)
	}

	httpErr := parseErrorResponse(t, resp)
	if httpErr.Message != ErrUserNotActive {
		t.Errorf("expected message %q, got %q", ErrUserNotActive, httpErr.Message)
	}
}

func TestActiveMiddleware_AllowsActiveUser(t *testing.T) {
	accessURL := "http://example.com"
	token := "test-token"
	config := createTestConfig(&accessURL, &token)

	middleware := NewActiveMiddleware(config)

	activeKey := "some-activation-key"
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("user", &models.User{
			Active: &activeKey,
		})
		return c.Next()
	})
	app.Use(middleware)
	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}

	body := readResponseBody(t, resp)
	if body != "OK" {
		t.Errorf("expected body 'OK', got %q", body)
	}
}

func TestActiveMiddleware_ReturnsUnauthorizedWhenUserIsNilPointer(t *testing.T) {
	accessURL := "http://example.com"
	token := "test-token"
	config := createTestConfig(&accessURL, &token)

	middleware := NewActiveMiddleware(config)

	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("user", (*models.User)(nil))
		return c.Next()
	})
	app.Use(middleware)
	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})

	req := httptest.NewRequest("GET", "/test", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", resp.StatusCode)
	}

	httpErr := parseErrorResponse(t, resp)
	if httpErr.Message != ErrAuthRequired {
		t.Errorf("expected message %q, got %q", ErrAuthRequired, httpErr.Message)
	}
}
