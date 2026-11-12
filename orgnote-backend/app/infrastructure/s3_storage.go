package infrastructure

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type S3Storage struct {
	client          *minio.Client
	bucketName      string
	uploadTimeout   time.Duration
	downloadTimeout time.Duration
}

type S3Config struct {
	Endpoint        string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	UseSSL          bool
	UploadTimeout   int
	DownloadTimeout int
}

func NewS3Storage(cfg S3Config) (*S3Storage, error) {
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		Secure: cfg.UseSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("s3 storage: init client: %v", err)
	}

	if err = ensureBucketExists(client, cfg.BucketName); err != nil {
		return nil, err
	}

	return &S3Storage{
		client:          client,
		bucketName:      cfg.BucketName,
		uploadTimeout:   time.Duration(cfg.UploadTimeout) * time.Second,
		downloadTimeout: time.Duration(cfg.DownloadTimeout) * time.Second,
	}, nil
}

func ensureBucketExists(client *minio.Client, bucketName string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	exists, err := client.BucketExists(ctx, bucketName)
	if err != nil {
		return fmt.Errorf("s3 storage: check bucket: %v", err)
	}

	if exists {
		return nil
	}

	if err = client.MakeBucket(ctx, bucketName, minio.MakeBucketOptions{}); err != nil {
		return fmt.Errorf("s3 storage: create bucket: %v", err)
	}

	return nil
}

func (s *S3Storage) getObjectKey(userID string, contentHash string) string {
	return userID + "/" + contentHash
}

func (s *S3Storage) contextWithTimeout(timeout time.Duration) (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), timeout)
}

func isNoSuchKeyError(err error) bool {
	return minio.ToErrorResponse(err).Code == "NoSuchKey"
}

func (s *S3Storage) Upload(userID string, contentHash string, content []byte) error {
	if err := s.verifyHash(contentHash, content); err != nil {
		return err
	}

	ctx, cancel := s.contextWithTimeout(s.uploadTimeout)
	defer cancel()

	objectKey := s.getObjectKey(userID, contentHash)
	reader := bytes.NewReader(content)

	_, err := s.client.PutObject(ctx, s.bucketName, objectKey, reader, int64(len(content)), minio.PutObjectOptions{
		ContentType: "application/octet-stream",
	})
	if err != nil {
		return fmt.Errorf("s3 storage: upload: %v", err)
	}

	return nil
}

func (s *S3Storage) verifyHash(expected string, content []byte) error {
	computed := ComputeHash(content)
	if computed != expected {
		return fmt.Errorf("s3 storage: hash mismatch: expected %s, got %s", expected, computed)
	}
	return nil
}

func (s *S3Storage) Download(userID string, contentHash string) ([]byte, error) {
	ctx, cancel := s.contextWithTimeout(s.downloadTimeout)
	defer cancel()

	objectKey := s.getObjectKey(userID, contentHash)

	object, err := s.client.GetObject(ctx, s.bucketName, objectKey, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("s3 storage: download: %v", err)
	}
	defer object.Close()

	content, err := io.ReadAll(object)
	if err == nil {
		return content, nil
	}

	if isNoSuchKeyError(err) {
		return nil, nil
	}

	return nil, fmt.Errorf("s3 storage: download: %v", err)
}

func (s *S3Storage) Exists(userID string, contentHash string) (bool, error) {
	ctx, cancel := s.contextWithTimeout(10 * time.Second)
	defer cancel()

	objectKey := s.getObjectKey(userID, contentHash)

	_, err := s.client.StatObject(ctx, s.bucketName, objectKey, minio.StatObjectOptions{})
	if err == nil {
		return true, nil
	}

	if isNoSuchKeyError(err) {
		return false, nil
	}

	return false, fmt.Errorf("s3 storage: exists: %v", err)
}

func (s *S3Storage) Delete(userID string, contentHash string) error {
	ctx, cancel := s.contextWithTimeout(10 * time.Second)
	defer cancel()

	objectKey := s.getObjectKey(userID, contentHash)

	if err := s.client.RemoveObject(ctx, s.bucketName, objectKey, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("s3 storage: delete: %v", err)
	}

	return nil
}

func (s *S3Storage) ListBlobs(userID string) ([]BlobInfo, error) {
	ctx, cancel := s.contextWithTimeout(s.downloadTimeout)
	defer cancel()

	prefix := userID + "/"
	objectCh := s.client.ListObjects(ctx, s.bucketName, minio.ListObjectsOptions{
		Prefix:    prefix,
		Recursive: true,
	})

	return s.collectBlobs(objectCh, prefix)
}

func (s *S3Storage) collectBlobs(objectCh <-chan minio.ObjectInfo, prefix string) ([]BlobInfo, error) {
	var blobs []BlobInfo

	for object := range objectCh {
		if object.Err != nil {
			return nil, fmt.Errorf("s3 storage: list blobs: %v", object.Err)
		}

		blobs = append(blobs, BlobInfo{
			Hash:      object.Key[len(prefix):],
			Size:      object.Size,
			CreatedAt: object.LastModified,
		})
	}

	return blobs, nil
}
