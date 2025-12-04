#!/usr/bin/env sh
# POSIX shell script helper to run the appropriate compose command
# Detects availability of 'docker compose' plugin or 'docker-compose' binary

set -eu

compose_cmd=""

if docker compose version >/dev/null 2>&1; then
  compose_cmd="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  compose_cmd="docker-compose"
fi

if [ -z "$compose_cmd" ]; then
  cat <<'EOF'
Could not find Docker Compose.
Please install the plugin or the legacy binary.

On Debian/Ubuntu:
  sudo apt-get update
  sudo apt-get install docker-compose-plugin
  # then use: docker compose up -d

Alternatively, install the legacy binary:
  sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
  # then use: docker-compose up -d

See https://docs.docker.com/compose/ for more details.
EOF
  exit 1
fi

# Ensure meloman-network exists because docker-compose.yml declares it as external
if ! docker network ls --format "{{.Name}}" | grep -q "^meloman-network$"; then
  echo "Creating docker network 'meloman-network'"
  docker network create meloman-network || true
fi

# Run the appropriate command with the provided arguments
exec $compose_cmd "$@"
