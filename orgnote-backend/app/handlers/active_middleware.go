package handlers

import (
	"orgnote/app/models"
	"orgnote/app/tools"

	"github.com/gofiber/fiber/v2"
)

type ActiveMiddlewareConfig struct {
	AccessCheckerURL   *string
	AccessCheckerToken *string
}

func NewActiveMiddleware(config ActiveMiddlewareConfig) func(*fiber.Ctx) error {
	if tools.IsEmpty(config.AccessCheckerURL) || tools.IsEmpty(config.AccessCheckerToken) {
		return passthrough
	}

	return checkUserActive
}

func passthrough(c *fiber.Ctx) error {
	return c.Next()
}

func checkUserActive(c *fiber.Ctx) error {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrAuthRequired, nil))
	}

	if user.Active == nil || *user.Active == "" {
		return c.Status(fiber.StatusForbidden).JSON(NewHttpError[any](ErrUserNotActive, nil))
	}

	return c.Next()
}
