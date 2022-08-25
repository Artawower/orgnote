package repositories

import (
	"context"
	"errors"
	"fmt"
	"moonbrain/app/models"
	"time"

	"github.com/google/uuid"
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

func (u *UserRepository) GetByID(id string) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("user repository: get by id: convert id: %v", err)
	}
	filter := bson.M{"_id": objID}
	user := models.User{}
	err = u.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return nil, fmt.Errorf("user repository: find user by id: find one user: %v", err)
	}
	return &user, nil
}

func (u *UserRepository) GetUsersByIDs(userIDs []string) ([]models.User, error) {
	objectUserIDs := make([]primitive.ObjectID, len(userIDs))
	for i, id := range userIDs {
		objID, err := primitive.ObjectIDFromHex(id)
		if err != nil {
			return nil, fmt.Errorf("user repository: get users by ids: convert id - %s: %v", id, err)
		}
		objectUserIDs[i] = objID
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"_id": bson.M{"$in": objectUserIDs}}
	users := []models.User{}
	cur, err := u.collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("user repository: get users by ids: find users: %v", err)
	}
	defer cur.Close(ctx)
	for cur.Next(ctx) {
		var user models.User
		err := cur.Decode(&user)
		if err != nil {
			return nil, fmt.Errorf("user repository: get users by ids: decode user: %v", err)
		}
		users = append(users, user)
	}
	return users, nil
}

func (u *UserRepository) FindUserByToken(token string) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"$or": bson.A{
		bson.M{"token": token},
		bson.M{"apiTokens": bson.M{"$elemMatch": bson.M{"token": token}}},
	}}
	user := models.User{}
	err := u.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return nil, fmt.Errorf("user repository: find user by token: find one user: %v", err)
	}
	return &user, nil
}

func (u *UserRepository) GetAPITokens(userID string) ([]models.APIToken, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("user repository: get api tokens: convert user id: %v", err)
	}

	filter := bson.M{"_id": userObjID}
	user := models.User{}
	err = u.collection.FindOne(ctx, filter).Decode(&user)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return []models.APIToken{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("user repository: get api tokens: find one user: %v", err)
	}
	return user.APITokens, nil
}

func (u *UserRepository) CreateAPIToken(user *models.User) (*models.APIToken, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"_id": user.ID}
	token := uuid.New()
	accessToken := models.APIToken{
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

	_, err = u.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("user repository: delete api token: update one user: %v", err)
	}

	return nil
}

func (u *UserRepository) GetNoteGraph(userID string) (*models.NoteGraph, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	userObjID, err := primitive.ObjectIDFromHex(userID)

	if err != nil {
		return nil, fmt.Errorf("user repository: get note graph: convert user id: %v", err)
	}

	filter := bson.M{"_id": userObjID}
	user := models.User{}
	err = u.collection.FindOne(ctx, filter).Decode(&user)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("user repository: get note graph: find one user: %v", err)
	}
	return &user.NoteGraph, nil
}

type GraphNoteLinks struct {
	Node  models.GraphNoteNode
	Links []models.GraphNoteLink
}

func (u *UserRepository) UpsertGraphNode(userID string, nodeLinks GraphNoteLinks) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	user, err := u.GetByID(userID)

	if err != nil {
		return fmt.Errorf("user repository: upsert graph node: can't get user: %v", err)
	}
	filter := bson.M{"_id": user.ID}

	// TODO: master make this operation as single aggregation update pipeline

	mergedLinks := u.makeUniqueNodeLinks(user.NoteGraph.Links, nodeLinks.Links)

	update := bson.M{
		"$addToSet": bson.M{"noteGraph.nodes": nodeLinks.Node},
		"$set":      bson.M{"noteGraph.links": mergedLinks},
	}

	// u.collection.Aggregate(ctx,, pipeline interface{}, opts ...*options.AggregateOptions)

	_, err = u.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("user repository: add or update graph node: upsert graph node: %v", err)
	}

	return nil
}

func (u *UserRepository) makeUniqueNodeLinks(source []models.GraphNoteLink, target []models.GraphNoteLink) (res []models.GraphNoteLink) {
	if len(source) == 0 {
		return target
	}

	if len(target) == 0 {
		return source
	}
	res = source

	for _, targetNode := range target {
		exist := false

		for _, srcNode := range source {
			exist = targetNode.Target == srcNode.Target && targetNode.Source == srcNode.Source
			if exist {
				break
			}
		}
		if exist {
			continue
		}
		res = append(res, targetNode)

	}
	return
}

// ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
// defer cancel()
// userObjID, err := primitive.ObjectIDFromHex(userID)
// if err != nil {
// 	return fmt.Errorf("user repository: add node: convert user id: %v", err)
// }
// filter := bson.M{"_id": userObjID}
// update := bson.M{"$push": bson.M{"noteGraph.nodes": node}}
// _, err = u.collection.UpdateOne(ctx, filter, update)
// if err != nil {
// 	return fmt.Errorf("user repository: add node: update one user: %v", err)
// }
// return nil
