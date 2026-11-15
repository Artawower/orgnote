package services

import (
	"errors"
	"fmt"
	"orgnote/app/infrastructure"
	"orgnote/app/models"
	"orgnote/app/repositories"
	"sync"
	"time"

	"orgnote/app/tools"

	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Syncer interface {
	GetChanges(userID primitive.ObjectID, since time.Time, limit int, cursor *string) (*ChangesResult, error)
	UploadFile(userID primitive.ObjectID, filePath string, content []byte, clientHash string, spaceLimit int64, expectedVersion *int, clientSocketID string) (*UploadResult, error)
	DownloadFile(userID primitive.ObjectID, filePath string) ([]byte, *models.FileMetadata, error)
	DeleteFile(userID primitive.ObjectID, filePath string, expectedVersion *int, clientSocketID string) (*models.FileMetadata, error)
	RunGarbageCollection(userID primitive.ObjectID) error
}

type FileMetadataStore interface {
	GetChanges(userID primitive.ObjectID, since time.Time, limit int, cursor *string) (*repositories.GetChangesResult, error)
	GetByPath(userID primitive.ObjectID, filePath string) (*models.FileMetadata, error)
	HashExists(userID primitive.ObjectID, contentHash string) (bool, error)
	Upsert(userID primitive.ObjectID, filePath string, contentHash string, size int64, expectedVersion *int) (*models.FileMetadata, error)
	SoftDeleteByPath(userID primitive.ObjectID, filePath string, expectedVersion *int) (*models.FileMetadata, error)
	GetReferencedHashes(userID primitive.ObjectID) ([]string, error)
	CleanOldTombstones(userID primitive.ObjectID, maxAge time.Duration) (int64, error)
}

type StorageUsageStore interface {
	EnsureStorageUsage(userID primitive.ObjectID) error
	ReserveStorage(userID primitive.ObjectID, bytes int64, spaceLimit int64) (bool, error)
	ReleaseStorage(userID primitive.ObjectID, bytes int64) error
}

type SyncService struct {
	fileMetadataRepo    FileMetadataStore
	storageUsageRepo    StorageUsageStore
	notificationService *NotificationService
	blobStorage         infrastructure.BlobStorage
	maxFileSize         int64
	tombstoneTTL        time.Duration
}

type SyncServiceConfig struct {
	MaxFileSize  int64
	TombstoneTTL time.Duration
}

type ChangesResult struct {
	Changes    []models.FileChange
	Cursor     *string
	HasMore    bool
	ServerTime time.Time
}

type UploadResult struct {
	Metadata *models.FileMetadata
	Uploaded bool
}

func NewSyncService(
	fileMetadataRepo FileMetadataStore,
	storageUsageRepo StorageUsageStore,
	notificationService *NotificationService,
	blobStorage infrastructure.BlobStorage,
	config SyncServiceConfig,
) *SyncService {
	return &SyncService{
		fileMetadataRepo:    fileMetadataRepo,
		storageUsageRepo:    storageUsageRepo,
		notificationService: notificationService,
		blobStorage:         blobStorage,
		maxFileSize:         config.MaxFileSize,
		tombstoneTTL:        config.TombstoneTTL,
	}
}

func (s *SyncService) GetChanges(userID primitive.ObjectID, since time.Time, limit int, cursor *string) (*ChangesResult, error) {
	result, err := s.fileMetadataRepo.GetChanges(userID, since, limit, cursor)
	if err != nil {
		return nil, fmt.Errorf("sync service: get changes: %v", err)
	}

	return &ChangesResult{
		Changes:    s.mapToChanges(result.Files),
		Cursor:     result.NextCursor,
		HasMore:    result.HasMore,
		ServerTime: time.Now(),
	}, nil
}

func (s *SyncService) UploadFile(userID primitive.ObjectID, filePath string, content []byte, clientHash string, spaceLimit int64, expectedVersion *int, clientSocketID string) (*UploadResult, error) {
	filePath = tools.NormalizeFilePath(filePath)

	if int64(len(content)) > s.maxFileSize {
		return nil, ErrFileTooLarge
	}

	computedHash := infrastructure.ComputeHash(content)
	if clientHash != "" && clientHash != computedHash {
		return nil, ErrHashMismatch
	}

	if spaceLimit <= 0 {
		return nil, ErrNoStorageQuota
	}

	existingMetadata, err := s.fileMetadataRepo.GetByPath(userID, filePath)
	if err != nil {
		return nil, fmt.Errorf("sync service: upload: get metadata: %v", err)
	}
	if versionError := validateUploadVersion(existingMetadata, expectedVersion); versionError != nil {
		return nil, versionError
	}

	storageDelta := uploadStorageDelta(existingMetadata, int64(len(content)))
	if err := s.ensureStorageCounter(userID); err != nil {
		return nil, err
	}

	reservedStorage, err := s.reserveStorage(userID, storageDelta, spaceLimit)
	if err != nil {
		return nil, err
	}
	if reservedStorage > 0 {
		defer s.releaseReservedStorage(userID, &reservedStorage)
	}

	uploaded, err := s.uploadBlobIfNeeded(userID.Hex(), computedHash, content)
	if err != nil {
		return nil, fmt.Errorf("sync service: upload: %v", err)
	}

	metadata, err := s.fileMetadataRepo.Upsert(userID, filePath, computedHash, int64(len(content)), expectedVersion)
	if versionErr, ok := err.(*repositories.VersionMismatchError); ok {
		return nil, &VersionMismatchError{
			Path:          versionErr.Path,
			ServerVersion: versionErr.ServerVersion,
		}
	}
	if errors.Is(err, repositories.ErrVersionMismatch) {
		return nil, ErrVersionMismatch
	}
	if err != nil {
		return nil, fmt.Errorf("sync service: upload: upsert metadata: %v", err)
	}

	if storageDelta < 0 {
		if err := s.storageUsageRepo.ReleaseStorage(userID, -storageDelta); err != nil {
			return nil, fmt.Errorf("sync service: upload: release replaced storage: %v", err)
		}
	}
	reservedStorage = 0

	s.notificationService.NotifySync(userID.Hex(), clientSocketID)

	return &UploadResult{
		Metadata: metadata,
		Uploaded: uploaded,
	}, nil
}

func (s *SyncService) ensureStorageCounter(userID primitive.ObjectID) error {
	if err := s.storageUsageRepo.EnsureStorageUsage(userID); err != nil {
		return fmt.Errorf("sync service: upload: ensure storage usage: %v", err)
	}
	return nil
}

func (s *SyncService) reserveStorage(userID primitive.ObjectID, storageDelta int64, spaceLimit int64) (int64, error) {
	if storageDelta <= 0 {
		return 0, nil
	}

	reserved, err := s.storageUsageRepo.ReserveStorage(userID, storageDelta, spaceLimit)
	if err != nil {
		return 0, fmt.Errorf("sync service: upload: reserve storage: %v", err)
	}
	if !reserved {
		return 0, ErrStorageQuotaExceeded
	}
	return storageDelta, nil
}

func (s *SyncService) releaseReservedStorage(userID primitive.ObjectID, reservedStorage *int64) {
	if *reservedStorage <= 0 {
		return
	}
	if err := s.storageUsageRepo.ReleaseStorage(userID, *reservedStorage); err != nil {
		log.Error().Err(err).Str("userId", userID.Hex()).Int64("bytes", *reservedStorage).Msg("sync service: upload: release reserved storage")
	}
}

func validateUploadVersion(metadata *models.FileMetadata, expectedVersion *int) error {
	if metadata == nil || expectedVersion != nil {
		return nil
	}
	return &VersionMismatchError{
		Path:          metadata.Path,
		ServerVersion: metadata.Version,
	}
}

func uploadStorageDelta(metadata *models.FileMetadata, newSize int64) int64 {
	return newSize - activeMetadataSize(metadata)
}

func activeMetadataSize(metadata *models.FileMetadata) int64 {
	if metadata == nil || metadata.DeletedAt != nil {
		return 0
	}
	return metadata.Size
}

func (s *SyncService) uploadBlobIfNeeded(userID string, contentHash string, content []byte) (bool, error) {
	userObjectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return false, fmt.Errorf("invalid user id: %v", err)
	}

	exists, err := s.fileMetadataRepo.HashExists(userObjectID, contentHash)
	if err != nil {
		return false, fmt.Errorf("hash check: %v", err)
	}

	if exists {
		return false, nil
	}

	if err := s.blobStorage.Upload(userID, contentHash, content); err != nil {
		return false, fmt.Errorf("store blob: %v", err)
	}

	return true, nil
}

func (s *SyncService) mapToChanges(files []models.FileMetadata) []models.FileChange {
	changes := make([]models.FileChange, 0, len(files))
	for _, metadata := range files {
		changes = append(changes, s.mapToChange(metadata))
	}
	return changes
}

func (s *SyncService) mapToChange(metadata models.FileMetadata) models.FileChange {
	change := models.FileChange{
		ID:        metadata.ID.Hex(),
		Path:      metadata.Path,
		Size:      metadata.Size,
		UpdatedAt: metadata.UpdatedAt,
		Version:   metadata.Version,
		Deleted:   metadata.DeletedAt != nil,
		DeletedAt: metadata.DeletedAt,
	}

	if metadata.DeletedAt == nil {
		change.ContentHash = &metadata.ContentHash
	}

	return change
}

func (s *SyncService) DownloadFile(userID primitive.ObjectID, filePath string) ([]byte, *models.FileMetadata, error) {
	filePath = tools.NormalizeFilePath(filePath)

	metadata, err := s.fileMetadataRepo.GetByPath(userID, filePath)
	if err != nil {
		return nil, nil, fmt.Errorf("sync service: download: get metadata: %v", err)
	}

	if metadata == nil {
		return nil, nil, nil
	}

	if metadata.DeletedAt != nil {
		return nil, nil, ErrFileDeleted
	}

	content, err := s.blobStorage.Download(userID.Hex(), metadata.ContentHash)
	if err != nil {
		return nil, nil, fmt.Errorf("sync service: download: get blob: %v", err)
	}

	if content == nil {
		return nil, nil, ErrBlobNotFound
	}

	return content, metadata, nil
}

func (s *SyncService) DeleteFile(userID primitive.ObjectID, filePath string, expectedVersion *int, clientSocketID string) (*models.FileMetadata, error) {
	filePath = tools.NormalizeFilePath(filePath)

	metadata, err := s.fileMetadataRepo.SoftDeleteByPath(userID, filePath, expectedVersion)
	if versionErr, ok := err.(*repositories.VersionMismatchError); ok {
		return nil, &VersionMismatchError{
			Path:          versionErr.Path,
			ServerVersion: versionErr.ServerVersion,
		}
	}
	if err != nil {
		return nil, fmt.Errorf("sync service: delete: %v", err)
	}
	if metadata != nil {
		if err := s.storageUsageRepo.ReleaseStorage(userID, metadata.Size); err != nil {
			return nil, fmt.Errorf("sync service: delete: release storage: %v", err)
		}
	}

	s.notificationService.NotifySync(userID.Hex(), clientSocketID)

	return metadata, nil
}

func (s *SyncService) RunGarbageCollection(userID primitive.ObjectID) error {
	referencedHashes, err := s.fileMetadataRepo.GetReferencedHashes(userID)
	if err != nil {
		return fmt.Errorf("sync service: gc: get referenced hashes: %v", err)
	}

	referencedSet := make(map[string]bool)
	for _, hash := range referencedHashes {
		referencedSet[hash] = true
	}

	blobs, err := s.blobStorage.ListBlobs(userID.Hex())
	if err != nil {
		return fmt.Errorf("sync service: gc: list blobs: %v", err)
	}

	gcThreshold := time.Now().Add(-24 * time.Hour)
	s.deleteUnreferencedBlobs(userID.Hex(), blobs, referencedSet, gcThreshold)

	_, err = s.fileMetadataRepo.CleanOldTombstones(userID, s.tombstoneTTL)
	if err != nil {
		return fmt.Errorf("sync service: gc: clean tombstones: %v", err)
	}

	return nil
}

func (s *SyncService) deleteUnreferencedBlobs(
	userID string,
	blobs []infrastructure.BlobInfo,
	referencedSet map[string]bool,
	gcThreshold time.Time,
) {
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, 5)

	for _, blob := range blobs {
		if referencedSet[blob.Hash] {
			continue
		}
		if blob.CreatedAt.After(gcThreshold) {
			continue
		}

		wg.Add(1)
		semaphore <- struct{}{}

		go func(hash string) {
			defer wg.Done()
			defer func() { <-semaphore }()

			if err := s.blobStorage.Delete(userID, hash); err != nil {
				log.Error().Err(err).Str("userId", userID).Str("hash", hash).Msg("sync service: gc: failed to delete blob")
			}
		}(blob.Hash)
	}

	wg.Wait()
}
