package configs

import (
	"os"
	"strconv"

	"github.com/davecgh/go-spew/spew"
	"github.com/rs/zerolog/log"
)

const DefaultSelfHostedSpaceLimitBytes int64 = 100 * 1024 * 1024

type Config struct {
	AppAddress               string
	MongoURI                 string
	Debug                    bool
	MediaPath                string
	GithubID                 string
	GithubSecret             string
	BackendURL               string
	ClientAddress            string
	MobileAppName            string
	ElectronCallbackURL      string
	AccessCheckerURL         *string
	AccessCheckToken         *string
	AccessTokenCacheLifeTime int
	MaxFileSize              int64
	SelfHostedSpaceLimit     int64
	TombstoneTTL             int

	GithubClientOwner    string
	GithubClientRepoName string

	MinClientVersion *string

	S3Endpoint        string
	S3AccessKey       string
	S3SecretKey       string
	S3Bucket          string
	S3UseSSL          bool
	S3UploadTimeout   int
	S3DownloadTimeout int
}

func (c *Config) BackendHost() string {
	return c.BackendURL
}

func getEnvInt64(name string, defaultValue int64) int64 {
	envValue := os.Getenv(name)
	if envValue == "" {
		return defaultValue
	}

	value, err := strconv.ParseInt(envValue, 10, 64)
	if err != nil || value <= 0 {
		log.Warn().Str("env", name).Int64("default", defaultValue).Msg("invalid integer environment value")
		return defaultValue
	}

	return value
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

	debug := os.Getenv("DEBUG") == "true"

	clientAddress := appAddress
	if envClientAddress := os.Getenv("CLIENT_ADDRESS"); envClientAddress != "" {
		clientAddress = envClientAddress
	}

	backendURL := os.Getenv("BACKEND_URL")
	if backendURL == "" {
		log.Fatal().Msg("BACKEND_URL is not set")
	}

	envAccessCheckURL := os.Getenv("ACCESS_CHECK_URL")

	var accessCheckToken *string
	if envAccessCheckToken := os.Getenv("ACCESS_CHECK_TOKEN"); envAccessCheckToken != "" {
		accessCheckToken = &envAccessCheckToken
	}

	accessTokenCacheLifeTime := 60

	if envAccessTokenCacheLifeTime := os.Getenv("ACCESS_TOKEN_CACHE_LIFE_TIME"); envAccessTokenCacheLifeTime != "" {
		val, err := strconv.Atoi(envAccessTokenCacheLifeTime)
		if err != nil {
			accessTokenCacheLifeTime = val
		} else {
			log.Warn().Msgf("ACCESS_TOKEN_CACHE_LIFE_TIME is not a number, init with default value: %d", accessTokenCacheLifeTime)
		}
	}

	maxFileSize := int64(50 * 1024 * 1024)
	if envMaxFileSize := os.Getenv("MAX_FILE_SIZE"); envMaxFileSize != "" {
		val, err := strconv.ParseInt(envMaxFileSize, 10, 64)
		if err == nil {
			maxFileSize = val
		}
	}

	selfHostedSpaceLimit := getEnvInt64("SELF_HOSTED_SPACE_LIMIT_BYTES", DefaultSelfHostedSpaceLimitBytes)

	tombstoneTTL := 30
	if envTombstoneTTL := os.Getenv("TOMBSTONE_TTL_DAYS"); envTombstoneTTL != "" {
		val, err := strconv.Atoi(envTombstoneTTL)
		if err == nil {
			tombstoneTTL = val
		}
	}

	var minClientVersion *string
	if v := os.Getenv("MIN_CLIENT_VERSION"); v != "" {
		minClientVersion = &v
	}

	s3Endpoint := os.Getenv("S3_ENDPOINT")
	s3AccessKey := os.Getenv("S3_ACCESS_KEY")
	s3SecretKey := os.Getenv("S3_SECRET_KEY")
	s3Bucket := os.Getenv("S3_BUCKET")

	if s3Endpoint == "" || s3AccessKey == "" || s3SecretKey == "" || s3Bucket == "" {
		log.Fatal().Msg("S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY and S3_BUCKET are required")
	}

	s3UseSSL := os.Getenv("S3_USE_SSL") == "true"

	s3UploadTimeout := 30
	if envS3UploadTimeout := os.Getenv("S3_UPLOAD_TIMEOUT"); envS3UploadTimeout != "" {
		val, err := strconv.Atoi(envS3UploadTimeout)
		if err == nil {
			s3UploadTimeout = val
		}
	}

	s3DownloadTimeout := 30
	if envS3DownloadTimeout := os.Getenv("S3_DOWNLOAD_TIMEOUT"); envS3DownloadTimeout != "" {
		val, err := strconv.Atoi(envS3DownloadTimeout)
		if err == nil {
			s3DownloadTimeout = val
		}
	}

	electronCallbackURL := "http://127.0.0.1:17432/auth/login"
	if envElectronCallbackURL := os.Getenv("ELECTRON_CALLBACK_URL"); envElectronCallbackURL != "" {
		electronCallbackURL = envElectronCallbackURL
	}

	config := Config{
		AppAddress:               appAddress,
		MongoURI:                 mongoURI,
		Debug:                    debug,
		MediaPath:                "./media",
		GithubID:                 envGithubID,
		GithubSecret:             envGithubSecret,
		ClientAddress:            clientAddress,
		BackendURL:               backendURL,
		AccessCheckerURL:         &envAccessCheckURL,
		AccessCheckToken:         accessCheckToken,
		AccessTokenCacheLifeTime: accessTokenCacheLifeTime,
		MaxFileSize:              maxFileSize,
		SelfHostedSpaceLimit:     selfHostedSpaceLimit,
		TombstoneTTL:             tombstoneTTL,
		MobileAppName:            "orgnote",
		ElectronCallbackURL:      electronCallbackURL,

		GithubClientOwner:    "artawower",
		GithubClientRepoName: "orgnote-client",

		MinClientVersion: minClientVersion,

		S3Endpoint:        s3Endpoint,
		S3AccessKey:       s3AccessKey,
		S3SecretKey:       s3SecretKey,
		S3Bucket:          s3Bucket,
		S3UseSSL:          s3UseSSL,
		S3UploadTimeout:   s3UploadTimeout,
		S3DownloadTimeout: s3DownloadTimeout,
	}
	log.Info().Msgf("Config: %+v", spew.Sdump(config))

	return config
}
