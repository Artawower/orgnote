package handlers

import (
	"moonbrain/models"
	"moonbrain/services"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

type NoteFilter struct {
	Limit  int      `json:"limit"`
	Offset int      `json:"offset"`
	Search int      `json:"filter"`
	Tags   []string `json:"tags"`
}

func RegisterNoteHandler(app *fiber.App, noteService *services.NoteService) {

	app.Get("/notes/:id", func(c *fiber.Ctx) error {
		noteID := c.Params("id")

		notes, err := noteService.GetNote(noteID)
		if err != nil {
			log.Info().Err(err).Msg("note handler > get note > get by id")
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Couldn't get notes, something went wrong", nil))
		}
		return c.Status(http.StatusOK).JSON(NewHttpReponse(notes, nil))
	})

	app.Get("/notes", func(c *fiber.Ctx) error {
		filter := new(NoteFilter)

		if err := c.BodyParser(filter); err != nil {
			log.Info().Err(err).Msg("note handler > get notes > parse body")
			return c.Status(fiber.StatusInternalServerError).JSON(NewHttpError("Incorrect input query", err))
		}

		notes, err := noteService.GetNotes()
		if err != nil {
			log.Info().Err(err).Msg("note handler > get notes")
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Couldn't get notes, something went wrong", nil))
		}
		return c.Status(http.StatusOK).JSON(NewHttpReponse(notes, nil))
	})

	app.Post("/notes", func(c *fiber.Ctx) error {

		note := new(models.Note)

		if err := c.BodyParser(note); err != nil {
			log.Info().Err(err).Msg("note handler > post note > parse body")
			return c.Status(fiber.StatusInternalServerError).JSON(NewHttpError("Can't parse body", err))
		}

		err := noteService.CreateNote(*note)

		if err != nil {
			log.Info().Err(err).Msg("note handler > post note > create")
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Can't create note :(", nil))
		}
		return c.Status(http.StatusOK).JSON(nil)
	})

	app.Put("/notes", func(c *fiber.Ctx) error {
		note := new(models.Note)

		if err := c.BodyParser(note); err != nil {
			log.Info().Err(err).Msg("note handler > put notes > parse body")
			return c.Status(fiber.StatusInternalServerError).JSON(NewHttpError("Can't parse body", err))
		}

		err := noteService.UpdateNote(*note)

		if err != nil {
			log.Info().Err(err).Msg("note handler > put notes > update note")
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Can't create note :(", nil))
		}
		return c.Status(http.StatusOK).JSON(nil)
	})

}
