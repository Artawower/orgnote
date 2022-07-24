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
	}
}

type publicUser struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Nickname   string `json:"nickname"`
	AvatarURL  string `json:"avatarUrl"`
	Email      string `json:"email"`
	ProfileURL string `json:"profileUrl"`
}

func mapToPublicUserInfo(user *models.User) *publicUser {
	return &publicUser{
		ID:         user.ExternalID,
		Name:       user.Name,
		Nickname:   user.NickName,
		AvatarURL:  user.AvatarURL,
		Email:      user.Email,
		ProfileURL: user.ProfileURL,
	}
}

// TODO: master refactor this code.
func RegisterAuthHandler(app fiber.Router, userService *services.UserService, config configs.Config, authMiddleware fiber.Handler) {
	goth.UseProviders(
		github.New(config.GithubID, config.GithubSecret, config.BackendHost+"/auth/github/callback"),
	)

	app.Get("/auth/github/login", func(c *fiber.Ctx) error {
		url, err := goth_fiber.GetAuthURL(c)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).SendString(err.Error())
		}
		// return c.Redirect(url, fiber.StatusTemporaryRedirect)
		data := NewHttpReponse[OAuthRedirectData, any](OAuthRedirectData{
			RedirectURL: url,
		}, nil)
		return c.JSON(data)
	})

	app.Get("/auth/github/callback", func(c *fiber.Ctx) error {
		user, err := goth_fiber.CompleteUserAuth(c)
		if err != nil {
			log.Error().Err(err).Msgf("auth handlers: github auth handler: complete user auth")
			return c.Status(500).SendString("Internal server error")
		}
		var userBytes bytes.Buffer
		enc := gob.NewEncoder(&userBytes)
		err = enc.Encode(user)
		if err != nil {
			log.Error().Err(err).Msgf("auth handlers: github auth handler: encode user: %v", err)
			return c.Status(500).SendString("Internal server error")
		}
		u, err := userService.Login(*mapToUser(user))
		if err != nil {
			log.Error().Err(err).Msgf("auth handlers: github auth handler: login user %v", err)
			return c.Status(500).SendString("Internal server error")
		}
		redirectURL := config.ClientAddress + "/auth/login"
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

	})

	app.Get("/auth/logout", func(c *fiber.Ctx) error {
		if err := goth_fiber.Logout(c); err != nil {
			log.Fatal().Err(err).Msgf("auth handlers: github auth handler: logout")
			return c.Status(500).SendString("Internal server error")
		}

		c.SendString("logout")
		return c.Status(200).JSON(struct{}{})
	})

	app.Post("/auth/token", authMiddleware, func(c *fiber.Ctx) error {
		user := c.Locals("user").(*models.User)
		token, err := userService.CreateToken(user)
		if err != nil {
			log.Error().Err(err).Msgf("auth handlers: github auth handler: create token")
			return c.Status(500).SendString("Internal server error")
		}
		return c.Status(200).JSON(NewHttpReponse[*models.AccessToken, any](token, nil))
	})

	type BodyDeleteToken struct {
		TokenID string `json:"tokenId"`
	}

	app.Delete("/auth/token", authMiddleware, func(c *fiber.Ctx) error {
		user := c.Locals("user").(*models.User)
		b := new(BodyDeleteToken)
		if err := c.BodyParser(b); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(NewHttpError[any]("Token doesn't provided", nil))
		}

		err := userService.DeleteToken(user, b.TokenID)
		if err != nil {
			log.Error().Err(err).Msgf("auth handlers: github auth handler: delete token")
			return c.Status(500).SendString("Internal server error")
		}
		return c.Status(200).JSON(NewHttpReponse[any, any](nil, nil))
	})

	// TODO: important! Add mapper for exposing only public properties from user model
	app.Get("/auth/verify", func(c *fiber.Ctx) error {
		token := tools.ExtractBearerTokenFromCtx(c)
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrTokenNotProvided, nil))
		}
		user, err := userService.FindUser(token)
		if err != nil {
			log.Info().Err(err).Msgf("auth handlers: github auth handler: find user")
			return c.Status(fiber.StatusBadRequest).SendString(ErrInvalidToken)
		}
		return c.Status(200).JSON(NewHttpReponse[*publicUser, any](mapToPublicUserInfo(user), nil))
	})

}
