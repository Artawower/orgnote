package handlers

import (
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func strPtr(s string) *string {
	return &s
}

func setupVersionMiddlewareApp(minVersion *string) *fiber.App {
	app := fiber.New()
	app.Use(NewVersionMiddleware(minVersion))
	app.Get("/test", func(c *fiber.Ctx) error {
		return c.SendString("OK")
	})
	return app
}

func TestNewVersionMiddleware_PassthroughWhenMinVersionIsNil(t *testing.T) {
	app := setupVersionMiddlewareApp(nil)

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

func TestNewVersionMiddleware_PassthroughWhenMinVersionIsEmpty(t *testing.T) {
	app := setupVersionMiddlewareApp(strPtr(""))

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

func TestVersionMiddleware_PassthroughWhenNoVersionHeader(t *testing.T) {
	app := setupVersionMiddlewareApp(strPtr("1.2.0"))

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

func TestVersionMiddleware_PassthroughWhenVersionMeetsMinimum(t *testing.T) {
	app := setupVersionMiddlewareApp(strPtr("1.2.0"))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set(clientVersionHeader, "1.2.0")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestVersionMiddleware_PassthroughWhenVersionExceedsMinimum(t *testing.T) {
	app := setupVersionMiddlewareApp(strPtr("1.2.0"))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set(clientVersionHeader, "1.3.0")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestVersionMiddleware_ReturnsUpgradeRequiredWhenVersionTooOld(t *testing.T) {
	app := setupVersionMiddlewareApp(strPtr("1.2.0"))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set(clientVersionHeader, "1.1.0")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != fiber.StatusUpgradeRequired {
		t.Errorf("expected status 426, got %d", resp.StatusCode)
	}

	httpErr := parseErrorResponse(t, resp)
	if httpErr.Message != ErrClientVersionTooOld {
		t.Errorf("expected message %q, got %q", ErrClientVersionTooOld, httpErr.Message)
	}
}

func TestVersionMiddleware_ReturnsUpgradeRequiredForMajorVersionMismatch(t *testing.T) {
	app := setupVersionMiddlewareApp(strPtr("2.0.0"))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set(clientVersionHeader, "1.9.9")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != fiber.StatusUpgradeRequired {
		t.Errorf("expected status 426, got %d", resp.StatusCode)
	}
}

func TestVersionMiddleware_HandlesVPrefixInClientHeader(t *testing.T) {
	app := setupVersionMiddlewareApp(strPtr("1.2.0"))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set(clientVersionHeader, "v1.2.0")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Errorf("expected status 200, got %d", resp.StatusCode)
	}
}

func TestVersionMiddleware_HandlesVPrefixInMinVersion(t *testing.T) {
	app := setupVersionMiddlewareApp(strPtr("v1.2.0"))

	req := httptest.NewRequest("GET", "/test", nil)
	req.Header.Set(clientVersionHeader, "1.1.0")
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if resp.StatusCode != fiber.StatusUpgradeRequired {
		t.Errorf("expected status 426, got %d", resp.StatusCode)
	}
}
