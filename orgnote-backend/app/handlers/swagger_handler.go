package handlers

import (
	"net/url"
	"orgnote/app/configs"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/swagger"
	"orgnote/app/docs"
)

func RegisterSwagger(app fiber.Router, config configs.Config) {
	parsedURL, _ := url.Parse(config.BackendURL)
	docs.SwaggerInfo.Host = parsedURL.Host
	docs.SwaggerInfo.Schemes = []string{parsedURL.Scheme}
	docs.SwaggerInfo.BasePath = parsedURL.Path

	app.Get("/swagger/*", swagger.HandlerDefault)
}
