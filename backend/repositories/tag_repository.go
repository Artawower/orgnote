package repositories

import (
	"context"
	"fmt"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type TagRepository struct {
	db         *mongo.Database
	collection *mongo.Collection
}

func NewTagRepository(db *mongo.Database) *TagRepository {
	return &TagRepository{
		db:         db,
		collection: db.Collection("tags"),
	}
}

func (t *TagRepository) GetAll() ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*2)
	defer cancel()

	cur, err := t.collection.Find(ctx, bson.D{{}})
	if err != nil {
		return nil, fmt.Errorf("tag repository: failed to get all tags: %v", err)
	}

	tags := []string{}

	for cur.Next(context.Background()) {
		var tag string
		err := cur.Decode(&tag)
		if err != nil {
			return nil, fmt.Errorf("tag repository: failed to decode tag: %v", err)
		}
		tags = append(tags, tag)
	}
	return tags, nil
}

type TagModel struct {
	ID  string `bson:"_id"`
	Tag string `bson:"tag"`
}

func (t *TagRepository) BulkUpsert(tags []string) error {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*60)
	defer cancel()

	tagsModels := make([]mongo.WriteModel, len(tags))
	for i, tag := range tags {
		tagsModels[i] = mongo.
			NewUpdateOneModel().
			SetFilter(bson.M{"_id": tag}).
			SetUpdate(bson.M{"$set": TagModel{ID: tag, Tag: tag}}).
			SetUpsert(true)
	}

	if _, err := t.collection.BulkWrite(ctx, tagsModels); err != nil {
		return fmt.Errorf("tag repository: failed to create tags: %w", err)
	}

	return nil
}
