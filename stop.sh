#!/usr/bin/env bash
# Остановка сайта и бота этого проекта
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

kill_pidfile() {
  local file="$1"
  local name="$2"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file" 2>/dev/null || true)"
    if [[ -n "${pid:-}" ]] && kill -0 "$pid" 2>/dev/null; then
      # убиваем дерево процессов npm/node
      pkill -P "$pid" 2>/dev/null || true
      kill "$pid" 2>/dev/null || true
      sleep 0.3
      kill -9 "$pid" 2>/dev/null || true
      echo "Остановлен $name (pid $pid)"
    fi
    rm -f "$file"
  fi
}

kill_pidfile "$ROOT/.run/web.pid" "сайт"
kill_pidfile "$ROOT/.run/bot.pid" "бот"

# На всякий случай — только процессы из этой папки
if command -v lsof >/dev/null 2>&1; then
  PIDS="$(lsof -tiTCP:3000 -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${PIDS}" ]]; then
    # shellcheck disable=SC2086
    kill $PIDS 2>/dev/null || true
    sleep 0.2
    # shellcheck disable=SC2086
    kill -9 $PIDS 2>/dev/null || true
  fi
fi

pkill -f "$ROOT/.*tsx src/bot/index.ts" 2>/dev/null || true
pkill -f "$ROOT/.*next dev" 2>/dev/null || true
pkill -f "$ROOT/.*next start" 2>/dev/null || true

echo "Готово."
