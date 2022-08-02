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
	"go.mongodb.org/mongo-driver/mongo/options"
)

type NoteRepository struct {
	db         *mongo.Database
	collection *mongo.Collection
}

func NewNoteRepository(db *mongo.Database) *NoteRepository {
	noteRepo := &NoteRepository{db: db, collection: db.Collection("notes")}
	noteRepo.initIndexes()
	return noteRepo
}

func (a *NoteRepository) initIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	_, err := a.collection.Indexes().DropAll(ctx)
	if err != nil {
		log.Error().Msgf("note repository: failed to drop indexes: %v", err)
	}
	model := []mongo.IndexModel{
		{Keys: bson.D{
			bson.E{Key: "meta.title", Value: "text"},
			bson.E{Key: "meta.description", Value: "text"},
			bson.E{Key: "meta.tags", Value: "text"},
		}}}

	name, err := a.collection.Indexes().CreateMany(context.TODO(), model)
	if err != nil {
		panic(err)
	}
	log.Info().Msgf("note repository: created indexes: %v", name)
}

func (a *NoteRepository) GetNotes(includePrivate bool, f models.NoteFilter) ([]models.Note, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	notes := []models.Note{}
	filter := a.getNotesFilter(includePrivate, f)

	limit, offset := a.getLimitOffset(f)
	findOptions := options.FindOptions{
		Skip:  &offset,
		Limit: &limit,
	}

	findOptions.SetSort(bson.D{bson.E{Key: "createdAt", Value: -1}})

	cur, err := a.collection.Find(ctx, filter, &findOptions)
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

func (a *NoteRepository) getNotesFilter(includePrivate bool, f models.NoteFilter) bson.M {
	filter := bson.M{}
	if includePrivate == false {
		filter["meta.published"] = true
	}
	if f.UserID != nil {
		filter["authorId"] = *f.UserID
	}

	if f.SearchText != nil && *f.SearchText != "" {
		filter["$text"] = bson.D{bson.E{Key: "$search", Value: *f.SearchText}}
	}
	return filter
}

func (a *NoteRepository) NotesCount(includePrivate bool, f models.NoteFilter) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filters := a.getNotesFilter(includePrivate, f)
	count, err := a.collection.CountDocuments(ctx, filters)
	if err != nil {
		return 0, fmt.Errorf("note repository: failed to get notes count: %v", err)
	}
	return count, nil
}

func (a *NoteRepository) getLimitOffset(noteFilter models.NoteFilter) (int64, int64) {
	limit := int64(10)
	offset := int64(0)

	if noteFilter.Limit != nil {
		limit = *noteFilter.Limit
	}
	if noteFilter.Offset != nil {
		offset = *noteFilter.Offset
	}
	return limit, offset
}

func (a *NoteRepository) AddNote(note models.Note) error {
	return errors.New("not implemented")
}

func (a *NoteRepository) UpdateNote(article models.Note) error {
	return errors.New("not implemented")
}

func (a *NoteRepository) BulkUpsert(userID string, notes []models.Note) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	notesModels := make([]mongo.WriteModel, len(notes))

	for i, note := range notes {
		// TODO: master id should be unique for each user
		notesModels[i] = mongo.NewUpdateOneModel().
			SetFilter(bson.M{"_id": note.ID}).
			SetUpdate(bson.M{
				"$set":         a.getUpdateNote(note),
				"$setOnInsert": bson.M{"createdAt": note.CreatedAt},
			}).
			SetUpsert(true)
	}

	_, err := a.collection.BulkWrite(ctx, notesModels)
	if err != nil {
		return fmt.Errorf("note repository: failed to bulk upsert notes: %v", err)
	}
	return nil
}

func (a *NoteRepository) getUpdateNote(note models.Note) bson.M {
	update := bson.M{
		"_id":       note.ID,
		"authorId":  note.AuthorID,
		"content":   note.Content,
		"meta":      note.Meta,
		"updatedAt": note.CreatedAt,
		"views":     note.Views,
		"likes":     note.Likes,
	}

	return update
}

func (a *NoteRepository) GetNote(id string, authorID string) (*models.Note, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res := a.collection.FindOne(
		ctx,
		bson.M{
			"_id": id,
			"$or": bson.A{
				bson.M{"authorId": authorID},
				bson.M{"meta.published": true}}})

	err := res.Err()

	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}

	if err != nil {
		return nil, fmt.Errorf("note repository: failed to get note: %v", err)
	}

	var note models.Note
	err = res.Decode(&note)
	if err != nil {
		return nil, fmt.Errorf("note repository: failed to decode note: %v", err)
	}
	log.Info().Msgf("note repository: got note: %v", reflect.TypeOf(note.Content).Name())

	return &note, nil
}
