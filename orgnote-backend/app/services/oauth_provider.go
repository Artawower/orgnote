package services

import (
	"context"
	"orgnote/app/models"

	"golang.org/x/oauth2"
)

type OAuthProvider interface {
	Name() string
	FetchUser(ctx context.Context, token *oauth2.Token) (*models.User, error)
	Config() *oauth2.Config
}
