package services

import "errors"

var (
	ErrNoStorageQuota       = errors.New("no storage quota: subscription required")
	ErrStorageQuotaExceeded = errors.New("storage limit exceeded")
	ErrFileNotFound         = errors.New("file not found")
	ErrFileDeleted          = errors.New("file deleted")
	ErrBlobNotFound         = errors.New("blob not found")
	ErrHashMismatch         = errors.New("hash mismatch")
	ErrFileTooLarge         = errors.New("file too large")
	ErrVersionMismatch      = errors.New("version mismatch")
)

type VersionMismatchError struct {
	Path          string
	ServerVersion int
}

func (e *VersionMismatchError) Error() string {
	return "version mismatch"
}
