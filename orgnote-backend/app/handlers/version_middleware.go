package handlers

import (
	"orgnote/app/tools"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/mod/semver"
)

const clientVersionHeader = "X-Client-Version"

func NewVersionMiddleware(minClientVersion *string) func(*fiber.Ctx) error {
	if tools.IsEmpty(minClientVersion) {
		return passthrough
	}

	return checkClientVersion(*minClientVersion)
}

func checkClientVersion(minClientVersion string) func(*fiber.Ctx) error {
	return func(c *fiber.Ctx) error {
		clientVersion := c.Get(clientVersionHeader)
		if clientVersion == "" {
			return c.Next()
		}

		tooOld := semver.Compare(
			tools.NormalizeVersion(clientVersion),
			tools.NormalizeVersion(minClientVersion),
		) < 0

		if tooOld {
			return c.Status(fiber.StatusUpgradeRequired).JSON(
				NewHttpError[any](ErrClientVersionTooOld, nil),
			)
		}

		return c.Next()
	}
}
