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

func setupTestApp(userMiddleware func(*fiber.Ctx) error) *fiber.App {
	app := fiber.New()
	if userMiddleware != nil {
		app.Use(userMiddleware)
	}
	return app
}

func withUser(user *models.User) func(*fiber.Ctx) error {
	return func(c *fiber.Ctx) error {
		c.Locals("user", user)
		return c.Next()
	}
}

func withoutUser() func(*fiber.Ctx) error {
	return func(c *fiber.Ctx) error {
		return c.Next()
	}
}

func assertUnauthorizedResponse(t *testing.T, resp *http.Response) {
	t.Helper()
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	var httpErr HttpError[any]
	if err := json.Unmarshal(body, &httpErr); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if httpErr.Message != ErrAuthRequired {
		t.Errorf("expected message %q, got %q", ErrAuthRequired, httpErr.Message)
	}
}

func TestCreateToken_ReturnsUnauthorizedWhenNoUser(t *testing.T) {
	app := setupTestApp(withoutUser())

	handler := &AuthHandler{}
	app.Post("/auth/token", handler.CreateToken)

	req := httptest.NewRequest("POST", "/auth/token", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	assertUnauthorizedResponse(t, resp)
}

func TestDeleteToken_ReturnsUnauthorizedWhenNoUser(t *testing.T) {
	app := setupTestApp(withoutUser())

	handler := &AuthHandler{}
	app.Delete("/auth/token/:tokenId", handler.DeleteToken)

	req := httptest.NewRequest("DELETE", "/auth/token/some-token-id", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	assertUnauthorizedResponse(t, resp)
}

func TestGetAPITokens_ReturnsUnauthorizedWhenNoUser(t *testing.T) {
	app := setupTestApp(withoutUser())

	handler := &AuthHandler{}
	app.Get("/auth/api-tokens", handler.GetAPITokens)

	req := httptest.NewRequest("GET", "/auth/api-tokens", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	assertUnauthorizedResponse(t, resp)
}

func TestDeleteUserAccount_ReturnsUnauthorizedWhenNoUser(t *testing.T) {
	app := setupTestApp(withoutUser())

	handler := &AuthHandler{}
	app.Delete("/auth/account", handler.DeleteUserAccount)

	req := httptest.NewRequest("DELETE", "/auth/account", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	assertUnauthorizedResponse(t, resp)
}

func TestSubscribe_ReturnsUnauthorizedWhenNoUser(t *testing.T) {
	app := setupTestApp(withoutUser())

	handler := &AuthHandler{}
	app.Post("/auth/subscribe", handler.Subscribe)

	req := httptest.NewRequest("POST", "/auth/subscribe", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	assertUnauthorizedResponse(t, resp)
}

func TestCreateToken_ReturnsUnauthorizedWhenUserIsNil(t *testing.T) {
	app := setupTestApp(withUser(nil))

	handler := &AuthHandler{}
	app.Post("/auth/token", handler.CreateToken)

	req := httptest.NewRequest("POST", "/auth/token", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	assertUnauthorizedResponse(t, resp)
}
