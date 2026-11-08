package infrastructure

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"time"
)

type BlobInfo struct {
	Hash      string
	Size      int64
	CreatedAt time.Time
}

type BlobStorage interface {
	Upload(userID string, contentHash string, content []byte) error
	Download(userID string, contentHash string) ([]byte, error)
	Exists(userID string, contentHash string) (bool, error)
	Delete(userID string, contentHash string) error
	ListBlobs(userID string) ([]BlobInfo, error)
}

func ComputeHash(content []byte) string {
	hash := sha256.Sum256(content)
	return hex.EncodeToString(hash[:])
}

func ComputeHashFromReader(reader io.Reader) (string, error) {
	hasher := sha256.New()
	if _, err := io.Copy(hasher, reader); err != nil {
		return "", fmt.Errorf("compute hash: %v", err)
	}
	return hex.EncodeToString(hasher.Sum(nil)), nil
}
