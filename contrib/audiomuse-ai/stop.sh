#!/usr/bin/env sh
# Stop AudioMuse-AI
set -eu

if [ -f ./run-compose.sh ]; then
  ./run-compose.sh down
else
  if docker compose version >/dev/null 2>&1; then
    docker compose down
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose down
  else
    echo "Docker Compose not found. Install docker compose plugin or docker-compose binary." >&2
    exit 1
  fi
fi

echo "AudioMuse-AI stopped."