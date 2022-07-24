package repositories

import (
	"context"
	"fmt"
	"moonbrain/app/models"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
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
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.D{{"email", user.Email}, {"provider", user.Provider}}
	options := options.Update().SetUpsert(true)
	_, err := u.collection.UpdateOne(ctx, filter, bson.D{{"$set", user}}, options)
	if err != nil {
		return nil, fmt.Errorf("user repository: create or update user: update one user: %v", err)
	}
	return &user, nil
}

func (u *UserRepository) GetUser(user *models.User) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"email": user.Email}
	err := u.collection.FindOne(ctx, filter).Decode(user)
	if err != nil {
		return nil, fmt.Errorf("user repository: get user: find one user: %v", err)
	}
	return user, nil
}

func (u *UserRepository) FindUserByToken(token string) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	log.Info().Msgf("token: %s", token)
	filter := bson.M{"token": token}
	user := models.User{}
	err := u.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return nil, fmt.Errorf("user repository: find user by token: find one user: %v", err)
	}
	return &user, nil
}

func (u *UserRepository) CreateAPIToken(user *models.User) (*models.AccessToken, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"_id": user.ID}
	token := uuid.New()
	accessToken := models.AccessToken{
		ID:          primitive.NewObjectID(),
		Permissions: "w",
		Token:       token.String(),
	}
	update := bson.M{"$push": bson.M{"apiTokens": accessToken}}

	_, err := u.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return nil, fmt.Errorf("user repository: create api token: update one user: %v", err)
	}
	return &accessToken, nil
}

// Delete user API token from list of tokens
func (u *UserRepository) DeleteAPIToken(user *models.User, tokenID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"_id": user.ID}
	id, err := primitive.ObjectIDFromHex(tokenID)
	if err != nil {
		return fmt.Errorf("user repository: delete api token: convert token id: %v", err)
	}
	update := bson.M{"$pull": bson.M{"apiTokens": bson.M{"_id": id}}}
	res, err := u.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("user repository: delete api token: update one user: %v", err)
	}
	log.Info().Msgf("user repository: delete api token: update one user: %v", res)
	return nil
}
