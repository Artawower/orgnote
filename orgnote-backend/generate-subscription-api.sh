#!/bin/bash

set -euo pipefail

schema_url="${SUBSCRIPTION_SCHEMA_URL:-http://localhost:8000/api/schema/}"
output_path="app/infrastructure/generated/subscription.go"

mkdir -p "$(dirname "$output_path")"
oapi-codegen -package subscription -generate client,types "$schema_url" > "$output_path"

echo "Subscrumber API layer was successfully generated from $schema_url."
