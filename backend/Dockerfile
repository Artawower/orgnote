FROM golang:1.18.4-alpine

WORKDIR /workspace
ENV GO111MODULE=on

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY app app
RUN go build -o second-brain app/main.go

ENTRYPOINT ["./second-brain"]
