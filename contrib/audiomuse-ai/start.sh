#!/usr/bin/env sh
# Start AudioMuse-AI with either docker compose or docker-compose
set -eu
# Ensure .env exists
if [ ! -f .env ]; then
  echo ".env does not exist. Copy .env.example to .env and edit it first." >&2
  exit 1
fi

# Use helper script if present
if [ -f ./run-compose.sh ]; then
  # Ensure Docker network exists if compose expects it
  if ! docker network ls --format "{{.Name}}" | grep -q "^meloman-network$"; then
    echo "Creating docker network 'meloman-network'"
    docker network create meloman-network || true
  fi
  ./run-compose.sh up -d
else
  # Fallback: try docker compose then docker-compose
  if docker compose version >/dev/null 2>&1; then
    # Ensure network exists
    if ! docker network ls --format "{{.Name}}" | grep -q "^meloman-network$"; then
      echo "Creating docker network 'meloman-network'"
      docker network create meloman-network || true
    fi
    docker compose up -d
  elif command -v docker-compose >/dev/null 2>&1; then
    if ! docker network ls --format "{{.Name}}" | grep -q "^meloman-network$"; then
      echo "Creating docker network 'meloman-network'"
      docker network create meloman-network || true
    fi
    docker-compose up -d
  else
    echo "Docker Compose not found. Install docker compose plugin or docker-compose binary." >&2
    exit 1
  fi
fi

echo "AudioMuse-AI started (or attempted to start). Use './run-compose.sh ps' to inspect services."