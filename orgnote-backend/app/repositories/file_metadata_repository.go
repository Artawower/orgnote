package repositories

import (
	"context"
	"fmt"
	"orgnote/app/models"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"golang.org/x/text/unicode/norm"
)

type FileMetadataRepository struct {
	db         *mongo.Database
	collection *mongo.Collection
}

type GetChangesResult struct {
	Files      []models.FileMetadata
	HasMore    bool
	NextCursor *string
}

func NewFileMetadataRepository(db *mongo.Database) *FileMetadataRepository {
	repo := &FileMetadataRepository{
		db:         db,
		collection: db.Collection("file_metadata"),
	}
	repo.ensureIndexes()
	return repo
}

func (r *FileMetadataRepository) ensureIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	indexes := []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "userId", Value: 1}, {Key: "filePathLower", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys: bson.D{{Key: "userId", Value: 1}, {Key: "updatedAt", Value: 1}, {Key: "_id", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "userId", Value: 1}, {Key: "contentHash", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "userId", Value: 1}, {Key: "deletedAt", Value: 1}},
		},
	}

	if _, err := r.collection.Indexes().CreateMany(ctx, indexes); err != nil {
		log.Error().Msgf("file metadata repository: create indexes: %s", err)
	}
}

type VersionMismatchError struct {
	Path          string
	ServerVersion int
}

func (e *VersionMismatchError) Error() string {
	return "version mismatch"
}

var ErrVersionMismatch = fmt.Errorf("version mismatch")

func parseCursor(cursor string) (time.Time, primitive.ObjectID, error) {
	parts := strings.Split(cursor, "_")
	if len(parts) != 2 {
		return time.Time{}, primitive.NilObjectID, fmt.Errorf("invalid cursor format")
	}

	updatedAt, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return time.Time{}, primitive.NilObjectID, fmt.Errorf("invalid cursor time: %v", err)
	}

	id, err := primitive.ObjectIDFromHex(parts[1])
	if err != nil {
		return time.Time{}, primitive.NilObjectID, fmt.Errorf("invalid cursor id: %v", err)
	}

	return updatedAt, id, nil
}

func buildCursor(file models.FileMetadata) string {
	return file.UpdatedAt.Format(time.RFC3339Nano) + "_" + file.ID.Hex()
}

func (r *FileMetadataRepository) Upsert(userID primitive.ObjectID, filePath string, contentHash string, size int64, expectedVersion *int) (*models.FileMetadata, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	normalizedPath := normalizePath(filePath)
	pathLower := strings.ToLower(normalizedPath)

	existing, err := r.findExistingMetadata(ctx, userID, pathLower)
	if err != nil {
		return nil, fmt.Errorf("file metadata repository: upsert: find: %v", err)
	}

	if existing == nil {
		return r.createMetadata(ctx, userID, normalizedPath, pathLower, contentHash, size)
	}
	if expectedVersion == nil {
		return nil, &VersionMismatchError{
			Path:          existing.Path,
			ServerVersion: existing.Version,
		}
	}

	return r.updateMetadata(ctx, userID, pathLower, normalizedPath, contentHash, size, expectedVersion)
}

func (r *FileMetadataRepository) findExistingMetadata(ctx context.Context, userID primitive.ObjectID, pathLower string) (*models.FileMetadata, error) {
	filter := bson.M{
		"userId":        userID,
		"filePathLower": pathLower,
	}

	existing := &models.FileMetadata{}
	err := r.collection.FindOne(ctx, filter).Decode(existing)

	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return existing, nil
}

func (r *FileMetadataRepository) createMetadata(
	ctx context.Context,
	userID primitive.ObjectID,
	normalizedPath string,
	pathLower string,
	contentHash string,
	size int64,
) (*models.FileMetadata, error) {
	now := time.Now()
	metadata := models.FileMetadata{
		ID:          primitive.NewObjectID(),
		UserID:      userID,
		Path:        normalizedPath,
		ContentHash: contentHash,
		Size:        size,
		CreatedAt:   now,
		UpdatedAt:   now,
		DeletedAt:   nil,
		Version:     1,
	}

	doc := bson.M{
		"_id":           metadata.ID,
		"userId":        metadata.UserID,
		"filePath":      metadata.Path,
		"filePathLower": pathLower,
		"contentHash":   metadata.ContentHash,
		"fileSize":      metadata.Size,
		"createdAt":     metadata.CreatedAt,
		"updatedAt":     metadata.UpdatedAt,
		"deletedAt":     nil,
		"version":       metadata.Version,
	}

	_, err := r.collection.InsertOne(ctx, doc)
	if err != nil {
		return nil, fmt.Errorf("file metadata repository: create: %v", err)
	}
	return &metadata, nil
}

func (r *FileMetadataRepository) updateMetadata(
	ctx context.Context,
	userID primitive.ObjectID,
	pathLower string,
	normalizedPath string,
	contentHash string,
	size int64,
	expectedVersion *int,
) (*models.FileMetadata, error) {
	filter := bson.M{
		"userId":        userID,
		"filePathLower": pathLower,
	}

	if expectedVersion != nil {
		filter["version"] = *expectedVersion
	}

	update := bson.M{
		"$set": bson.M{
			"filePath":    normalizedPath,
			"contentHash": contentHash,
			"fileSize":    size,
			"updatedAt":   time.Now(),
			"deletedAt":   nil,
		},
		"$inc": bson.M{"version": 1},
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	result := &models.FileMetadata{}
	err := r.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(result)
	if err == mongo.ErrNoDocuments && expectedVersion != nil {
		current, findErr := r.findExistingMetadata(ctx, userID, pathLower)
		if findErr != nil || current == nil {
			return nil, ErrVersionMismatch
		}
		return nil, &VersionMismatchError{
			Path:          current.Path,
			ServerVersion: current.Version,
		}
	}
	if err != nil {
		return nil, fmt.Errorf("file metadata repository: update: %v", err)
	}

	return result, nil
}

func (r *FileMetadataRepository) GetByID(userID primitive.ObjectID, fileID primitive.ObjectID) (*models.FileMetadata, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{
		"_id":    fileID,
		"userId": userID,
	}

	result := &models.FileMetadata{}
	err := r.collection.FindOne(ctx, filter).Decode(result)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("file metadata repository: get by id: %v", err)
	}
	return result, nil
}

func (r *FileMetadataRepository) GetByPath(userID primitive.ObjectID, filePath string) (*models.FileMetadata, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	normalizedPath := normalizePath(filePath)
	pathLower := strings.ToLower(normalizedPath)

	filter := bson.M{
		"userId":        userID,
		"filePathLower": pathLower,
	}

	result := &models.FileMetadata{}
	err := r.collection.FindOne(ctx, filter).Decode(result)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("file metadata repository: get by path: %v", err)
	}
	return result, nil
}

func (r *FileMetadataRepository) SoftDelete(userID primitive.ObjectID, fileID primitive.ObjectID, expectedVersion *int) (*models.FileMetadata, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	now := time.Now()
	filter := bson.M{
		"_id":       fileID,
		"userId":    userID,
		"deletedAt": nil,
	}

	if expectedVersion != nil {
		filter["version"] = *expectedVersion
	}

	update := bson.M{
		"$set": bson.M{
			"deletedAt": now,
			"updatedAt": now,
		},
		"$inc": bson.M{"version": 1},
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	result := &models.FileMetadata{}
	err := r.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(result)
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("file metadata repository: soft delete: %v", err)
	}

	return result, nil
}

func (r *FileMetadataRepository) SoftDeleteByPath(userID primitive.ObjectID, filePath string, expectedVersion *int) (*models.FileMetadata, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	normalizedPath := normalizePath(filePath)
	pathLower := strings.ToLower(normalizedPath)

	now := time.Now()
	filter := bson.M{
		"userId":        userID,
		"filePathLower": pathLower,
		"deletedAt":     nil,
	}

	if expectedVersion != nil {
		filter["version"] = *expectedVersion
	}

	update := bson.M{
		"$set": bson.M{
			"deletedAt": now,
			"updatedAt": now,
		},
		"$inc": bson.M{"version": 1},
	}

	opts := options.FindOneAndUpdate().SetReturnDocument(options.After)
	result := &models.FileMetadata{}
	err := r.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(result)
	if err == mongo.ErrNoDocuments && expectedVersion != nil {
		current, findErr := r.findExistingMetadata(ctx, userID, pathLower)
		if findErr != nil || current == nil {
			return nil, nil
		}
		return nil, &VersionMismatchError{
			Path:          current.Path,
			ServerVersion: current.Version,
		}
	}
	if err == mongo.ErrNoDocuments {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("file metadata repository: soft delete by path: %v", err)
	}

	return result, nil
}

func (r *FileMetadataRepository) GetChanges(userID primitive.ObjectID, since time.Time, limit int, cursor *string) (*GetChangesResult, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{
		"userId":    userID,
		"updatedAt": bson.M{"$gt": since},
	}

	if cursor != nil {
		cursorTime, cursorID, err := parseCursor(*cursor)
		if err == nil {
			filter["$or"] = []bson.M{
				{"updatedAt": bson.M{"$gt": cursorTime}},
				{"updatedAt": cursorTime, "_id": bson.M{"$gt": cursorID}},
			}
			delete(filter, "updatedAt")
		}
	}

	opts := options.Find().
		SetSort(bson.D{{Key: "updatedAt", Value: 1}, {Key: "_id", Value: 1}}).
		SetLimit(int64(limit + 1))

	cur, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("file metadata repository: get changes: find: %v", err)
	}
	defer cur.Close(ctx)

	var files []models.FileMetadata
	for cur.Next(ctx) {
		var metadata models.FileMetadata
		if err := cur.Decode(&metadata); err != nil {
			return nil, fmt.Errorf("file metadata repository: get changes: decode: %v", err)
		}
		files = append(files, metadata)
	}

	if err := cur.Err(); err != nil {
		return nil, fmt.Errorf("file metadata repository: get changes: cursor error: %v", err)
	}

	hasMore := len(files) > limit
	if hasMore {
		files = files[:limit]
	}

	var nextCursor *string
	if hasMore && len(files) > 0 {
		builtCursor := buildCursor(files[len(files)-1])
		if cursor != nil && builtCursor == *cursor {
			hasMore = false
		}
		if hasMore {
			nextCursor = &builtCursor
		}
	}

	return &GetChangesResult{
		Files:      files,
		HasMore:    hasMore,
		NextCursor: nextCursor,
	}, nil
}

func (r *FileMetadataRepository) HashExists(userID primitive.ObjectID, contentHash string) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{
		"userId":      userID,
		"contentHash": contentHash,
		"deletedAt":   nil,
	}

	count, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return false, fmt.Errorf("file metadata repository: hash exists: %v", err)
	}

	return count > 0, nil
}

func (r *FileMetadataRepository) GetReferencedHashes(userID primitive.ObjectID) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{
		"userId":    userID,
		"deletedAt": nil,
	}

	hashes, err := r.collection.Distinct(ctx, "contentHash", filter)
	if err != nil {
		return nil, fmt.Errorf("file metadata repository: get referenced hashes: %v", err)
	}

	result := make([]string, len(hashes))
	for i, h := range hashes {
		result[i] = h.(string)
	}

	return result, nil
}

func (r *FileMetadataRepository) CleanOldTombstones(userID primitive.ObjectID, maxAge time.Duration) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cutoff := time.Now().Add(-maxAge)

	filter := bson.M{
		"userId":    userID,
		"deletedAt": bson.M{"$lt": cutoff},
	}

	result, err := r.collection.DeleteMany(ctx, filter)
	if err != nil {
		return 0, fmt.Errorf("file metadata repository: clean old tombstones: %v", err)
	}

	return result.DeletedCount, nil
}

func (r *FileMetadataRepository) GetTotalSize(userID primitive.ObjectID) (int64, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: bson.M{"userId": userID, "deletedAt": nil}}},
		{{Key: "$group", Value: bson.M{
			"_id":       nil,
			"totalSize": bson.M{"$sum": "$fileSize"},
		}}},
	}

	cur, err := r.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return 0, fmt.Errorf("file metadata repository: get total size: %v", err)
	}
	defer cur.Close(ctx)

	var result struct {
		TotalSize int64 `bson:"totalSize"`
	}

	if cur.Next(ctx) {
		if err := cur.Decode(&result); err != nil {
			return 0, fmt.Errorf("file metadata repository: get total size: decode: %v", err)
		}
	}

	return result.TotalSize, nil
}

func normalizePath(path string) string {
	return norm.NFC.String(path)
}
