package configs

import "os"

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
	if envMongoURI := os.Getenv("MONGO_URI"); envMongoURI != "" {
		mongoURI = envMongoURI
	}

	debug := os.Getenv("MODE") == "DEBUG"

	return Config{
		AppAddress: appAddress,
		MongoURI:   mongoURI,
		Debug:      debug,
		MediaPath:  "./media",
	}
}
