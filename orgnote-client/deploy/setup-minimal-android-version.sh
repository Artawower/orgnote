#!/bin/bash

MIN_VERSION="29"

if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' -e "s/minSdkVersion = .*/minSdkVersion = $MIN_VERSION/g" src-capacitor/android/variables.gradle
else
    sed -i -e "s/minSdkVersion = .*/minSdkVersion = $MIN_VERSION/g" src-capacitor/android/variables.gradle
fi
