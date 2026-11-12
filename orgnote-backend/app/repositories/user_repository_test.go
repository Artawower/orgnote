package repositories

import (
	"reflect"
	"testing"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

func TestReleaseStorageUpdatePipeline_ClampsUsedSpaceToZero(t *testing.T) {
	pipeline := releaseStorageUpdatePipeline(42)
	expected := mongo.Pipeline{
		{{Key: "$set", Value: bson.M{"usedSpace": bson.M{"$max": bson.A{
			int64(0),
			bson.M{"$subtract": bson.A{bson.M{"$ifNull": bson.A{"$usedSpace", int64(0)}}, int64(42)}},
		}}}}},
	}

	if !reflect.DeepEqual(pipeline, expected) {
		t.Fatalf("unexpected release storage pipeline: %#v", pipeline)
	}
}
