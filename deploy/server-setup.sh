#!/usr/bin/env bash
# Разовая настройка чистого сервера (Ubuntu/Debian) под этот проект.
# Запускать один раз из-под root: bash deploy/server-setup.sh
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
info() { echo -e "${GREEN}→${NC} $*"; }
die()  { echo -e "${RED}✖${NC} $*"; exit 1; }

[[ $EUID -eq 0 ]] || die "Запустите от root: sudo bash deploy/server-setup.sh"

info "Обновляю списки пакетов..."
apt update -y

info "Ставлю базовые утилиты (git, curl, сборка нативных модулей)..."
apt install -y curl git build-essential python3

info "Ставлю Node.js 20 LTS (через NodeSource)..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

info "Node: $(node -v), npm: $(npm -v)"

info "Ставлю PM2 (менеджер процессов — держит сайт и бота живыми)..."
npm install -g pm2

info "Ставлю nginx (реверс-прокси) и certbot (бесплатный HTTPS)..."
apt install -y nginx certbot python3-certbot-nginx

info "Ставлю sqlite3 (утилита командной строки — пригодится для просмотра БД)..."
apt install -y sqlite3

echo ""
info "Готово! Дальше вручную:"
echo "  1. cd в папку проекта, положите .env с реальными токенами"
echo "  2. npm ci"
echo "  3. npm run build"
echo "  4. pm2 start ecosystem.config.js && pm2 save && pm2 startup"
echo "  5. nginx: скопируйте deploy/nginx.conf.example, впишите домен, sudo certbot --nginx -d ваш-домен.ru"
