package handlers

import (
	"moonbrain/services"
	"net/http"

	"github.com/gofiber/fiber/v2"
)

func RegisterTagHandler(app fiber.Router, tagService *services.TagService) {
	app.Get("/tags", func(c *fiber.Ctx) error {
		tags, err := tagService.GetTags()
		if err != nil {
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError(err.Error(), nil))
		}
		return c.Status(http.StatusOK).JSON(NewHttpReponse(tags, nil))
	})
}
