FROM oven/bun:1.0.2
WORKDIR /app
RUN bun install -g @quasar/cli

COPY package*.json ./
RUN bun install 

COPY . .
