# OrgNote Backend - Deployment Commands

# Default recipe
default:
    @just --choose

# === LOCAL DEVELOPMENT ===

# Run linter
lint:
    golangci-lint run

# Run linter with auto-fix
lint-fix:
    golangci-lint run --fix

# Run tests
test:
    go test ./...

# Run tests with verbose output
test-v:
    go test -v ./...

# Run tests with coverage
test-coverage:
    go test -coverprofile=coverage.out ./... && go tool cover -html=coverage.out -o coverage.html

# Check generated subscription API client against schema
check-subscription-api:
    ./check-subscription-api.sh

local:
    docker compose -f docker-compose.db.local.yaml -f docker-compose.local.yaml --env-file .env up -d orgnote-mongo-local orgnote-minio-local orgnote-minio-init-local
    docker compose -f docker-compose.db.local.yaml -f docker-compose.local.yaml --env-file .env up --build orgnote-backend-local

local-down:
    docker compose -f docker-compose.db.local.yaml -f docker-compose.local.yaml --env-file .env down

# Drop local database and all S3 files (removes volumes)
local-reset:
    docker compose -f docker-compose.db.local.yaml -f docker-compose.local.yaml --env-file .env down -v

# iOS local development (uses .env.ios with separate GitHub OAuth App)
local-ios:
    docker compose -f docker-compose.db.local.yaml -f docker-compose.local.yaml -f docker-compose.local.ios.yaml up -d orgnote-mongo-local orgnote-minio-local orgnote-minio-init-local
    docker compose -f docker-compose.db.local.yaml -f docker-compose.local.yaml -f docker-compose.local.ios.yaml up --build orgnote-backend-local

local-ios-down:
    docker compose -f docker-compose.db.local.yaml -f docker-compose.local.yaml -f docker-compose.local.ios.yaml down

# === TRAEFIK (shared) ===

traefik:
    docker compose -f docker-compose.traefik.yaml --env-file .env.traefik up -d

traefik-logs:
    docker logs orgnote-traefik -f

# === PRODUCTION ===

deploy-prod:
    docker compose -f docker-compose.traefik.yaml --env-file .env.traefik up -d
    docker compose -f docker-compose.db.prod.yaml -f docker-compose.prod.yaml --env-file .env.prod up -d --build

prod-down:
    docker compose -f docker-compose.db.prod.yaml -f docker-compose.prod.yaml --env-file .env.prod down

prod-logs:
    docker compose -f docker-compose.db.prod.yaml -f docker-compose.prod.yaml --env-file .env.prod logs -f

prod-logs-backend:
    docker logs orgnote-backend-prod -f

# === DEVELOPMENT (server) ===

deploy-dev:
    docker compose -f docker-compose.traefik.yaml --env-file .env.traefik up -d
    docker compose -f docker-compose.db.dev.yaml -f docker-compose.dev.yaml --env-file .env.dev up -d --build

dev-down:
    docker compose -f docker-compose.db.dev.yaml -f docker-compose.dev.yaml --env-file .env.dev down

dev-logs:
    docker compose -f docker-compose.db.dev.yaml -f docker-compose.dev.yaml --env-file .env.dev logs -f

dev-logs-backend:
    docker logs orgnote-backend-dev -f

# === UTILITIES ===

prune:
    docker system prune -f

ps:
    docker ps

# Check all services status
status:
    @echo "=== All OrgNote containers ===" && docker ps --filter name=orgnote

# Storage stats per user (local)
storage-stats:
    docker exec orgnote-mongo-local mongosh -u dev -p dev --authenticationDatabase admin --quiet orgnote --eval ' \
      const stats = db.file_metadata.aggregate([ \
        { $match: { deletedAt: null } }, \
        { $group: { _id: "$userId", size: { $sum: "$fileSize" }, files: { $sum: 1 } } }, \
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } }, \
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }, \
        { $project: { nick: "$user.nickName", size: 1, files: 1, limit: "$user.spaceLimit" } }, \
        { $sort: { size: -1 } } \
      ]).toArray(); \
      const total = stats.reduce((a, u) => a + u.size, 0); \
      const mb = b => (b / 1024 / 1024).toFixed(2); \
      print("=== Storage Stats ==="); \
      print("Total: " + mb(total) + " MB, Users: " + stats.length); \
      print("---"); \
      stats.forEach(u => { \
        const pct = u.limit > 0 ? ((u.size / u.limit) * 100).toFixed(1) + "%" : "no limit"; \
        print(u.nick + ": " + mb(u.size) + " / " + mb(u.limit || 0) + " MB (" + pct + "), files: " + u.files); \
      }); \
    '
