package configs

import (
	"os"

	"github.com/rs/zerolog/log"
)

type Config struct {
	AppAddress string
	MongoURI   string
	Debug      bool
	MediaPath  string
}

func NewConfig() Config {
	appAddress := "127.0.0.1:3000"
	if envAddr := os.Getenv("APP_ADDRESS"); envAddr != "" {
		appAddress = envAddr
	}

	mongoURI := "mongodb://127.0.0.1:27017"
	// TODO: master check correct enviroment variable
	if envMongoURL := os.Getenv("MONGO_URL"); envMongoURL != "" {
		mongoUser := os.Getenv("MONGO_USERNAME")
		mongoPassword := os.Getenv("MONGO_PASSWORD")
		mongoPort := os.Getenv("MONGO_PORT")
		mongoURI = "mongodb://" + mongoUser + ":" + mongoPassword + "@" + envMongoURL + ":" + mongoPort
	}
	log.Info().Msgf("Mongo URI: %s", mongoURI)

	debug := os.Getenv("MODE") == "DEBUG"

	return Config{
		AppAddress: appAddress,
		MongoURI:   mongoURI,
		Debug:      debug,
		MediaPath:  "./media",
	}
}
