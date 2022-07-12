package main

import (
	"context"
	"moonbrain/app/configs"
	"moonbrain/app/handlers"
	"moonbrain/app/repositories"
	"moonbrain/app/services"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	config := configs.NewConfig()

	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	zerolog.SetGlobalLevel(zerolog.InfoLevel)

	if config.Debug {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)

	defer cancel()
	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(config.MongoURI))
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to mongo")
		return
	}
	err = mongoClient.Ping(ctx, nil)
	if err != nil {
		log.Fatal().Err(err).Msgf("failed to ping mongo: %v", err)
		return
	}

	defer func() {
		if err = mongoClient.Disconnect(ctx); err != nil {
			panic(err)
		}
	}()

	database := mongoClient.Database("second-brain")

	app := fiber.New()
	api := app.Group("/api/v1")

	noteRepository := repositories.NewNoteRepository(database)
	tagRepository := repositories.NewTagRepository(database)

	noteService := services.NewNoteService(noteRepository, tagRepository, config.MediaPath)
	tagService := services.NewTagService(tagRepository)

	// TODO: master add validation
	handlers.RegisterNoteHandler(api, noteService)
	handlers.RegisterTagHandler(api, tagService)
	// handlers.RegisterUserHandlers(app)
	// handlers.RegisterTagHandlers(app)
	app.Static("media", config.MediaPath)
	log.Info().Msg("Application start debug mode: " + config.AppAddress)
	app.Listen(config.AppAddress)
}
