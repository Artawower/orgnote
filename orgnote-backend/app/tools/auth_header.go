package tools

import (
	"github.com/gofiber/fiber/v2"
)

func ExtractBearerToken(authHeader string) string {
	if authHeader == "" || len(authHeader) <= 7 {
		return ""
	}
	return authHeader[7:]

}

func ExtractBearerTokenFromCtx(ctx *fiber.Ctx) string {
	token := ExtractBearerToken(ctx.Get("Authorization"))
	return token
}
