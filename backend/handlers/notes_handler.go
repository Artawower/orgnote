package handlers

import (
	"encoding/json"
	"moonbrain/models"
	"moonbrain/services"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

type NoteFilter struct {
	Limit  *int      `json:"limit"`
	Offset *int      `json:"offset"`
	Search *int      `json:"filter"`
	Tags   *[]string `json:"tags"`
}

func collectNoteFromString(stringNote string) (models.Note, error) {
	note := models.Note{}
	err := json.Unmarshal([]byte(stringNote), &note)
	if err != nil {
		return note, err
	}
	return note, nil
}

func collectNotesFromStrings(stringNotes []string) ([]models.Note, []string) {
	notes := []models.Note{}
	errors := []string{}
	for _, strNote := range stringNotes {
		note, err := collectNoteFromString(strNote)
		if err != nil {
			// TODO master: add user friendly error message
			errors = append(errors, err.Error())
			continue
		}
		notes = append(notes, note)
	}
	return notes, errors
}

func RegisterNoteHandler(app fiber.Router, noteService *services.NoteService) {

	app.Get("/notes/:id", func(c *fiber.Ctx) error {
		noteID := c.Params("id")

		notes, err := noteService.GetNote(noteID)
		if err != nil {
			log.Info().Err(err).Msg("note handler: get note: get by id")
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Couldn't get notes, something went wrong", nil))
		}
		return c.Status(http.StatusOK).JSON(NewHttpReponse(notes, nil))
	})

	app.Get("/notes", func(c *fiber.Ctx) error {
		filter := new(NoteFilter)

		if err := c.QueryParser(filter); err != nil {
			log.Info().Err(err).Msg("note handler: get notes: parse body")
			return c.Status(fiber.StatusInternalServerError).JSON(NewHttpError("Incorrect input query", err))
		}

		notes, err := noteService.GetNotes()
		if err != nil {
			log.Info().Err(err).Msg("note handler: get notes")
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Couldn't get notes, something went wrong", nil))
		}
		return c.Status(http.StatusOK).JSON(NewHttpReponse(notes, nil))
	})

	app.Post("/notes", func(c *fiber.Ctx) error {

		note := new(models.Note)

		if err := c.BodyParser(note); err != nil {
			log.Info().Err(err).Msg("note handler: post note: parse body")
			return c.Status(fiber.StatusInternalServerError).JSON(NewHttpError("Can't parse body", err))
		}

		err := noteService.CreateNote(*note)

		if err != nil {
			log.Info().Err(err).Msgf("note handler: post note: create %v", err)
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Can't create note:(", nil))
		}

		return c.Status(http.StatusOK).JSON(nil)
	})

	app.Put("/notes/bulk-upsert", func(c *fiber.Ctx) error {

		log.Info().Msgf("content type: %v", string(c.Request().Header.ContentType()))
		if form, err := c.MultipartForm(); err == nil {

			log.Info().Err(err).Msg("note handler: put notes: parse body")
			// files := form.File["files"]
			rawNotes, ok := form.Value["notes"]
			if !ok {
				return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Notes doesn't provided", nil))
			}
			notes, errors := collectNotesFromStrings(rawNotes)
			if len(errors) > 0 {
				// TODO: master add errors exposing to real life.
				log.Error().Err(err).Msg("note handler: put notes: collect notes")
			}
			err = noteService.BulkCreateOrUpdate(notes)
			if err != nil {
				log.Warn().Msgf("note handlers: save notes: %v", err)
				return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Can't create notes", nil))
			}
			files := form.File["files"]
			log.Info().Msgf("notes: %v", files)

			err := noteService.UploadImages(files)
			if err != nil {
				// TODO: master error handling here
				return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Can't upload images", nil))
			}

			err = noteService.BulkCreateOrUpdate(notes)

			if err != nil {
				return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Can't save notes", nil))
			}

			log.Info().Msg("Okay, notes should be saved...")
			return c.Status(http.StatusOK).JSON(nil)
		}

		return c.Status(http.StatusInternalServerError).JSON(NewHttpError("Can't parse multipart form data", nil))

	})

}
