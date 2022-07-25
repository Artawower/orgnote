package repositories

import (
	"context"
	"errors"
	"fmt"
	"moonbrain/app/models"
	"reflect"
	"time"

	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type NoteRepository struct {
	db         *mongo.Database
	collection *mongo.Collection
}

func NewNoteRepository(db *mongo.Database) *NoteRepository {
	return &NoteRepository{db: db, collection: db.Collection("notes")}
}

func (a *NoteRepository) GetNotes() ([]models.Note, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	notes := []models.Note{}

	cur, err := a.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("note repository: failed to get notes: %v", err)
	}

	for cur.Next(ctx) {
		var note models.Note
		err := cur.Decode(&note)
		if err != nil {
			return nil, fmt.Errorf("note repository: failed to decode note: %v", err)
		}
		notes = append(notes, note)
	}

	return notes, nil
}

func (a *NoteRepository) AddNote(note models.Note) error {
	return errors.New("not implemented")
}

func (a *NoteRepository) UpdateNote(article models.Note) error {
	return errors.New("not implemented")
}

func (a *NoteRepository) BulkUpsert(notes []models.Note) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	notesModels := make([]mongo.WriteModel, len(notes))

	for i, note := range notes {
		notesModels[i] = mongo.NewUpdateOneModel().
			SetFilter(bson.M{"_id": note.ID}).
			SetUpdate(bson.M{"$set": note}).
			SetUpsert(true)
	}

	d, err := a.collection.BulkWrite(ctx, notesModels)
	log.Info().Msgf("note repository: bulk upserted %v", d)
	if err != nil {
		return fmt.Errorf("note repository: failed to bulk upsert notes: %v", err)
	}
	return nil
}

func (a *NoteRepository) GetNote(id string) (*models.Note, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res := a.collection.FindOne(ctx, bson.M{"_id": id})
	if err := res.Err(); err != nil {
		return nil, fmt.Errorf("note repository: failed to get note: %v", err)
	}

	var note models.Note
	err := res.Decode(&note)
	if err != nil {
		return nil, fmt.Errorf("note repository: failed to decode note: %v", err)
	}
	log.Info().Msgf("note repository: got note: %v", reflect.TypeOf(note.Content).Name())

	return &note, nil
}
