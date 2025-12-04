#!/usr/bin/env fish
# Fish shell wrapper for running docker compose or docker-compose

if docker compose version >/dev/null 2>&1
  # Ensure network exists when using fish wrapper too
  if not docker network inspect meloman-network >/dev/null 2>&1
    docker network create meloman-network
  end
  docker compose $argv
  exit $status
end

if type -q docker-compose
  if not docker network inspect meloman-network >/dev/null 2>&1
    docker network create meloman-network
  end
  docker-compose $argv
  exit $status
end

echo "Could not find Docker Compose. Install 'docker compose' or 'docker-compose'."; exit 1
