#!/usr/bin/env sh
set -eu

SESSION="meloman-dev"
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
LOG_DIR="$ROOT_DIR/tmp/dev-logs"

NAV_CMD="make dev"
WEB_CMD="cd $ROOT_DIR/meloman-web && npm run dev"
AM_CMD="cd $ROOT_DIR/contrib/audiomuse-ai && ./start.sh"

usage() {
  echo "Usage: $0 {start|stop|attach|status|help}"
  exit 1
}

start_tmux() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "tmux session '$SESSION' already running"
    return 0
  fi

  echo "Creating tmux session '$SESSION' with Navidrome, meloman-web and AudioMuse-AI"
  # Navidrome in first pane
  tmux new-session -d -s "$SESSION" -n navidrome "sh -lc '$NAV_CMD'"
  # Split horizontally and start web
  tmux split-window -h -t "$SESSION:0" "sh -lc '$WEB_CMD'"
  # Split the right pane vertically for audiomuse
  tmux split-window -v -t "$SESSION:0.1" "sh -lc '$AM_CMD'"
  tmux select-layout -t "$SESSION" tiled >/dev/null 2>&1 || true

  echo "tmux session created. Attach with: tmux attach -t $SESSION"
}

start_bg() {
  echo "tmux not found. Falling back to background processes. Logs at $LOG_DIR"
  mkdir -p "$LOG_DIR"

  # Start Navidrome
  (cd "$ROOT_DIR" && sh -lc "$NAV_CMD") > "$LOG_DIR/navidrome.log" 2>&1 &
  NAV_PID=$!
  echo $NAV_PID > "$LOG_DIR/navidrome.pid"

  # Start web
  (cd "$ROOT_DIR/meloman-web" && sh -lc "npm run dev") > "$LOG_DIR/meloman-web.log" 2>&1 &
  WEB_PID=$!
  echo $WEB_PID > "$LOG_DIR/meloman-web.pid"

  # Start AudioMuse-AI
  (cd "$ROOT_DIR/contrib/audiomuse-ai" && sh -lc "./start.sh") > "$LOG_DIR/audiomuse.log" 2>&1 &
  AM_PID=$!
  echo $AM_PID > "$LOG_DIR/audiomuse.pid"

  echo "Started (pids): navidrome=$NAV_PID web=$WEB_PID audiomuse=$AM_PID"
}

stop_tmux() {
  if tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "Killing tmux session '$SESSION'"
    tmux kill-session -t "$SESSION"
  else
    echo "No tmux session '$SESSION' found"
  fi
}

stop_bg() {
  echo "Stopping background processes using pidfiles in $LOG_DIR"
  for f in "$LOG_DIR"/*.pid; do
    [ -f "$f" ] || continue
    pid=$(cat "$f" 2>/dev/null || true)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      echo "Killing $pid (from $f)"
      kill "$pid" || true
    fi
    rm -f "$f"
  done
}

case "${1:-}" in
  start)
    if command -v tmux >/dev/null 2>&1; then
      start_tmux
    else
      start_bg
    fi
    ;;
  stop)
    if command -v tmux >/dev/null 2>&1; then
      stop_tmux
    else
      stop_bg
    fi
    ;;
  attach)
    if command -v tmux >/dev/null 2>&1; then
      tmux attach -t "$SESSION"
    else
      echo "tmux not installed — cannot attach. Use 'sh $0 status' to check background processes."; exit 1
    fi
    ;;
  status)
    if command -v tmux >/dev/null 2>&1; then
      tmux ls | grep "^$SESSION:" && exit 0 || echo "No tmux session named $SESSION"
    fi
    if [ -d "$LOG_DIR" ]; then
      echo "Background pidfiles:"
      ls -1 "$LOG_DIR"/*.pid 2>/dev/null || echo "(none)"
    fi
    ;;
  help|--help|-h|"")
    usage
    ;;
  *)
    usage
    ;;
esac

exit 0
