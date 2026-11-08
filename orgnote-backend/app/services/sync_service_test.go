package services

import (
	"errors"
	"orgnote/app/infrastructure"
	"orgnote/app/models"
	"orgnote/app/repositories"
	"testing"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type mockBlobStorage struct {
	blobs     map[string][]byte
	uploadErr error
}

func newMockBlobStorage() *mockBlobStorage {
	return &mockBlobStorage{blobs: make(map[string][]byte)}
}

func (m *mockBlobStorage) Upload(userID string, contentHash string, content []byte) error {
	if m.uploadErr != nil {
		return m.uploadErr
	}
	m.blobs[userID+"/"+contentHash] = content
	return nil
}

func (m *mockBlobStorage) Download(userID string, contentHash string) ([]byte, error) {
	content, ok := m.blobs[userID+"/"+contentHash]
	if !ok {
		return nil, nil
	}
	return content, nil
}

func (m *mockBlobStorage) Exists(userID string, contentHash string) (bool, error) {
	_, ok := m.blobs[userID+"/"+contentHash]
	return ok, nil
}

func (m *mockBlobStorage) Delete(userID string, contentHash string) error {
	delete(m.blobs, userID+"/"+contentHash)
	return nil
}

func (m *mockBlobStorage) ListBlobs(userID string) ([]infrastructure.BlobInfo, error) {
	return nil, nil
}

type mockEventSender struct{}

func (m *mockEventSender) Emit(userID string, eventType string, payload any, excludeSocketID string) {
}

type mockFileMetadataRepo struct {
	files     map[string]*models.FileMetadata
	totalSize int64
}

func newMockFileMetadataRepo() *mockFileMetadataRepo {
	return &mockFileMetadataRepo{files: make(map[string]*models.FileMetadata)}
}

func (m *mockFileMetadataRepo) GetChanges(userID primitive.ObjectID, since time.Time, limit int, cursor *string) (*repositories.GetChangesResult, error) {
	return &repositories.GetChangesResult{}, nil
}

func (m *mockFileMetadataRepo) Upsert(userID primitive.ObjectID, filePath string, contentHash string, fileSize int64, expectedVersion *int) (*models.FileMetadata, error) {
	metadata := &models.FileMetadata{
		ID:          primitive.NewObjectID(),
		UserID:      userID,
		Path:        filePath,
		ContentHash: contentHash,
		Size:        fileSize,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
		Version:     1,
	}
	previous := m.files[filePath]
	m.files[filePath] = metadata
	m.totalSize += fileSize - activeMetadataSize(previous)
	return metadata, nil
}

func (m *mockFileMetadataRepo) GetByPath(userID primitive.ObjectID, filePath string) (*models.FileMetadata, error) {
	return m.files[filePath], nil
}

func (m *mockFileMetadataRepo) SoftDeleteByPath(userID primitive.ObjectID, filePath string, expectedVersion *int) (*models.FileMetadata, error) {
	metadata := m.files[filePath]
	if metadata == nil {
		return nil, nil
	}
	now := time.Now()
	metadata.DeletedAt = &now
	return metadata, nil
}

func (m *mockFileMetadataRepo) GetReferencedHashes(userID primitive.ObjectID) ([]string, error) {
	return nil, nil
}

func (m *mockFileMetadataRepo) CleanOldTombstones(userID primitive.ObjectID, maxAge time.Duration) (int64, error) {
	return 0, nil
}

func (m *mockFileMetadataRepo) GetTotalSize(userID primitive.ObjectID) (int64, error) {
	return m.totalSize, nil
}

func (m *mockFileMetadataRepo) HashExists(userID primitive.ObjectID, contentHash string) (bool, error) {
	for _, f := range m.files {
		if f.ContentHash == contentHash {
			return true, nil
		}
	}
	return false, nil
}

type mockStorageUsageRepo struct {
	usedSpace int64
}

func (m *mockStorageUsageRepo) EnsureStorageUsage(userID primitive.ObjectID) error {
	return nil
}

func (m *mockStorageUsageRepo) ReserveStorage(userID primitive.ObjectID, bytes int64, spaceLimit int64) (bool, error) {
	if bytes <= 0 {
		return true, nil
	}
	if m.usedSpace+bytes > spaceLimit {
		return false, nil
	}
	m.usedSpace += bytes
	return true, nil
}

func (m *mockStorageUsageRepo) ReleaseStorage(userID primitive.ObjectID, bytes int64) error {
	if bytes <= 0 {
		return nil
	}
	m.usedSpace -= bytes
	return nil
}

func newTestSyncService(repo *mockFileMetadataRepo, usage *mockStorageUsageRepo, blobStorage *mockBlobStorage) *SyncService {
	return &SyncService{
		fileMetadataRepo:    repo,
		storageUsageRepo:    usage,
		notificationService: NewNotificationService(&mockEventSender{}),
		blobStorage:         blobStorage,
		maxFileSize:         1024 * 1024,
		tombstoneTTL:        30 * 24 * time.Hour,
	}
}

func TestUploadFile_Success(t *testing.T) {
	blobStorage := newMockBlobStorage()
	repo := newMockFileMetadataRepo()

	service := &SyncService{
		fileMetadataRepo:    nil,
		notificationService: NewNotificationService(&mockEventSender{}),
		blobStorage:         blobStorage,
		maxFileSize:         1024 * 1024,
		tombstoneTTL:        30 * 24 * time.Hour,
	}

	content := []byte("test content")
	hash := infrastructure.ComputeHash(content)

	err := blobStorage.Upload("user1", hash, content)
	if err != nil {
		t.Fatalf("upload failed: %v", err)
	}

	downloaded, err := blobStorage.Download("user1", hash)
	if err != nil {
		t.Fatalf("download failed: %v", err)
	}

	if string(downloaded) != string(content) {
		t.Errorf("content mismatch: got %s, want %s", downloaded, content)
	}

	_ = repo
	_ = service
}

func TestUploadFile_ReservesStorage(t *testing.T) {
	repo := newMockFileMetadataRepo()
	usage := &mockStorageUsageRepo{}
	blobStorage := newMockBlobStorage()
	service := newTestSyncService(repo, usage, blobStorage)
	userID := primitive.NewObjectID()

	_, err := service.UploadFile(userID, "test.txt", []byte("test"), "", 10, nil, "")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if usage.usedSpace != 4 {
		t.Fatalf("expected used space 4, got %d", usage.usedSpace)
	}
}

func TestUploadFile_ReturnsQuotaExceededWhenReservationFails(t *testing.T) {
	repo := newMockFileMetadataRepo()
	usage := &mockStorageUsageRepo{usedSpace: 8}
	blobStorage := newMockBlobStorage()
	service := newTestSyncService(repo, usage, blobStorage)
	userID := primitive.NewObjectID()

	_, err := service.UploadFile(userID, "test.txt", []byte("test"), "", 10, nil, "")

	if !errors.Is(err, ErrStorageQuotaExceeded) {
		t.Fatalf("expected storage quota error, got %v", err)
	}
	if len(blobStorage.blobs) != 0 {
		t.Fatal("expected blob upload to be skipped")
	}
}

func TestUploadFile_RejectsMissingVersionForExistingFile(t *testing.T) {
	const path = "/.orgnote/config.toml"
	repo := newMockFileMetadataRepo()
	blobStorage := newMockBlobStorage()
	service := newTestSyncService(repo, &mockStorageUsageRepo{}, blobStorage)
	userID := primitive.NewObjectID()
	repo.files[path] = &models.FileMetadata{
		UserID: userID, Path: path, ContentHash: "remote-hash", Size: 6, Version: 48,
	}

	_, err := service.UploadFile(userID, path, []byte("local defaults"), "", 1024, nil, "")

	var versionErr *VersionMismatchError
	if !errors.As(err, &versionErr) {
		t.Fatalf("expected version mismatch, got %v", err)
	}
	if versionErr.ServerVersion != 48 {
		t.Fatalf("expected server version 48, got %d", versionErr.ServerVersion)
	}
	if repo.files[path].ContentHash != "remote-hash" {
		t.Fatal("expected existing file to remain unchanged")
	}
	if len(blobStorage.blobs) != 0 {
		t.Fatal("expected blob upload to be skipped")
	}
}

func TestUploadFile_ReleasesReservationWhenUploadFails(t *testing.T) {
	repo := newMockFileMetadataRepo()
	usage := &mockStorageUsageRepo{}
	blobStorage := newMockBlobStorage()
	blobStorage.uploadErr = errors.New("upload failed")
	service := newTestSyncService(repo, usage, blobStorage)
	userID := primitive.NewObjectID()

	_, err := service.UploadFile(userID, "test.txt", []byte("test"), "", 10, nil, "")

	if err == nil {
		t.Fatal("expected upload error")
	}
	if usage.usedSpace != 0 {
		t.Fatalf("expected used space rollback to 0, got %d", usage.usedSpace)
	}
}

func TestUploadFile_ReleasesStorageWhenReplacingWithSmallerFile(t *testing.T) {
	repo := newMockFileMetadataRepo()
	usage := &mockStorageUsageRepo{usedSpace: 8}
	blobStorage := newMockBlobStorage()
	service := newTestSyncService(repo, usage, blobStorage)
	userID := primitive.NewObjectID()
	metadata, err := repo.Upsert(userID, "/test.txt", "old", 8, nil)
	if err != nil {
		t.Fatalf("failed to seed metadata: %v", err)
	}

	_, err = service.UploadFile(userID, "test.txt", []byte("test"), "", 10, &metadata.Version, "")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if usage.usedSpace != 4 {
		t.Fatalf("expected used space 4, got %d", usage.usedSpace)
	}
}

func TestDeleteFile_ReleasesStorage(t *testing.T) {
	repo := newMockFileMetadataRepo()
	usage := &mockStorageUsageRepo{usedSpace: 4}
	blobStorage := newMockBlobStorage()
	service := newTestSyncService(repo, usage, blobStorage)
	userID := primitive.NewObjectID()
	_, err := repo.Upsert(userID, "/test.txt", "hash", 4, nil)
	if err != nil {
		t.Fatalf("failed to seed metadata: %v", err)
	}

	_, err = service.DeleteFile(userID, "test.txt", nil, "")

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if usage.usedSpace != 0 {
		t.Fatalf("expected used space 0, got %d", usage.usedSpace)
	}
}

func TestUploadFile_FileTooLarge(t *testing.T) {
	service := &SyncService{
		notificationService: NewNotificationService(&mockEventSender{}),
		maxFileSize:         10,
	}

	content := []byte("this content is too large")
	userID := primitive.NewObjectID()

	_, err := service.UploadFile(userID, "test.txt", content, "", 0, nil, "")

	if err != ErrFileTooLarge {
		t.Errorf("expected ErrFileTooLarge, got %v", err)
	}
}

func TestUploadFile_HashMismatch(t *testing.T) {
	service := &SyncService{
		notificationService: NewNotificationService(&mockEventSender{}),
		maxFileSize:         1024,
	}

	content := []byte("test")
	userID := primitive.NewObjectID()

	_, err := service.UploadFile(userID, "test.txt", content, "wrong-hash", 0, nil, "")

	if err != ErrHashMismatch {
		t.Errorf("expected ErrHashMismatch, got %v", err)
	}
}

func TestMapToChange_DeletedFile(t *testing.T) {
	service := &SyncService{}
	now := time.Now()

	metadata := models.FileMetadata{
		ID:        primitive.NewObjectID(),
		Path:      "deleted.txt",
		DeletedAt: &now,
		Version:   2,
	}

	change := service.mapToChange(metadata)

	if !change.Deleted {
		t.Error("expected Deleted to be true")
	}

	if change.ContentHash != nil {
		t.Error("expected ContentHash to be nil for deleted file")
	}
}

func TestMapToChange_ActiveFile(t *testing.T) {
	service := &SyncService{}

	metadata := models.FileMetadata{
		ID:          primitive.NewObjectID(),
		Path:        "active.txt",
		ContentHash: "abc123",
		DeletedAt:   nil,
		Version:     1,
	}

	change := service.mapToChange(metadata)

	if change.Deleted {
		t.Error("expected Deleted to be false")
	}

	if change.ContentHash == nil || *change.ContentHash != "abc123" {
		t.Error("expected ContentHash to be set")
	}
}
