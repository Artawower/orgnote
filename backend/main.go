package main

import (
	"moonbrain/configs"
	"moonbrain/handlers"
	"moonbrain/repositories"
	"moonbrain/services"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	config := configs.NewConfig()

	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	zerolog.SetGlobalLevel(zerolog.WarnLevel)

	if config.Debug {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	app := fiber.New()
	noteRepository := repositories.NewNoteRepository()
	tagRepository := repositories.NewTagRepository()

	noteService := services.NewNoteService(noteRepository)
	tagService := services.NewTagService(tagRepository)

	// TODO: master add validation
	handlers.RegisterNoteHandler(app, noteService)
	handlers.RegisterTagHandler(app, tagService)
	// handlers.RegisterUserHandlers(app)
	// handlers.RegisterTagHandlers(app)
	log.Info().Msg("Application start debug mode: " + config.AppAddress)
	app.Listen(config.AppAddress)

}
