package handlers

import (
	"moonbrain/models"
	"moonbrain/services"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

type ArticleFilter struct {
	Limit  int      `json:"limit"`
	Offset int      `json:"offset"`
	Search int      `json:"filter"`
	Tags   []string `json:"tags"`
}

func RegisterArticleHandlers(app *fiber.App, articleService *services.ArticleService) {

	app.Get("/articles/:id", func(c *fiber.Ctx) error {
		articleID := c.Params("id")

		articles, err := articleService.GetArticle(articleID)
		if err != nil {
			log.Info().Err(err).Msg("article handler > get article > get by id")
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Couldn't get articles, something went wrong", nil))
		}
		return c.Status(http.StatusOK).JSON(NewHttpReponse(articles, nil))
	})

	app.Get("/articles", func(c *fiber.Ctx) error {
		filter := new(ArticleFilter)

		if err := c.BodyParser(filter); err != nil {
			log.Info().Err(err).Msg("article handler > get articles > parse body")
			return c.Status(fiber.StatusInternalServerError).JSON(NewHttpError("Incorrect input query", err))
		}

		articles, err := articleService.GetArticles()
		if err != nil {
			log.Info().Err(err).Msg("article handler > get articles")
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Couldn't get articles, something went wrong", nil))
		}
		return c.Status(http.StatusOK).JSON(NewHttpReponse(articles, nil))
	})

	app.Post("/articles", func(c *fiber.Ctx) error {

		article := new(models.Article)

		if err := c.BodyParser(article); err != nil {
			log.Info().Err(err).Msg("article handler > post article > parse body")
			return c.Status(fiber.StatusInternalServerError).JSON(NewHttpError("Can't parse body", err))
		}

		err := articleService.CreateArticle(*article)

		if err != nil {
			log.Info().Err(err).Msg("article handler > post article > create")
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Can't create article :(", nil))
		}
		return c.Status(http.StatusOK).JSON(nil)
	})

	app.Put("/articles", func(c *fiber.Ctx) error {
		article := new(models.Article)

		if err := c.BodyParser(article); err != nil {
			log.Info().Err(err).Msg("article handler > put articles > parse body")
			return c.Status(fiber.StatusInternalServerError).JSON(NewHttpError("Can't parse body", err))
		}

		err := articleService.UpdateArticle(*article)

		if err != nil {
			log.Info().Err(err).Msg("article handler > put articles > update article")
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Can't create article :(", nil))
		}
		return c.Status(http.StatusOK).JSON(nil)
	})

}
