package services

import (
	"fmt"
	"io/ioutil"
	"mime/multipart"
	"moonbrain/app/models"
	"moonbrain/app/repositories"
	"path"
	"time"

	"github.com/rs/zerolog/log"
)

type NoteService struct {
	noteRepository *repositories.NoteRepository
	userRepository *repositories.UserRepository
	tagRepository  *repositories.TagRepository
	imageDir       string
}

func NewNoteService(
	repositoriesRepository *repositories.NoteRepository,
	userRepository *repositories.UserRepository,
	tagRepository *repositories.TagRepository,
	imageDir string,
) *NoteService {
	return &NoteService{
		noteRepository: repositoriesRepository,
		tagRepository:  tagRepository,
		userRepository: userRepository,
		imageDir:       imageDir,
	}
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

func (a *NoteService) BulkCreateOrUpdate(userID string, notes []models.Note) error {
	filteredNotesWithID := []models.Note{}
	tags := []string{}
	for _, note := range notes {
		if note.ID != "" {
			note.AuthorID = userID
			filteredNotesWithID = append(filteredNotesWithID, models.Note{
				ID:        note.ID,
				AuthorID:  userID,
				Content:   note.Content,
				Meta:      note.Meta,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
				Views:     0,
				Likes:     0,
			})
			tags = append(tags, note.Meta.Tags...)
		}
	}
	// TODO: master add transaction here
	err := a.noteRepository.BulkUpsert(userID, filteredNotesWithID)
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

// TODO: master
func (a *NoteService) GetNotes(includePrivate bool, filter models.NoteFilter) (*models.Paginated[models.PublicNote], error) {
	notes, err := a.noteRepository.GetNotes(includePrivate, filter)
	if err != nil {
		return nil, fmt.Errorf("note service: get notes: could not get notes: %v", err)
	}

	count, err := a.noteRepository.NotesCount(includePrivate, filter)
	if err != nil {
		return nil, fmt.Errorf("note service: upload images: could not upload image: %v", err)
	}

	publicNotes := []models.PublicNote{}

	usersMap, err := a.getNotesUsers(notes)
	if err != nil {
		return nil, fmt.Errorf("note service: get notes: could not get users: %v", err)
	}

	for _, note := range notes {
		u := usersMap[note.AuthorID]
		publicNote := &models.PublicNote{
			ID:      note.ID,
			Content: note.Content,
			Meta:    note.Meta,
			Author:  *mapToPublicUserInfo(&u),
		}
		publicNotes = append(publicNotes, *publicNote)
	}

	return &models.Paginated[models.PublicNote]{
		Limit:  *filter.Limit,
		Offset: *filter.Offset,
		Total:  count,
		Data:   publicNotes,
	}, nil
}

func (a *NoteService) getNotesUsers(notes []models.Note) (map[string]models.User, error) {
	if len(notes) == 0 {
		return map[string]models.User{}, nil
	}
	userIDSet := make(map[string]struct{})

	for _, note := range notes {
		userIDSet[note.AuthorID] = struct{}{}
	}

	userIDs := []string{}
	for k := range userIDSet {
		userIDs = append(userIDs, k)
	}

	users, err := a.userRepository.GetUsersByIDs(userIDs)

	if err != nil {
		return nil, fmt.Errorf("note service: get notes users: could not get users: %v", err)
	}

	usersMap := make(map[string]models.User)

	for _, u := range users {
		usersMap[u.ID.Hex()] = u
	}

	return usersMap, nil
}

func (a *NoteService) GetNote(id string, userID string) (*models.PublicNote, error) {
	note, err := a.noteRepository.GetNote(id, userID)
	if err != nil {
		return nil, fmt.Errorf("note service: get note: could not get note: %v", err)
	}
	if note == nil {
		return nil, nil
	}
	user, err := a.userRepository.GetByID(note.AuthorID)
	if err != nil {
		return nil, fmt.Errorf("note service: get note: could not get user: %v", err)
	}
	u := mapToPublicUserInfo(user)
	// TODO: master add mapper function
	return &models.PublicNote{
		ID:      note.ID,
		Content: note.Content,
		Meta:    note.Meta,
		Author:  *u,
	}, nil
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
