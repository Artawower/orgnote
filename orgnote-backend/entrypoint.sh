#!/bin/sh

migrate -source file://migrations -database "mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_URL}:${MONGO_PORT}/orgnote?authSource=admin" up
./orgnote
