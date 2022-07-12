package services

import (
	"fmt"
	"io/ioutil"
	"mime/multipart"
	"moonbrain/app/models"
	"moonbrain/app/repositories"
	"path"

	"github.com/rs/zerolog/log"
)

type NoteService struct {
	noteRepository *repositories.NoteRepository
	tagRepository  *repositories.TagRepository
	imageDir       string
}

func NewNoteService(repositoriesRepository *repositories.NoteRepository, tagRepository *repositories.TagRepository, imageDir string) *NoteService {
	return &NoteService{noteRepository: repositoriesRepository, tagRepository: tagRepository, imageDir: imageDir}
}

func (a *NoteService) CreateNote(note models.Note) error {
	err := a.noteRepository.AddNote(note)
	if err != nil {
		return err
	}
	return nil
}

func (a *NoteService) UpdateNote(note models.Note) error {
	err := a.noteRepository.UpdateNote(note)
	if err != nil {
		return err
	}
	return nil
}

func (a *NoteService) BulkCreateOrUpdate(notes []models.Note) error {
	filteredNotesWithID := []models.Note{}
	tags := []string{}
	for _, note := range notes {
		if note.ID != "" {
			filteredNotesWithID = append(filteredNotesWithID, note)
			tags = append(tags, note.Meta.Tags...)
		}
	}
	// TODO: master add transaction here
	err := a.noteRepository.BulkUpsert(filteredNotesWithID)
	if err != nil {
		return fmt.Errorf("note service: bulk create or update: could not bulk upsert notes: %v", err)
	}
	if len(tags) == 0 {
		return nil
	}
	err = a.tagRepository.BulkUpsert(tags)
	if err != nil {
		return fmt.Errorf("note service: bulk create or update: could not bulk upsert tags: %v", err)
	}

	return nil
}

func (a *NoteService) GetNotes() ([]models.Note, error) {
	return a.noteRepository.GetNotes()
}

func (a *NoteService) GetNote(id string) (*models.Note, error) {
	return a.noteRepository.GetNote(id)
}

func (a *NoteService) UploadImages(fileHeaders []*multipart.FileHeader) error {
	for _, fh := range fileHeaders {
		err := a.UploadImage(fh)
		if err != nil {
			log.Err(err).Msg("note service: upload images: could not upload image")
			// TODO: add aggregation of errors
			continue
		}
	}
	return nil
}

func (a *NoteService) UploadImage(fileHeader *multipart.FileHeader) error {
	file, err := fileHeader.Open()
	if err != nil {
		return fmt.Errorf("note service: upload image: could not open uploaded file: %v", err)
	}
	defer file.Close()

	fileData, err := ioutil.ReadAll(file)
	if err != nil {
		return fmt.Errorf("note service: upload image: could not read uploaded file: %v", err)
	}
	err = ioutil.WriteFile(path.Join(a.imageDir, fileHeader.Filename), fileData, 0644)
	if err != nil {
		return fmt.Errorf("note service: upload image: could not write file: %v", err)
	}
	return nil
}
