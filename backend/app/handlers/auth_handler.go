package handlers

import (
	"bytes"
	"encoding/gob"
	"moonbrain/app/configs"
	"moonbrain/app/models"
	"moonbrain/app/services"
	"moonbrain/app/tools"
	"net/url"

	"github.com/gofiber/fiber/v2"
	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/github"
	"github.com/rs/zerolog/log"
	"github.com/shareed2k/goth_fiber"
)

type OAuthRedirectData struct {
	RedirectURL string `json:"redirectUrl"`
}

func mapToUser(user goth.User) *models.User {
	return &models.User{
		Provider:            user.Provider,
		Email:               user.Email,
		Name:                user.Name,
		NickName:            user.NickName,
		AvatarURL:           user.AvatarURL,
		ExternalID:          user.UserID,
		FirstName:           user.FirstName,
		LastName:            user.LastName,
		Token:               user.AccessToken,
		RefreshToken:        &user.RefreshToken,
		TokenExpirationDate: user.ExpiresAt,
		ProfileURL:          user.RawData["html_url"].(string),
		Notes:               []models.Note{},
		APITokens:           []models.APIToken{},
	}
}

type AuthHandler struct {
	userService    *services.UserService
	config         configs.Config
	authMiddleware fiber.Handler
}

func (a *AuthHandler) Login(c *fiber.Ctx) error {
	url, err := goth_fiber.GetAuthURL(c)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}
	// return c.Redirect(url, fiber.StatusTemporaryRedirect)
	data := NewHttpReponse[OAuthRedirectData, any](OAuthRedirectData{
		RedirectURL: url,
	}, nil)
	return c.JSON(data)
}

func (a *AuthHandler) GithubCallback(c *fiber.Ctx) error {
	user, err := goth_fiber.CompleteUserAuth(c)
	if err != nil {
		log.Error().Err(err).Msgf("auth handlers: github auth handler: complete user auth")
		return c.Status(fiber.StatusInternalServerError).SendString("Internal server error")
	}
	var userBytes bytes.Buffer
	enc := gob.NewEncoder(&userBytes)
	err = enc.Encode(user)
	if err != nil {
		log.Error().Err(err).Msgf("auth handlers: github auth handler: encode user: %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Internal server error")
	}
	u, err := a.userService.Login(*mapToUser(user))
	if err != nil {
		log.Error().Err(err).Msgf("auth handlers: github auth handler: login user %v", err)
		return c.Status(fiber.StatusInternalServerError).SendString("Internal server error")
	}
	redirectURL := a.config.ClientAddress + "/auth/login"
	url, err := url.Parse(redirectURL)
	if err != nil {
		log.Error().Err(err).Msgf("auth handlers: github auth handler: parse redirect url %v", err)
	}
	q := url.Query()
	q.Set("token", u.Token)
	q.Set("username", u.NickName)
	q.Set("avatarUrl", u.AvatarURL)
	q.Set("email", u.Email)
	q.Set("profileUrl", u.ProfileURL)
	url.RawQuery = q.Encode()
	log.Info().Msgf("auth handlers: github auth handler: redirect to %s, %v", url.String())
	return c.Redirect(url.String())

}

func (a *AuthHandler) Logout(c *fiber.Ctx) error {
	if err := goth_fiber.Logout(c); err != nil {
		log.Error().Err(err).Msgf("auth handlers: github auth handler: logout")
		return c.Status(500).SendString("Internal server error")
	}
	// TODO: master delete user token here
	c.SendString("logout")
	return c.Status(200).JSON(struct{}{})
}

func (a *AuthHandler) CreateToken(c *fiber.Ctx) error {
	user := c.Locals("user").(*models.User)
	token, err := a.userService.CreateToken(user)
	if err != nil {
		log.Error().Err(err).Msgf("auth handlers: github auth handler: create token")
		return c.Status(500).SendString("Internal server error")
	}
	return c.Status(200).JSON(NewHttpReponse[*models.APIToken, any](token, nil))
}

type BodyDeleteToken struct {
	TokenID string `json:"tokenId"`
}

func (a *AuthHandler) DeleteToken(c *fiber.Ctx) error {
	user := c.Locals("user").(*models.User)
	b := new(BodyDeleteToken)
	if err := c.BodyParser(b); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(NewHttpError[any]("Token doesn't provided", nil))
	}

	err := a.userService.DeleteToken(user, b.TokenID)
	if err != nil {
		log.Error().Err(err).Msgf("auth handlers: github auth handler: delete token")
		return c.Status(500).SendString("Internal server error")
	}
	return c.Status(200).JSON(NewHttpReponse[any, any](nil, nil))
}

func (a *AuthHandler) VerifyUser(c *fiber.Ctx) error {
	token := tools.ExtractBearerTokenFromCtx(c)
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrTokenNotProvided, nil))
	}
	user, err := a.userService.FindUser(token)
	if err != nil {
		log.Info().Err(err).Msgf("auth handlers: github auth handler: find user")
		return c.Status(fiber.StatusBadRequest).SendString(ErrInvalidToken)
	}
	return c.Status(fiber.StatusOK).JSON(NewHttpReponse[*models.PublicUser, any](user, nil))
}

func (a *AuthHandler) GetAPITokens(c *fiber.Ctx) error {
	user := c.Locals("user").(*models.User)
	tokens, err := a.userService.GetAPITokens(user.ID.Hex())
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Could not find api tokens for current user")
	}
	return c.Status(fiber.StatusOK).JSON(NewHttpReponse[[]models.APIToken, any](tokens, nil))
}

// TODO: master refactor this code.
func RegisterAuthHandler(app fiber.Router, userService *services.UserService, config configs.Config, authMiddleware fiber.Handler) {
	goth.UseProviders(
		github.New(config.GithubID, config.GithubSecret, config.BackendHost+"/auth/github/callback"),
	)

	authHandler := &AuthHandler{
		userService:    userService,
		config:         config,
		authMiddleware: authMiddleware,
	}

	app.Get("/auth/github/login", authHandler.Login)
	app.Get("/auth/github/callback", authHandler.GithubCallback)
	app.Get("/auth/logout", authHandler.Logout)
	app.Post("/auth/token", authMiddleware, authHandler.CreateToken)
	app.Delete("/auth/token", authMiddleware, authHandler.DeleteToken)
	app.Get("/auth/verify", authHandler.VerifyUser)
	app.Get("/auth/api-tokens", authHandler.GetAPITokens)

}
