#!/bin/bash

# TODO: master ADD MANUAL
# Variables
emacs_package_version_file=./web-roam/web-roam.el
frontend_package_version_file=./orgnote-client/package.json
publisher_package_version_file=./orgnote-publisher/package.json
org_mode_ast_version_file=./org-mode-ast/package.json

commit_files=("$emacs_package_version_file" "$frontend_package_version_file" "$publisher_package_version_file")
dirs_to_commit=("web-roam" "orgnote-client" "orgnote-publisher")

# Input semver
read -p "Enter semver: " ver


# Validate semver
if ! [[ $ver =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Invalid semver"
  exit 1
fi
semver="v$ver"

function has_param() {
    local terms="$1"
    shift
    for term in $terms; do
        for arg; do
            if [[ $arg == "$term" ]]; then
                echo "yes"
            fi
        done
    done
}

skip_commits=$(has_param "-s --skip-commits" "$@")
only_parser_dependencies=$(has_param "-o --only-parser" "$@")

echo "Start update version and preparing release:"
echo "    Skip commits: $skip_commits"
echo "    Only parser dependencies: $only_parser_dependencies"


function update_emacs_version() {
    new_version=";; Version: $semver"
    modified_content=$(awk -v new_version="$new_version" '{sub(";; Version: [0-9]+\\.[0-9]+\\.[0-9]+", new_version)}1' "$emacs_package_version_file")
    echo -e "$modified_content" > "$emacs_package_version_file"
}

set_package_json_version() {
    filePath=$1
    version=$2

    modified_content=$(awk -v version="$version" '{sub("\"version\": \"[0-9]+\\.[0-9]+\\.[0-9]+\"", "\"version\": \""version"\"") }1' "$filePath")
    echo "Content modified"
    echo -e "$modified_content" > "$filePath"
    yarn
}

if [[ ! -z $only_parser_dependencies ]]; then
    update_emacs_version
    set_package_json_version "$frontend_package_version_file" "$ver"
    set_package_json_version "$publisher_package_version_file" "$ver"
fi

set_package_json_version "$org_mode_ast_version_file" "$ver"

update_dependency_version() {
    filePath=$1
    version=$2

    modified_content=$(awk -v version="$version" '/"org-mode-ast"/ { sub(/"[0-9]+\.[0-9]+\.[0-9]+"/, "\"" version "\"") }1'  "$filePath")
    echo -e "$modified_content" > "$filePath"
    yarn
 }


# Update orgnote client and publisher version
update_dependency_version "$frontend_package_version_file" "$ver"
update_dependency_version "$publisher_package_version_file" "$ver"



# Create commits and tags over commit_files and push them into remote
push_changes() {
    version=$1
    path=$2
    skip_commits=$3
    cd $path
    commit_message="release: $semver"
    if [[ -z $skip_commits ]]
    then
       git status
       read -p "Commit message for $path: " user_message
       commit_message=$user_message || $commit_message
    fi
    git add .
    git commit -m "$commit_message"
    git tag -a "$semver" -m "release: $semver"
    git push origin master
    git push origin "$semver"
    echo "Push successull for:\n\t$path\n\twith commit message:\n\t$commit_message"
}


curr_dir=$(pwd)
push_changes "$semver" org-mode-ast "$skip_commits"


while true; do
    status_code=$(curl --head "https://www.npmjs.com/package/org-mode-ast/v/${semver:1}" | awk '/^HTTP/{print $2}')
    if [[ $status_code == "200" ]]; then
        break
    fi
    echo "Waiting for npm package to be published. Right now status code is $status_code"
    sleep 5
done

if [[ $only_parser_dependencies ]]; then
    echo "Only parser dependencies updated. Exiting..."
    exit 0
fi

for dir in "${dirs_to_commit[@]}"; do
  cd $curr_dir
  p="$curr_dir/$dir"
  push_changes "$semver" "$p" "$skip_commits"
done
