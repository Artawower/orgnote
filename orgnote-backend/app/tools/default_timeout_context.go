package tools

import (
	"context"
	"time"
)

const defaultTimeoutSec = 5

func DefaultContextTimeout() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), defaultTimeoutSec*time.Second)
}
