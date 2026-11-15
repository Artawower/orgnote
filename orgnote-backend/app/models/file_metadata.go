package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FileMetadata struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID      primitive.ObjectID `json:"userId" bson:"userId"`
	Path        string             `json:"path" bson:"filePath"`
	ContentHash string             `json:"contentHash" bson:"contentHash"`
	Size        int64              `json:"size" bson:"fileSize"`
	CreatedAt   time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt   time.Time          `json:"updatedAt" bson:"updatedAt"`
	DeletedAt   *time.Time         `json:"deletedAt,omitempty" bson:"deletedAt,omitempty"`
	Version     int                `json:"version" bson:"version"`
}

// @Description File change information for synchronization
type FileChange struct {
	ID          string     `json:"id" binding:"required" example:"507f1f77bcf86cd799439011"`
	Path        string     `json:"path" binding:"required" example:"notes/todo.org"`
	ContentHash *string    `json:"contentHash,omitempty" example:"a1b2c3d4e5f6..."`
	Size        int64      `json:"size,omitempty" example:"1024"`
	UpdatedAt   time.Time  `json:"updatedAt" binding:"required" example:"2024-01-01T00:00:00Z"`
	Deleted     bool       `json:"deleted" binding:"required" example:"false"`
	DeletedAt   *time.Time `json:"deletedAt,omitempty"`
	Version     int        `json:"version" binding:"required" example:"1"`
} // @name FileChange

// @Description Response containing file changes since last sync
type SyncChangesResponse struct {
	Changes    []FileChange `json:"changes" binding:"required"`
	Cursor     *string      `json:"cursor,omitempty" example:"507f1f77bcf86cd799439011"`
	HasMore    bool         `json:"hasMore" binding:"required" example:"false"`
	ServerTime time.Time    `json:"serverTime" binding:"required" example:"2024-01-01T00:00:00Z"`
} // @name SyncChangesResponse

// @Description Response after successful file upload
type FileUploadResponse struct {
	ID          string    `json:"id" binding:"required" example:"507f1f77bcf86cd799439011"`
	Path        string    `json:"path" binding:"required" example:"notes/todo.org"`
	ContentHash string    `json:"contentHash" binding:"required" example:"a1b2c3d4e5f6..."`
	Size        int64     `json:"size" binding:"required" example:"1024"`
	UpdatedAt   time.Time `json:"updatedAt" binding:"required" example:"2024-01-01T00:00:00Z"`
	Version     int       `json:"version" binding:"required" example:"1"`
	Uploaded    bool      `json:"uploaded" binding:"required" example:"true"`
} // @name FileUploadResponse

// @Description Response when optimistic locking fails due to version mismatch
type VersionConflictResponse struct {
	Error         string `json:"error" binding:"required" example:"version mismatch"`
	Path          string `json:"path" binding:"required" example:"notes/todo.org"`
	ServerVersion int    `json:"serverVersion" binding:"required" example:"5"`
} // @name VersionConflictResponse

type SyncCursor struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID     primitive.ObjectID `json:"userId" bson:"userId"`
	DeviceID   string             `json:"deviceId" bson:"deviceId"`
	LastSyncAt time.Time          `json:"lastSyncAt" bson:"lastSyncAt"`
	CreatedAt  time.Time          `json:"createdAt" bson:"createdAt"`
}
