package repositories

import (
	"context"
	"fmt"
	"moonbrain/app/models"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type UserRepository struct {
	db         *mongo.Database
	collection *mongo.Collection
}

func NewUserRepository(db *mongo.Database) *UserRepository {
	return &UserRepository{
		db:         db,
		collection: db.Collection("users"),
	}
}

func (u *UserRepository) CreateOrGet(user models.User) (*models.User, error) {
	// TODO: just upsert
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.D{{"email", user.Email}, {"provider", user.Provider}}
	options := options.Update().SetUpsert(true)

	// err := u.collection.FindOne(ctx, bson.M{"email": user.Email, "provider": user.Provider}).Decode(result)
	// if err != nil && err != mongo.ErrNoDocuments {
	// 	return nil, fmt.Errorf("user repository: create or get user: find user: %v", err)
	// }
	// if result != nil {
	// 	return result, nil
	// }
	_, err := u.collection.UpdateOne(ctx, filter, bson.D{{"$set", user}}, options)
	if err != nil {
		return nil, fmt.Errorf("user repository: create or update user: update one user: %v", err)
	}
	return &user, nil
}
