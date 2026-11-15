package services

import (
	"context"
	"orgnote/app/models"
	"strconv"

	"github.com/google/go-github/github"
	"golang.org/x/oauth2"
)

type GitHubProvider struct {
	oauthConfig *oauth2.Config
}

func NewGitHubProvider(oauthConfig *oauth2.Config) *GitHubProvider {
	return &GitHubProvider{oauthConfig: oauthConfig}
}

func (g *GitHubProvider) Name() string {
	return "github"
}

func (g *GitHubProvider) Config() *oauth2.Config {
	return g.oauthConfig
}

func (g *GitHubProvider) FetchUser(ctx context.Context, token *oauth2.Token) (*models.User, error) {
	httpClient := g.oauthConfig.Client(ctx, token)
	client := github.NewClient(httpClient)

	ghUser, _, err := client.Users.Get(ctx, "")
	if err != nil {
		return nil, err
	}

	return mapGitHubUserToUser(ghUser, token), nil
}

func mapGitHubUserToUser(ghUser *github.User, token *oauth2.Token) *models.User {
	refreshToken := ""
	if token.RefreshToken != "" {
		refreshToken = token.RefreshToken
	}
	return &models.User{
		Provider:            "github",
		Email:               ghUser.GetEmail(),
		Name:                ghUser.GetName(),
		NickName:            ghUser.GetLogin(),
		AvatarURL:           ghUser.GetAvatarURL(),
		ExternalID:          strconv.FormatInt(ghUser.GetID(), 10),
		Token:               token.AccessToken,
		RefreshToken:        &refreshToken,
		TokenExpirationDate: token.Expiry,
		ProfileURL:          ghUser.GetHTMLURL(),
		APITokens:           []models.APIToken{},
		SpaceLimit:          0,
		UsedSpace:           0,
		Active:              nil,
	}
}
