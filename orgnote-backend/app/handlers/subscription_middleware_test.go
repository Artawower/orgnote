package handlers

import (
	"net/http/httptest"
	"orgnote/app/infrastructure"
	"orgnote/app/models"
	"testing"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type accessMiddlewareSubscription struct {
	info *infrastructure.SubscriptionInfo
	err  error
}

func (s accessMiddlewareSubscription) Check(provider string, externalID string) error {
	return s.err
}

func (s accessMiddlewareSubscription) GetInfo(provider string, externalID string) (*infrastructure.SubscriptionInfo, error) {
	return s.info, s.err
}

func captureAccessSpaceLimit(
	t *testing.T,
	subscription accessMiddlewareSubscription,
	selfHostedSpaceLimit int64,
) (int64, int) {
	t.Helper()

	capturedSpaceLimit := int64(-1)
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		c.Locals("user", &models.User{
			ID:         primitive.NewObjectID(),
			Provider:   "github",
			ExternalID: "42",
		})
		return c.Next()
	})
	app.Use(NewAccessMiddleware(subscription, func(userID string, spaceLimit int64) error {
		return nil
	}, selfHostedSpaceLimit))
	app.Get("/test", func(c *fiber.Ctx) error {
		capturedSpaceLimit, _ = c.Locals(SpaceLimitKey).(int64)
		return c.SendStatus(fiber.StatusOK)
	})

	response, err := app.Test(httptest.NewRequest("GET", "/test", nil))
	if err != nil {
		t.Fatalf("unexpected response error: %v", err)
	}

	return capturedSpaceLimit, response.StatusCode
}

func TestAccessMiddleware_UsesSelfHostedLimitWhenSubscriptionInfoMissing(t *testing.T) {
	spaceLimit, statusCode := captureAccessSpaceLimit(t, accessMiddlewareSubscription{}, 1024)

	if statusCode != fiber.StatusOK {
		t.Fatalf("expected status %d, got %d", fiber.StatusOK, statusCode)
	}

	if spaceLimit != 1024 {
		t.Fatalf("expected self-hosted space limit 1024, got %d", spaceLimit)
	}
}

func TestAccessMiddleware_UsesZeroLimitWhenSubscriptionIsInactive(t *testing.T) {
	spaceLimit, statusCode := captureAccessSpaceLimit(t, accessMiddlewareSubscription{
		info: &infrastructure.SubscriptionInfo{IsActive: false, SpaceLimit: 2048},
	}, 1024)

	if statusCode != fiber.StatusOK {
		t.Fatalf("expected status %d, got %d", fiber.StatusOK, statusCode)
	}

	if spaceLimit != 0 {
		t.Fatalf("expected inactive subscription space limit 0, got %d", spaceLimit)
	}
}

func TestAccessMiddleware_UsesRemoteLimitWhenSubscriptionIsActive(t *testing.T) {
	spaceLimit, statusCode := captureAccessSpaceLimit(t, accessMiddlewareSubscription{
		info: &infrastructure.SubscriptionInfo{IsActive: true, SpaceLimit: 2048},
	}, 1024)

	if statusCode != fiber.StatusOK {
		t.Fatalf("expected status %d, got %d", fiber.StatusOK, statusCode)
	}

	if spaceLimit != 2048 {
		t.Fatalf("expected active subscription space limit 2048, got %d", spaceLimit)
	}
}
