#!/bin/bash

# Read package json version via jq
VERSION=$(jq -r '.version' package.json)

# Generate versionCode from version (e.g., 0.41.6 -> 4106)
# Format: MMmmpp where MM=major, mm=minor, pp=patch (max 2 digits each)
MAJOR=$(echo "$VERSION" | cut -d. -f1 | sed 's/^0*//')
MINOR=$(echo "$VERSION" | cut -d. -f2 | sed 's/^0*//')
PATCH=$(echo "$VERSION" | cut -d. -f3 | sed 's/^0*//')

# Ensure values are not empty
MAJOR=${MAJOR:-0}
MINOR=${MINOR:-0}
PATCH=${PATCH:-0}

# Cap at 99 to avoid overflow
[ "$MAJOR" -gt 99 ] && MAJOR=99
[ "$MINOR" -gt 99 ] && MINOR=99
[ "$PATCH" -gt 99 ] && PATCH=99

VERSIONCODE=$((MAJOR * 10000 + MINOR * 100 + PATCH))

# For dev builds, add build number offset
if [ -n "$GITHUB_RUN_NUMBER" ] && [ "${PRERELEASE:-false}" = "true" ]; then
  VERSIONCODE=$((VERSIONCODE + GITHUB_RUN_NUMBER))
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' -e "s/version: '.*'/version: '$VERSION'/g" ./quasar.config.ts
  sed -i '' -e 's/versionName ".*/versionName "'$VERSION'"/g' ./src-capacitor/android/app/build.gradle
  sed -i '' -e 's/versionCode .*/versionCode '$VERSIONCODE'/g' ./src-capacitor/android/app/build.gradle
else
  sed -i -e "s/version: '.*'/version: '$VERSION'/g" ./quasar.config.ts
  sed -i -e 's/versionName ".*/versionName "'$VERSION'"/g' ./src-capacitor/android/app/build.gradle
  sed -i -e 's/versionCode .*/versionCode '$VERSIONCODE'/g' ./src-capacitor/android/app/build.gradle
fi

echo "Updated version: $VERSION (versionCode: $VERSIONCODE)"
