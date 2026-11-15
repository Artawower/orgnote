package repositories

import (
	"context"
	"errors"
	"fmt"
	"orgnote/app/models"
	"time"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type StorageUsageReconcileResult struct {
	MatchedUsers int64
	UpdatedUsers int64
}

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
	foundUser, _ := u.GetUser(&user)

	if foundUser != nil {
		updatedUser, err := u.UpdateAuthInfo(user)
		if err != nil {
			return nil, fmt.Errorf("user repository: create or update user: update auth info: %v", err)
		}
		return updatedUser, nil
	}
	createdUser, err := u.Create(user)
	if err != nil {
		return nil, fmt.Errorf("user repository: create or update user: create user: %v", err)
	}

	return createdUser, nil
}

func (u *UserRepository) UpdateAuthInfo(user models.User) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"externalId": user.ExternalID, "provider": user.Provider}

	_, err := u.collection.UpdateOne(ctx, filter, bson.D{
		bson.E{Key: "$set", Value: bson.D{
			bson.E{Key: "token", Value: user.Token},
			bson.E{Key: "refreshToken", Value: user.RefreshToken},
			bson.E{Key: "tokenExpiration", Value: user.TokenExpirationDate},
			bson.E{Key: "profileUrl", Value: user.ProfileURL},
		}},
	})

	if err != nil {
		return nil, fmt.Errorf("user repository: update user: update one user: %v", err)
	}

	updatedUser, err := u.GetUser(&user)

	if err != nil {
		return nil, fmt.Errorf("user repository: update user: get user: %v", err)
	}

	return updatedUser, nil
}

func (u *UserRepository) Create(user models.User) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	user.ID = primitive.NewObjectID()
	_, err := u.collection.InsertOne(ctx, user)

	if err != nil {
		return nil, fmt.Errorf("user repository: create user: insert one user: %v", err)
	}

	createdUser, err := u.GetUser(&user)

	if err != nil {
		return nil, fmt.Errorf("user repository: create user: get user: %v", err)
	}
	return createdUser, nil
}

func (u *UserRepository) GetUser(user *models.User) (*models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	filter := bson.M{"externalId": user.ExternalID, "provider": user.Provider}
	err := u.collection.FindOne(ctx, filter).Decode(user)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
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
	if err := cur.Err(); err != nil {
		return nil, fmt.Errorf("user repository: get users by ids: cursor error: %v", err)
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

func (u *UserRepository) GetAll() ([]models.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	users := []models.User{}
	cur, err := u.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, fmt.Errorf("user repository: get all: find users: %v", err)
	}
	defer cur.Close(ctx)
	for cur.Next(ctx) {
		var user models.User
		err := cur.Decode(&user)
		if err != nil {
			return nil, fmt.Errorf("user repository: get all: decode user: %v", err)
		}
		users = append(users, user)
	}
	if err := cur.Err(); err != nil {
		return nil, fmt.Errorf("user repository: get all: cursor error: %v", err)
	}
	return users, nil
}

func (u *UserRepository) UpdateSpaceLimitInfo(usedID string, usedSpace *int64, spaceLimit *int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(usedID)

	if err != nil {
		return fmt.Errorf("note repository: update used space: convert id: %v", err)
	}

	filter := bson.M{"_id": objID}

	updatedModel := bson.M{}
	if usedSpace != nil {
		updatedModel["usedSpace"] = usedSpace
	}
	if spaceLimit != nil {
		updatedModel["spaceLimit"] = spaceLimit
	}
	update := bson.M{"$set": updatedModel}

	_, err = u.collection.UpdateOne(ctx, filter, update)

	if err != nil {
		return fmt.Errorf("note repository: update used space: failed to update: %v", err)
	}

	return nil
}

func (u *UserRepository) EnsureStorageUsage(userID primitive.ObjectID) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	hasCounter, err := u.hasStorageUsage(ctx, userID)
	if err != nil || hasCounter {
		return err
	}

	usedSpace, err := u.computeStorageUsage(ctx, userID)
	if err != nil {
		return fmt.Errorf("user repository: ensure storage usage: compute: %v", err)
	}

	filter := bson.M{"_id": userID, "usedSpace": bson.M{"$exists": false}}
	update := bson.M{"$set": bson.M{"usedSpace": usedSpace}}
	_, err = u.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("user repository: ensure storage usage: update: %v", err)
	}
	return nil
}

func (u *UserRepository) hasStorageUsage(ctx context.Context, userID primitive.ObjectID) (bool, error) {
	var result struct {
		UsedSpace *int64 `bson:"usedSpace"`
	}
	err := u.collection.FindOne(
		ctx,
		bson.M{"_id": userID},
		options.FindOne().SetProjection(bson.M{"usedSpace": 1}),
	).Decode(&result)
	if err != nil {
		return false, fmt.Errorf("user repository: ensure storage usage: find user: %v", err)
	}
	return result.UsedSpace != nil, nil
}

func (u *UserRepository) computeStorageUsage(ctx context.Context, userID primitive.ObjectID) (int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"userId": userID, "deletedAt": nil}}},
		{{Key: "$group", Value: bson.M{
			"_id":       nil,
			"totalSize": bson.M{"$sum": "$fileSize"},
		}}},
	}

	cur, err := u.db.Collection("file_metadata").Aggregate(ctx, pipeline)
	if err != nil {
		return 0, err
	}
	defer cur.Close(ctx)

	var result struct {
		TotalSize int64 `bson:"totalSize"`
	}
	if cur.Next(ctx) {
		if err := cur.Decode(&result); err != nil {
			return 0, err
		}
	}
	return result.TotalSize, cur.Err()
}

func (u *UserRepository) ReserveStorage(userID primitive.ObjectID, bytes int64, spaceLimit int64) (bool, error) {
	if bytes <= 0 {
		return true, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{
		"_id": userID,
		"$expr": bson.M{"$lte": bson.A{
			bson.M{"$add": bson.A{bson.M{"$ifNull": bson.A{"$usedSpace", 0}}, bytes}},
			spaceLimit,
		}},
	}
	update := bson.M{"$inc": bson.M{"usedSpace": bytes}}
	result, err := u.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return false, fmt.Errorf("user repository: reserve storage: %v", err)
	}
	return result.MatchedCount > 0, nil
}

func (u *UserRepository) ReconcileStorageUsage() (*StorageUsageReconcileResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	usageByUser, err := u.computeAllStorageUsage(ctx)
	if err != nil {
		return nil, fmt.Errorf("user repository: reconcile storage usage: compute: %v", err)
	}

	userIDs, err := u.getAllUserIDs(ctx)
	if err != nil {
		return nil, fmt.Errorf("user repository: reconcile storage usage: users: %v", err)
	}

	return u.updateStorageUsageCounters(ctx, userIDs, usageByUser)
}

func (u *UserRepository) computeAllStorageUsage(ctx context.Context) (map[primitive.ObjectID]int64, error) {
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"deletedAt": nil}}},
		{{Key: "$group", Value: bson.M{"_id": "$userId", "totalSize": bson.M{"$sum": "$fileSize"}}}},
	}
	cur, err := u.db.Collection("file_metadata").Aggregate(ctx, pipeline)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	return decodeStorageUsageCounters(ctx, cur)
}

func decodeStorageUsageCounters(ctx context.Context, cur *mongo.Cursor) (map[primitive.ObjectID]int64, error) {
	usageByUser := map[primitive.ObjectID]int64{}
	for cur.Next(ctx) {
		var usage storageUsageCounter
		if err := cur.Decode(&usage); err != nil {
			return nil, err
		}
		usageByUser[usage.UserID] = usage.TotalSize
	}
	return usageByUser, cur.Err()
}

type storageUsageCounter struct {
	UserID    primitive.ObjectID `bson:"_id"`
	TotalSize int64              `bson:"totalSize"`
}

func (u *UserRepository) getAllUserIDs(ctx context.Context) ([]primitive.ObjectID, error) {
	cur, err := u.collection.Find(ctx, bson.M{}, options.Find().SetProjection(bson.M{"_id": 1}))
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	return decodeUserIDs(ctx, cur)
}

func decodeUserIDs(ctx context.Context, cur *mongo.Cursor) ([]primitive.ObjectID, error) {
	userIDs := []primitive.ObjectID{}
	for cur.Next(ctx) {
		var user struct {
			ID primitive.ObjectID `bson:"_id"`
		}
		if err := cur.Decode(&user); err != nil {
			return nil, err
		}
		userIDs = append(userIDs, user.ID)
	}
	return userIDs, cur.Err()
}

func (u *UserRepository) updateStorageUsageCounters(
	ctx context.Context,
	userIDs []primitive.ObjectID,
	usageByUser map[primitive.ObjectID]int64,
) (*StorageUsageReconcileResult, error) {
	if len(userIDs) == 0 {
		return &StorageUsageReconcileResult{}, nil
	}
	models := storageUsageWriteModels(userIDs, usageByUser)
	result, err := u.collection.BulkWrite(ctx, models, options.BulkWrite().SetOrdered(false))
	if err != nil {
		return nil, err
	}
	return &StorageUsageReconcileResult{MatchedUsers: result.MatchedCount, UpdatedUsers: result.ModifiedCount}, nil
}

func storageUsageWriteModels(
	userIDs []primitive.ObjectID,
	usageByUser map[primitive.ObjectID]int64,
) []mongo.WriteModel {
	models := make([]mongo.WriteModel, 0, len(userIDs))
	for _, userID := range userIDs {
		models = append(models, storageUsageWriteModel(userID, usageByUser[userID]))
	}
	return models
}

func storageUsageWriteModel(userID primitive.ObjectID, usedSpace int64) mongo.WriteModel {
	return mongo.NewUpdateOneModel().
		SetFilter(bson.M{"_id": userID}).
		SetUpdate(bson.M{"$set": bson.M{"usedSpace": usedSpace}})
}

func (u *UserRepository) ReleaseStorage(userID primitive.ObjectID, bytes int64) error {
	if bytes <= 0 {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"_id": userID}
	_, err := u.collection.UpdateOne(ctx, filter, releaseStorageUpdatePipeline(bytes))
	if err != nil {
		return fmt.Errorf("user repository: release storage: %v", err)
	}
	return nil
}

func releaseStorageUpdatePipeline(bytes int64) mongo.Pipeline {
	return mongo.Pipeline{
		{{Key: "$set", Value: bson.M{"usedSpace": bson.M{"$max": bson.A{
			int64(0),
			bson.M{"$subtract": bson.A{bson.M{"$ifNull": bson.A{"$usedSpace", int64(0)}}, bytes}},
		}}}}},
	}
}

func (u *UserRepository) SetActivationKey(userID string, activationKey string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(userID)

	if err != nil {
		return fmt.Errorf("note repository: set active status: convert id: %v", err)
	}

	filter := bson.M{"_id": objID}

	update := bson.M{"$set": bson.M{"active": activationKey}}

	_, err = u.collection.UpdateOne(ctx, filter, update)

	if err != nil {
		return fmt.Errorf("note repository: set active status: failed to update: %v", err)
	}

	return nil
}

func (u *UserRepository) UpdateActiveAndSpaceLimit(userID string, active *string, spaceLimit *int64) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return fmt.Errorf("user repository: update active and space limit: convert id: %v", err)
	}

	filter := bson.M{"_id": objID}
	updatedModel := bson.M{}
	if active != nil {
		updatedModel["active"] = *active
	}
	if spaceLimit != nil {
		updatedModel["spaceLimit"] = *spaceLimit
	}
	if len(updatedModel) == 0 {
		return nil
	}

	update := bson.M{"$set": updatedModel}
	_, err = u.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("user repository: update active and space limit: failed to update: %v", err)
	}

	return nil
}

func (u *UserRepository) DeleteUser(userID string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	objID, err := primitive.ObjectIDFromHex(userID)

	if err != nil {
		return fmt.Errorf("note repository: delete user: convert id: %v", err)
	}

	filter := bson.M{"_id": objID}

	_, err = u.collection.DeleteOne(ctx, filter)

	if err != nil {
		return fmt.Errorf("note repository: delete user: failed to delete: %v", err)
	}

	return nil
}
