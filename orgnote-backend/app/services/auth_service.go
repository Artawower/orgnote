package services

import (
	"context"
	"fmt"
	"orgnote/app/models"
	"time"

	"golang.org/x/oauth2"
)

type AuthService struct {
	providers   map[string]OAuthProvider
	userService *UserService
}

func NewAuthService(userService *UserService, providers ...OAuthProvider) *AuthService {
	providerMap := make(map[string]OAuthProvider)
	for _, p := range providers {
		providerMap[p.Name()] = p
	}
	return &AuthService{
		providers:   providerMap,
		userService: userService,
	}
}

func (a *AuthService) GetAuthURL(provider string, state string) (string, error) {
	p, err := a.getProvider(provider)
	if err != nil {
		return "", err
	}

	return p.Config().AuthCodeURL(state,
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("prompt", "select_account"),
	), nil
}

func (a *AuthService) Login(ctx context.Context, provider string, code string) (*models.User, error) {
	p, err := a.getProvider(provider)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	token, err := p.Config().Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("exchange code: %w", err)
	}

	user, err := p.FetchUser(ctx, token)
	if err != nil {
		return nil, fmt.Errorf("fetch user: %w", err)
	}

	return a.userService.FindOrCreate(*user)
}

func (a *AuthService) getProvider(name string) (OAuthProvider, error) {
	p, ok := a.providers[name]
	if !ok {
		return nil, fmt.Errorf("unsupported provider: %s", name)
	}
	return p, nil
}

func (a *AuthService) SupportedProviders() []string {
	providers := make([]string, 0, len(a.providers))
	for name := range a.providers {
		providers = append(providers, name)
	}
	return providers
}
