package main

import (
	"context"
	"net/http"
	"orgnote/app/configs"
	"orgnote/app/handlers"
	"orgnote/app/infrastructure"
	"orgnote/app/repositories"
	"orgnote/app/services"
	"os"
	"time"

	cache "github.com/Code-Hex/go-generics-cache"
	"github.com/gofiber/fiber/v2"

	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/robfig/cron/v3"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/oauth2"
	oauth2github "golang.org/x/oauth2/github"
)

const exposedResponseHeaders = "X-Content-Hash"

// @title Org Note API
// @version 0.0.1
// @description List of methods for work with Org Note.
// @termsOfService http://swagger.io/terms/
// @contact.name API Support
// @contact.email artawower@protonmail.com
// @license.name GPL 3.0
// @license.url https://www.gnu.org/licenses/gpl-3.0.html
func main() {
	// TODO: master use DIG for dependencies
	config := configs.NewConfig()

	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	zerolog.SetGlobalLevel(zerolog.InfoLevel)

	if config.Debug {
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	http := http.Client{}

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

	database := mongoClient.Database("orgnote")

	subscriptionAPI, err := infrastructure.NewSubscription(
		http,
		config.AccessCheckerURL,
		config.AccessCheckToken,
		cache.New[string, infrastructure.SubscriptionInfo],
		config.AccessTokenCacheLifeTime,
	)

	if err != nil {
		log.Fatal().Err(err).Msg("failed to create subscription")
		return
	}

	app := fiber.New(fiber.Config{
		BodyLimit: int(config.MaxFileSize),
	})
	api := app.Group("/v1")

	userRepository := repositories.NewUserRepository(database)
	fileMetadataRepository := repositories.NewFileMetadataRepository(database)
	storageUsageCron := cron.New()
	defer storageUsageCron.Stop()
	if _, err := storageUsageCron.AddFunc("@hourly", func() {
		result, err := userRepository.ReconcileStorageUsage()
		if err != nil {
			log.Error().Err(err).Msg("storage usage reconciliation failed")
			return
		}
		log.Info().Int64("matchedUsers", result.MatchedUsers).Int64("updatedUsers", result.UpdatedUsers).Msg("storage usage reconciliation completed")
	}); err != nil {
		log.Fatal().Err(err).Msg("failed to schedule storage usage reconciliation")
		return
	}
	storageUsageCron.Start()

	blobStorage, err := infrastructure.NewS3Storage(infrastructure.S3Config{
		Endpoint:        config.S3Endpoint,
		AccessKeyID:     config.S3AccessKey,
		SecretAccessKey: config.S3SecretKey,
		BucketName:      config.S3Bucket,
		UseSSL:          config.S3UseSSL,
		UploadTimeout:   config.S3UploadTimeout,
		DownloadTimeout: config.S3DownloadTimeout,
	})
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create s3 storage")
		return
	}

	app.Use(recover.New(recover.Config{
		EnableStackTrace: true,
	}))
	app.Use(cors.New(cors.Config{
		ExposeHeaders: exposedResponseHeaders,
	}))
	app.Use(handlers.NewUserInjectMiddleware(handlers.Config{
		GetUser: userRepository.FindUserByToken,
	}))

	authMiddleware := handlers.NewAuthMiddleware()
	accessMiddleware := handlers.NewAccessMiddleware(subscriptionAPI, func(userID string, spaceLimit int64) error {
		return userRepository.UpdateSpaceLimitInfo(userID, nil, &spaceLimit)
	}, config.SelfHostedSpaceLimit)
	activeMiddleware := handlers.NewActiveMiddleware(handlers.ActiveMiddlewareConfig{
		AccessCheckerURL:   config.AccessCheckerURL,
		AccessCheckerToken: config.AccessCheckToken,
	})

	wsHandler := handlers.NewWebSocketHandler()
	handlers.RegisterWebSocketHandler(app, authMiddleware, wsHandler)
	notificationService := services.NewNotificationService(wsHandler)

	userService := services.NewUserService(userRepository, fileMetadataRepository, subscriptionAPI, config.ClientAddress)

	githubProvider := services.NewGitHubProvider(&oauth2.Config{
		ClientID:     config.GithubID,
		ClientSecret: config.GithubSecret,
		RedirectURL:  config.BackendHost() + "/auth/github/callback",
		Scopes:       []string{"user:email"},
		Endpoint:     oauth2github.Endpoint,
	})
	authService := services.NewAuthService(userService, githubProvider)

	syncService := services.NewSyncService(
		fileMetadataRepository,
		userRepository,
		notificationService,
		blobStorage,
		services.SyncServiceConfig{
			MaxFileSize:  config.MaxFileSize,
			TombstoneTTL: time.Duration(config.TombstoneTTL) * 24 * time.Hour,
		},
	)

	orgNoteMetaService := services.NewOrgNoteMetaService(services.OrgNoteMetaConfig{
		ClientRepoName:  config.GithubClientRepoName,
		ClientRepoOwner: config.GithubClientOwner,
	}, config)

	handlers.RegisterSwagger(api, config)
	handlers.RegisterAuthHandler(api, authService, userService, config, authMiddleware, activeMiddleware)
	versionMiddleware := handlers.NewVersionMiddleware(config.MinClientVersion)
	handlers.RegisterSyncHandler(api, syncService, authMiddleware, accessMiddleware, versionMiddleware)
	handlers.RegisterSystemInfoHandler(api, orgNoteMetaService)

	app.Static("media", config.MediaPath)

	if config.Debug {
		app.Static("v1/media", config.MediaPath)
	}

	log.Info().Msg("Application start debug mode: " + config.AppAddress)
	if err := app.Listen(config.AppAddress); err != nil {
		log.Fatal().Msgf("main: listen: %s", err)
	}
}
