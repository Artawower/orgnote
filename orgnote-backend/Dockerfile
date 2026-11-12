FROM golang:1.24-alpine

WORKDIR /workspace
ENV GO111MODULE=on

COPY go.mod go.sum entrypoint.sh ./
RUN go mod download && go mod verify

COPY app app
COPY migrations migrations
ARG SUBSCRIPTION_SCHEMA_URL=http://localhost:8000/api/schema/
RUN go install github.com/deepmap/oapi-codegen/cmd/oapi-codegen@v1.16.3
COPY generate-subscription-api.sh generate-subscription-api.sh
RUN SUBSCRIPTION_SCHEMA_URL="$SUBSCRIPTION_SCHEMA_URL" sh generate-subscription-api.sh
RUN go build -o orgnote app/main.go
RUN go install -tags 'mongodb' github.com/golang-migrate/migrate/v4/cmd/migrate@v4.17.1

ENTRYPOINT ["./entrypoint.sh"]
