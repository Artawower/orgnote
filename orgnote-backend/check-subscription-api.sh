#!/bin/bash

set -euo pipefail

schema_url="${SUBSCRIPTION_SCHEMA_URL:-http://localhost:8000/api/schema/}"
current_path="app/infrastructure/generated/subscription.go"
generated_path="$(mktemp)"

cleanup() {
  rm -f "$generated_path"
}
trap cleanup EXIT

oapi-codegen -package subscription -generate client,types "$schema_url" > "$generated_path"

if diff -u "$current_path" "$generated_path"; then
  echo "Subscrumber API layer is up to date."
  exit 0
fi

echo "Subscrumber API layer is out of date. Run SUBSCRIPTION_SCHEMA_URL=$schema_url ./generate-subscription-api.sh" >&2
exit 1
