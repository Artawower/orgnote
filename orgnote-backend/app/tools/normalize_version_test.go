package tools

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeVersion_UnchangedVersion(t *testing.T) {
	version := "v1.0.0"
	normalizedVersion := NormalizeVersion(version)

	assert.Equal(t, normalizedVersion, "v1.0.0")
}

func TestNormalizeVersion_LowerCaseVersion(t *testing.T) {
	version := "V0.1.0"
	normalizedVersion := NormalizeVersion(version)

	assert.Equal(t, normalizedVersion, "v0.1.0")
}

func TestNormalizeVersion_AddVersionPrefix(t *testing.T) {
	version := "0.0.17"
	normalizedVersion := NormalizeVersion(version)
	assert.Equal(t, normalizedVersion, "v0.0.17")
}
