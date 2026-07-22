#!/usr/bin/env bash
# Полный запуск сайта + Telegram-бота (в фоне, не зависит от терминала Cursor)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info() { echo -e "${GREEN}→${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
die()  { echo -e "${RED}✖${NC} $*"; exit 1; }

command -v node >/dev/null || die "Нужен Node.js (https://nodejs.org)"
command -v npm  >/dev/null || die "Нужен npm"

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  die "Нужен Node.js 18+, сейчас: $(node -v)"
fi

if [[ ! -f .env ]]; then
  warn "Файл .env не найден — создаю шаблон"
  cat > .env <<'EOF'
TELEGRAM_BOT_TOKEN=
ADMIN_PASSWORD=admin
OWNER_USERNAME=ellieene
SESSION_SECRET=

# Домен сайта после покупки (без слэша на конце) — нужен для sitemap.xml, robots.txt и SEO
NEXT_PUBLIC_SITE_URL=

# SMTP для ежемесячных Excel-отчётов по заказам на почту
SMTP_HOST=smtp.mail.ru
SMTP_PORT=465
SMTP_USER=
SMTP_PASSWORD=
EOF
  die "Заполните TELEGRAM_BOT_TOKEN в .env и запустите снова"
fi

if ! grep -q '^SESSION_SECRET=.\+' .env; then
  info "Генерирую SESSION_SECRET..."
  SECRET="$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
  if grep -q '^SESSION_SECRET=' .env; then
    if sed --version >/dev/null 2>&1; then
      sed -i "s/^SESSION_SECRET=.*/SESSION_SECRET=$SECRET/" .env
    else
      sed -i '' "s/^SESSION_SECRET=.*/SESSION_SECRET=$SECRET/" .env
    fi
  else
    printf '\nSESSION_SECRET=%s\n' "$SECRET" >> .env
  fi
fi

if grep -q '^ADMIN_PASSWORD=admin *$' .env; then
  warn "ADMIN_PASSWORD в .env всё ещё равен дефолтному 'admin' — смените на сложный пароль перед публичным запуском!"
fi

mkdir -p data public/images .run

if [[ ! -d node_modules ]]; then
  info "Устанавливаю зависимости (npm install)..."
  npm install
else
  info "Зависимости уже установлены"
fi

# Останавливаем предыдущий запуск этого проекта
if [[ -x "$ROOT/stop.sh" ]]; then
  bash "$ROOT/stop.sh" >/dev/null 2>&1 || true
fi

MODE="${1:-dev}"
WEB_LOG="$ROOT/.run/web.log"
BOT_LOG="$ROOT/.run/bot.log"
WEB_PID_FILE="$ROOT/.run/web.pid"
BOT_PID_FILE="$ROOT/.run/bot.pid"

: > "$WEB_LOG"
: > "$BOT_LOG"

start_bot() {
  info "Запускаю Telegram-бота..."
  nohup npm run bot >>"$BOT_LOG" 2>&1 &
  echo $! > "$BOT_PID_FILE"
}

start_web_dev() {
  info "Запускаю сайт (dev)..."
  nohup npm run dev >>"$WEB_LOG" 2>&1 &
  echo $! > "$WEB_PID_FILE"
}

start_web_prod() {
  info "Сборка production..."
  npm run build
  info "Запускаю сайт (production)..."
  nohup npm run start >>"$WEB_LOG" 2>&1 &
  echo $! > "$WEB_PID_FILE"
}

case "$MODE" in
  prod|production)
    start_web_prod
    start_bot
    ;;
  *)
    start_web_dev
    start_bot
    ;;
esac

# Ждём готовности сайта
info "Жду готовности http://localhost:3000 ..."
READY=0
for _ in $(seq 1 40); do
  if curl -sf -o /dev/null --max-time 1 http://127.0.0.1:3000/ >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 0.5
done

echo ""
if [[ "$READY" -eq 1 ]]; then
  info "Сайт готов:     http://localhost:3000"
else
  warn "Сайт ещё стартует — смотрите лог: .run/web.log"
  info "Адрес:          http://localhost:3000"
fi
info "Админка:        http://localhost:3000/admin"
info "Лог сайта:      .run/web.log"
info "Лог бота:       .run/bot.log"
info "Остановка:      ./stop.sh"
echo ""
info "Процессы работают в фоне (nohup)."
