package configs

import (
	"os"

	"github.com/rs/zerolog/log"
)

type Config struct {
	AppAddress    string
	MongoURI      string
	Debug         bool
	MediaPath     string
	GithubID      string
	GithubSecret  string
	BackendHost   string
	ClientAddress string
}

// TODO: master split into several functions
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

	envGithubID := os.Getenv("GITHUB_ID")
	envGithubSecret := os.Getenv("GITHUB_SECRET")

	if envGithubID == "" || envGithubSecret == "" {
		log.Warn().Msg("Github OAuth is not configured")
	}

	debug := os.Getenv("MODE") == "DEBUG"

	clientAddress := appAddress
	if envClientAddress := os.Getenv("CLIENT_ADDRESS"); envClientAddress != "" {
		clientAddress = envClientAddress
	}

	backendHost := os.Getenv("BACKEND_HOST")

	config := Config{
		AppAddress:    appAddress,
		MongoURI:      mongoURI,
		Debug:         debug,
		MediaPath:     "./media",
		GithubID:      envGithubID,
		GithubSecret:  envGithubSecret,
		ClientAddress: clientAddress,
		BackendHost:   backendHost,
	}
	log.Info().Msgf("Config: %+v", config)

	return config
}
