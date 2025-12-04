#!/usr/bin/env sh
# Simple healthcheck script: checks that AudioMuse is reachable and returns code 0 on success
HOST=${1:-http://localhost:8000}

# check root
if curl -sSf -I "$HOST" >/dev/null 2>&1; then
  echo "OK: root accessible: $HOST"
else
  echo "ERROR: root unreachable: $HOST" >&2
  exit 1
fi

# check swagger
if curl -sSf "$HOST/apidocs" >/dev/null 2>&1; then
  echo "OK: API docs accessible"
else
  echo "WARN: /apidocs not reachable, the service may not be fully up yet" >&2
fi

exit 0
