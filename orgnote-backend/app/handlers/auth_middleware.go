package handlers

import (
	"orgnote/app/models"
	"orgnote/app/tools"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

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

func getUserFromContext(c *fiber.Ctx) (*models.User, bool) {
	user, ok := c.Locals("user").(*models.User)
	if !ok || user == nil {
		return nil, false
	}
	return user, true
}

func NewAuthMiddleware() func(*fiber.Ctx) error {
	return func(c *fiber.Ctx) error {
		if _, ok := getUserFromContext(c); !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrAuthRequired, nil))
		}
		return c.Next()
	}
}

type Config struct {
	Filter       func(c *fiber.Ctx) bool
	Unauthorized fiber.Handler
	GetUser      func(token string) (*models.User, error)
}

func NewUserInjectMiddleware(config ...Config) func(*fiber.Ctx) error {
	cfg := configDefault(config...)
	if cfg.GetUser == nil {
		log.Fatal().Msg("auth middleware: init new auth middleware: GetUser function is required")
	}

	return func(c *fiber.Ctx) error {
		if cfg.Filter != nil && cfg.Filter(c) {
			return c.Next()
		}

		token := tools.ExtractBearerTokenFromCtx(c)
		if token == "" && strings.HasPrefix(c.Path(), WebSocketPrefix) {
			token = c.Query("token")
		}

		var user *models.User
		var err error

		if token == "" {
			c.Locals("user", user)
			return c.Next()
		}

		user, err = cfg.GetUser(token)
		if err != nil {
			log.Info().Msgf("auth middleware: GetUser: %s", err)
		}

		c.Locals("user", user)
		return c.Next()
	}

}
