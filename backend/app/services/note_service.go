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

func (a *NoteService) BulkCreateOrUpdate(userId string, notes []models.Note) error {
	filteredNotesWithID := []models.Note{}
	tags := []string{}
	for _, note := range notes {
		if note.ID != "" {
			note.AuthorID = userId
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

// type GetNotesParams struct {
// 	User string
// }

func (a *NoteService) GetNotes() ([]models.PublicNote, error) {
	notes, err := a.noteRepository.GetNotes()
	if err != nil {
		return nil, fmt.Errorf("note service: get notes: could not get notes: %v", err)
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

	return publicNotes, nil
}

func (a *NoteService) getNotesUsers(notes []models.Note) (map[string]models.User, error) {
	userIDSet := make(map[string]struct{})

	for _, note := range notes {
		userIDSet[note.AuthorID] = struct{}{}
	}

	userIDs := []string{}
	for k := range userIDSet {
		userIDs = append(userIDs, k)
	}

	users, err := a.userRepository.GetUsersByIDs(userIDs)
	log.Err(err).Msgf("note service: get notes users: could not get users!!!!: %v", err)

	if err != nil {
		return nil, fmt.Errorf("note service: get notes users: could not get users: %v", err)
	}

	usersMap := make(map[string]models.User)

	for _, u := range users {
		usersMap[u.ID.Hex()] = u
	}

	return usersMap, nil
}

// users := []models.User{}
// for _, note := range notes {
// 	user, err := a.userRepository.GetByID(note.AuthorID)
// 	if err != nil {
// 		return nil, fmt.Errorf("note service: get notes users: could not get user: %v", err)
// 	}
// 	users = append(users, note.Author)
// }
// return users

func (a *NoteService) GetNote(id string) (*models.PublicNote, error) {
	note, err := a.noteRepository.GetNote(id)
	if err != nil {
		return nil, fmt.Errorf("note service: get note: could not get note: %v", err)
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
