package handlers

import (
	"moonbrain/app/models"
	"moonbrain/app/tools"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

type Config struct {
	Filter       func(c *fiber.Ctx) bool
	Unauthorized fiber.Handler
	GetUser      func(token string) (*models.User, error)
}

var ConfigDefault = Config{
	Filter: nil,
}

func configDefault(config ...Config) Config {
	if len(config) < 1 {
		return ConfigDefault
	}

	cfg := config[0]

	if cfg.Filter == nil {
		cfg.Filter = ConfigDefault.Filter
	}
	return cfg
}

func NewAuthMiddleware(config ...Config) func(*fiber.Ctx) error {
	cfg := configDefault(config...)
	if cfg.GetUser == nil {
		log.Fatal().Msg("auth middleware: init new auth middleware: GetUser function is required")
	}

	return func(c *fiber.Ctx) error {
		if cfg.Filter != nil && cfg.Filter(c) {
			return c.Next()
		}

		token := tools.ExtractBearerTokenFromCtx(c)
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrTokenNotProvided, nil))
		}
		user, err := cfg.GetUser(token)
		if err != nil {
			log.Info().Msgf("auth middleware: GetUser: %s", err)
			return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrInvalidToken, nil))
		}
		c.Locals("user", user)
		return c.Next()
	}
}
