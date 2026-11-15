package handlers

import (
	"orgnote/app/infrastructure"
	"orgnote/app/models"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

const (
	SpaceLimitKey = "spaceLimit"
)

type SubscriptionChecker interface {
	Check(provider string, externalID string) error
	GetInfo(provider string, externalID string) (*infrastructure.SubscriptionInfo, error)
}

type SpaceLimitUpdater func(userID string, spaceLimit int64) error

func NewAccessMiddleware(subscription SubscriptionChecker, updateSpaceLimit SpaceLimitUpdater, selfHostedSpaceLimit int64) func(*fiber.Ctx) error {
	return func(c *fiber.Ctx) error {
		user := c.Locals("user").(*models.User)

		if user == (*models.User)(nil) {
			return c.Status(fiber.StatusBadRequest).JSON(NewHttpError[any](ErrAuthRequired, nil))
		}

		info, err := subscription.GetInfo(user.Provider, user.ExternalID)
		if err != nil {
			return c.Status(fiber.StatusForbidden).JSON(NewHttpError[any](ErrAccessDenied, err.Error()))
		}

		if info == nil {
			c.Locals(SpaceLimitKey, selfHostedSpaceLimit)
			return c.Next()
		}

		if !info.IsActive {
			c.Locals(SpaceLimitKey, int64(0))
			return c.Next()
		}

		freshSpaceLimit := int64(info.SpaceLimit)
		c.Locals(SpaceLimitKey, freshSpaceLimit)

		if freshSpaceLimit != user.SpaceLimit {
			go func() {
				if err := updateSpaceLimit(user.ID.Hex(), freshSpaceLimit); err != nil {
					log.Error().Err(err).Str("userId", user.ID.Hex()).Msg("access middleware: failed to update space limit")
				}
			}()
		}

		return c.Next()
	}
}
