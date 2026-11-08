package handlers

import (
	"encoding/json"
	"net/url"
	"orgnote/app/configs"
	"orgnote/app/models"
	"orgnote/app/services"
	"orgnote/app/tools"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

const (
	authLoginPath = "/auth/login"
)

type OAuthRedirectData struct {
	RedirectURL string `json:"redirectUrl"`
}

type AuthHandler struct {
	authService *services.AuthService
	userService *services.UserService
	config      configs.Config
}

type State struct {
	Environment string  `json:"environment"`
	RedirectURL *string `json:"redirectUrl"`
}

// Login godoc
// @Summary      OAuth Login
// @Description  Entrypoint for login
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        provider path string true "provider"
// @Param        state query string false "OAuth state"
// @Success      200  {object}  handlers.HttpResponse[OAuthRedirectData, any]
// @Failure      400  {object}  handlers.HttpError[any]
// @Failure      404  {object}  handlers.HttpError[any]
// @Failure      500  {object}  handlers.HttpError[any]
// @Router       /auth/{provider}/login  [get]
func (a *AuthHandler) Login(c *fiber.Ctx) error {
	provider := c.Params("provider")
	state := c.Query("state")

	authURL, err := a.authService.GetAuthURL(provider, state)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	return c.JSON(NewHttpResponse[OAuthRedirectData, any](OAuthRedirectData{
		RedirectURL: authURL,
	}, nil))
}

// LoginCallback godoc
// @Summary      Callback for OAuth
// @Description
// @Tags         auth
// @Accept       json
// @Produce      json
// @Param        provider path string true "provider"
// @Success      200  {object}  any
// @Failure      400  {object}  handlers.HttpError[any]
// @Failure      404  {object}  handlers.HttpError[any]
// @Failure      500  {object}  handlers.HttpError[any]
// @Router       /auth/{provider}/callback  [get]
func (a *AuthHandler) LoginCallback(c *fiber.Ctx) error {
	provider := c.Params("provider")
	code := c.Query("code")
	state := c.Query("state")

	if code == "" {
		return c.Status(fiber.StatusBadRequest).SendString("code is required")
	}

	user, err := a.authService.Login(c.Context(), provider, code)
	if err != nil {
		log.Error().Err(err).Str("provider", provider).Msg("auth handlers: login failed")
		return c.Status(fiber.StatusInternalServerError).SendString("Authentication failed")
	}

	redirectURL := a.buildClientRedirectURL(state, user)
	return c.Redirect(redirectURL, fiber.StatusTemporaryRedirect)
}

func (a *AuthHandler) buildClientRedirectURL(state string, u *models.User) string {
	baseURL := a.getLoginCallbackURL(state)

	query := url.Values{}
	query.Set("token", u.Token)
	query.Set("id", u.ID.Hex())
	query.Set("username", u.NickName)
	query.Set("avatarUrl", u.AvatarURL)
	query.Set("email", u.Email)
	query.Set("profileUrl", u.ProfileURL)
	query.Set("provider", u.Provider)
	query.Set("spaceLimit", strconv.FormatInt(u.SpaceLimit, 10))
	query.Set("usedSpace", strconv.FormatInt(u.UsedSpace, 10))
	query.Set("state", state)
	if u.Active != nil {
		query.Set("active", *u.Active)
	}

	baseURL.RawQuery = query.Encode()
	return baseURL.String()
}

func (a *AuthHandler) getLoginCallbackURL(state string) *url.URL {
	parsedState := State{}

	if err := json.Unmarshal([]byte(state), &parsedState); err != nil {
		log.Error().Err(err).Msg("auth handlers: unmarshal state")
		return buildURL(a.config.ClientAddress, authLoginPath)
	}

	if parsedState.Environment == "mobile" {
		return &url.URL{
			Scheme: a.config.MobileAppName,
			Host:   "auth",
			Path:   "/login",
		}
	}

	if parsedState.Environment == "electron" {
		parsed, _ := url.Parse(a.config.ElectronCallbackURL)
		return parsed
	}

	return buildURL(a.config.ClientAddress, authLoginPath)
}

func buildURL(base string, path string) *url.URL {
	parsed, err := url.Parse(base)
	if err != nil {
		return &url.URL{Path: path}
	}
	parsed.Path = path
	return parsed
}

// Logout godoc
// @Summary      Logout
// @Description
// @Tags         auth
// @Accept       json
// @Produce      json
// @Success      200  {object}  any
// @Failure      500  {object}  handlers.HttpError[any]
// @Router       /auth/logout  [get]
func (a *AuthHandler) Logout(c *fiber.Ctx) error {
	return c.Status(fiber.StatusOK).JSON(struct{}{})
}

// CreateApiToken godoc
// @Summary      Create API token
// @Description  Create API token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Success      200  {object}  HttpResponse[models.APIToken, any]
// @Failure      500  {object}  handlers.HttpError[any]
// @Router       /auth/token  [post]
func (a *AuthHandler) CreateToken(c *fiber.Ctx) error {
	user, ok := getUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrAuthRequired, nil))
	}
	token, err := a.userService.CreateToken(user)
	if err != nil {
		log.Error().Err(err).Msgf("auth handlers: github auth handler: create token")
		return c.Status(fiber.StatusInternalServerError).SendString("Internal server error")
	}
	return c.Status(fiber.StatusOK).JSON(NewHttpResponse[*models.APIToken, any](token, nil))
}

type ParamsDeleteToken struct {
	TokenID string `json:"tokenId"`
}

// DeleteToken   godoc
// @Summary      Delete API token
// @Description  Delete API token
// @Tags         auth
// @Param 		   tokenId path string true "token id"
// @Accept       json
// @Produce      json
// @Success      200  {object}  any
// @Failure      500  {object}  handlers.HttpError[any]
// @Router       /auth/token/{tokenId}  [delete]
func (a *AuthHandler) DeleteToken(c *fiber.Ctx) error {
	user, ok := getUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrAuthRequired, nil))
	}
	b := new(ParamsDeleteToken)
	if err := c.ParamsParser(b); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(NewHttpError[any]("Token doesn't provided", nil))
	}

	log.Info().Msgf("Delete token %s", b.TokenID)

	err := a.userService.DeleteToken(user, b.TokenID)
	if err != nil {
		log.Error().Err(err).Msgf("auth handlers: github auth handler: delete token")
		return c.Status(fiber.StatusInternalServerError).SendString("Internal server error")
	}
	return c.Status(fiber.StatusOK).JSON(NewHttpResponse[any, any](nil, nil))
}

// VerifyUser godoc
// @Summary      Verify user
// @Description  Return found user by provided token
// @Tags         auth
// @Accept       json
// @Produce      json
// @Success      200  {object}  handlers.HttpResponse[models.UserPersonalInfo, any]
// @Failure      403  {object}  handlers.HttpError[any]
// @Failure      500  {object}  handlers.HttpError[any]
// @Router       /auth/verify  [get]
func (a *AuthHandler) VerifyUser(c *fiber.Ctx) error {
	token := tools.ExtractBearerTokenFromCtx(c)
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrAuthRequired, nil))
	}
	user, err := a.userService.FindUser(token)
	if err != nil {
		log.Info().Err(err).Msgf("auth handlers: github auth handler: find user")
		return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrAuthRequired, nil))
	}
	return c.Status(fiber.StatusOK).JSON(NewHttpResponse[*models.UserPersonalInfo, any](user, nil))
}

// GetApiTokens godoc
// @Summary      Get API tokens
// @Description  Return all available API tokens
// @Tags         auth
// @Accept       json
// @Produce      json
// @Success      200  {object}  handlers.HttpResponse[[]models.APIToken, any]
// @Failure      500  {object}  handlers.HttpError[any]
// @Failure      400  {object}  handlers.HttpError[any]
// @Router       /auth/api-tokens  [get]
func (a *AuthHandler) GetAPITokens(c *fiber.Ctx) error {
	user, ok := getUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrAuthRequired, nil))
	}
	tokens, err := a.userService.GetAPITokens(user.ID.Hex())
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Could not find api tokens for current user")
	}
	return c.Status(fiber.StatusOK).JSON(NewHttpResponse[[]models.APIToken, any](tokens, nil))
}

// DeleteUserAccount godoc
// @Summary      Delete user account
// @Description  Delete user account
// @Tags         auth
// @Accept       json
// @Produce      json
// @Success      200  {object}  any
// @Failure      500  {object}  handlers.HttpError[any]
// @Router       /auth/account  [delete]
func (a *AuthHandler) DeleteUserAccount(c *fiber.Ctx) error {
	user, ok := getUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrAuthRequired, nil))
	}

	err := a.userService.DeleteUser(user)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Could not delete user account")
	}

	return c.Status(fiber.StatusOK).JSON(NewHttpResponse[any, any](nil, nil))
}

type SubscribeBody struct {
	Token string  `json:"token"`
	Email *string `json:"email"`
}

// Subscribe with token inside body
// @Summary      Subscribe
// @Description  Subscribe for backend features, like sync notes
// @Tags         auth
// @Param 		   data body SubscribeBody true "token"
// @Accept       json
// @Produce      json
// @Success      200  {object}  any
// @Failure      500  {object}  handlers.HttpError[any]
// @Router       /auth/subscribe  [post]
func (a *AuthHandler) Subscribe(c *fiber.Ctx) error {
	user, ok := getUserFromContext(c)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(NewHttpError[any](ErrAuthRequired, nil))
	}

	body := new(SubscribeBody)

	if err := c.BodyParser(body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(NewHttpError[any]("Token doesn't provided", nil))
	}

	err := a.userService.Subscribe(user, body.Token, body.Email)
	if err != nil {
		log.Error().Err(err).Msgf("auth handlers: github auth handler: subscribe")
		return c.Status(fiber.StatusBadRequest).JSON(NewHttpError[any]("Could not subscribe with provided information", nil))
	}
	return c.Status(fiber.StatusOK).JSON(NewHttpResponse[any, any](nil, nil))
}

func RegisterAuthHandler(
	app fiber.Router,
	authService *services.AuthService,
	userService *services.UserService,
	config configs.Config,
	authMiddleware fiber.Handler,
	activeMiddleware fiber.Handler,
) {
	authHandler := &AuthHandler{
		authService: authService,
		userService: userService,
		config:      config,
	}

	app.Get("/auth/:provider/login", authHandler.Login)
	app.Get("/auth/:provider/callback", authHandler.LoginCallback)
	app.Get("/auth/logout", authHandler.Logout)
	app.Post("/auth/token", authMiddleware, activeMiddleware, authHandler.CreateToken)
	app.Delete("/auth/token/:tokenId", authMiddleware, activeMiddleware, authHandler.DeleteToken)
	app.Get("/auth/verify", authHandler.VerifyUser)
	app.Get("/auth/api-tokens", authMiddleware, activeMiddleware, authHandler.GetAPITokens)
	app.Post("/auth/subscribe", authMiddleware, authHandler.Subscribe)
	app.Delete("/auth/account", authMiddleware, authHandler.DeleteUserAccount)
}
