#!/bin/bash

# Variables
emacs_package_version_file=./web-roam/web-roam.el
frontend_package_version_file=./second-brain-client/package.json
publisher_package_version_file=./second-brain-publisher/package.json

commit_files=("$emacs_package_version_file" "$frontend_package_version_file" "$publisher_package_version_file")

# Input semver
read -p "Enter semver: " semver

# Validate semver
if ! [[ $semver =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid semver"
  exit 1
fi

new_version=";; Version: $semver"
modified_content=$(awk -v new_version="$new_version" '{sub(";; Version: [0-9]+\\.[0-9]+\\.[0-9]+", new_version)}1' "$emacs_package_version_file")
echo -e "$modified_content" > "$emacs_package_version_file"


set_package_json_version() {
    filePath=$1
    version=$2

    modified_content=$(awk -v version="$version" '{sub("\"version\": \"[0-9]+\\.[0-9]+\\.[0-9]+\"", "\"version\": \""version"\"") }1' "$filePath")
    echo -e "$modified_content" > "$filePath"
}

set_package_json_version "$frontend_package_version_file" "$semver"
set_package_json_version "$publisher_package_version_file" "$semver"


# Create commits and tags over commit_files and push them into remote
curr_dir=$(pwd)
for file in "${commit_files[@]}"; do
  cd "$curr_dir"
  cd "$file"
  git add .
  git commit -m "Update version to $semver"
  git tag -a "$semver" -m "Update version to $semver"
  git push origin master
  git push origin "$semver"
done
