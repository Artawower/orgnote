package handlers

import (
	"encoding/json"
	"moonbrain/app/models"
	"moonbrain/app/services"
	"net/http"

	_ "moonbrain/app/docs"

	fiber "github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

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

type NoteHandlers struct {
	noteService *services.NoteService
}

// TODO: master wait when swago will support generics :(

// GetNote godoc
// @Summary      Get note
// @Description  get note by id
// @Tags         notes
// @Accept       json
// @Produce      json
// @Param        id   path      int  true  "Account ID"
// @Success      200  {object}  HttpResponse<models.Note>
// @Failure      400  {object}  any
// @Failure      404  {object}  any
// @Failure      500  {object}  any
// @Router       /notes/{id}  [get]
func (h *NoteHandlers) GetNote(c *fiber.Ctx) error {
	noteID := c.Params("id")
	ctxUser := c.Locals("user").(*models.User)

	notes, err := h.noteService.GetNote(noteID, ctxUser.ID.Hex())
	if err != nil {
		log.Info().Err(err).Msg("note handler: get note: get by id")
		return c.Status(http.StatusInternalServerError).JSON(NewHttpError[any]("Couldn't get note, something went wrong", nil))
	}
	if notes == nil {
		return c.Status(http.StatusNotFound).JSON(NewHttpReponse[any, any](nil, nil))
	}
	return c.Status(http.StatusOK).JSON(NewHttpReponse[*models.PublicNote, any](notes, nil))
}

type GetNotesParams struct {
	UserID *string   `json:"userId"`
	Query  *string   `json:"query"`
	Limit  *int      `json:"limit"`
	Offset *int      `json:"offset"`
	Search *int      `json:"filter"`
	Tags   *[]string `json:"tags"`
}

func (h *NoteHandlers) GetNotes(c *fiber.Ctx) error {
	filter := new(GetNotesParams)

	if err := c.QueryParser(filter); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(NewHttpError("Incorrect input query", err))
	}

	ctxUser := c.Locals("user").(*models.User)

	includePrivateNotes := filter.UserID != nil && ctxUser != nil && ctxUser.ID.Hex() == *filter.UserID
	notes, err := h.noteService.GetNotes(includePrivateNotes, filter.UserID)
	if err != nil {
		log.Info().Err(err).Msgf("note handler: get notes: get %v", err)
		return c.Status(http.StatusInternalServerError).JSON(NewHttpError[any]("Couldn't get notes, something went wrong", nil))
	}
	return c.Status(http.StatusOK).JSON(NewHttpReponse[[]models.PublicNote, any](notes, nil))
}

func (h *NoteHandlers) CreateNote(c *fiber.Ctx) error {
	note := new(models.Note)

	if err := c.BodyParser(note); err != nil {
		log.Info().Err(err).Msg("note handler: post note: parse body")
		return c.Status(fiber.StatusInternalServerError).JSON(NewHttpError("Can't parse body", err))
	}

	err := h.noteService.CreateNote(*note)

	if err != nil {
		log.Info().Err(err).Msgf("note handler: post note: create %v", err)
		return c.Status(http.StatusInternalServerError).JSON(NewHttpError[any]("Can't create note:(", nil))
	}
	return c.Status(http.StatusOK).JSON(nil)
}

func (h *NoteHandlers) UpsertNotes(c *fiber.Ctx) error {

	log.Info().Msgf("content type: %v", string(c.Request().Header.ContentType()))
	if form, err := c.MultipartForm(); err == nil {

		log.Info().Err(err).Msg("note handler: put notes: parse body")
		// files := form.File["files"]
		rawNotes, ok := form.Value["notes"]
		if !ok {
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError[any]("Notes doesn't provided", nil))
		}
		notes, errors := collectNotesFromStrings(rawNotes)
		if len(errors) > 0 {
			// TODO: master add errors exposing to real life.
			log.Error().Err(err).Msg("note handler: put notes: collect notes")
		}
		user := c.Locals("user").(*models.User)
		err = h.noteService.BulkCreateOrUpdate(user.ID.Hex(), notes)
		if err != nil {
			log.Warn().Msgf("note handlers: save notes: %v", err)
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError[any]("Can't create notes", nil))
		}
		files := form.File["files"]
		log.Info().Msgf("notes: %v", files)

		err := h.noteService.UploadImages(files)
		if err != nil {
			// TODO: master error handling here
			return c.Status(http.StatusInternalServerError).JSON(NewHttpError[any]("Can't upload images", nil))
		}
		return c.Status(http.StatusOK).JSON(nil)
	}

	return c.Status(http.StatusInternalServerError).JSON(NewHttpError[any]("Can't parse multipart form data", nil))

}

func RegisterNoteHandler(app fiber.Router, noteService *services.NoteService, authMiddleware func(*fiber.Ctx) error) {
	noteHandlers := &NoteHandlers{
		noteService: noteService,
	}

	app.Get("/notes/:id", noteHandlers.GetNote)
	app.Get("/notes", noteHandlers.GetNotes)
	app.Post("/notes", authMiddleware, noteHandlers.CreateNote)
	app.Put("/notes/bulk-upsert", authMiddleware, noteHandlers.UpsertNotes)

}
