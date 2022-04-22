package services

import (
	"moonbrain/models"
	"moonbrain/repositories"
)

type NoteService struct {
	noteRepository *repositories.NoteRepository
}

func NewNoteService(repositoriesRepository *repositories.NoteRepository) *NoteService {
	return &NoteService{noteRepository: repositoriesRepository}
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
	for _, note := range notes {
		if note.ID != "" {
			filteredNotesWithID = append(filteredNotesWithID, note)
		}
	}
	return a.noteRepository.BulkUpsert(filteredNotesWithID)
}

func (a *NoteService) GetNotes() ([]models.Note, error) {
	// TODO: real query
	return a.noteRepository.GetNotes()
}

func (a *NoteService) GetNote(id string) (models.Note, error) {
	return a.noteRepository.GetNote(id)
}
