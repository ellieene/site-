#!/usr/bin/env bash
# Настройка nginx (реверс-прокси) + бесплатный SSL от Let's Encrypt для ukusi-nsk.ru
# Запускать один раз от root, ПОСЛЕ deploy/server-setup.sh и после того как проект
# уже лежит на сервере (это не запускает сам сайт — см. ./start.sh или PM2).
set -euo pipefail

DOMAIN="ukusi-nsk.ru"
WWW_DOMAIN="www.ukusi-nsk.ru"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
info() { echo -e "${GREEN}→${NC} $*"; }
die()  { echo -e "${RED}✖${NC} $*"; exit 1; }

[[ $EUID -eq 0 ]] || die "Запустите от root: sudo bash deploy/setup-nginx-ssl.sh"
command -v nginx >/dev/null   || die "nginx не установлен — сначала: bash deploy/server-setup.sh"
command -v certbot >/dev/null || die "certbot не установлен — сначала: bash deploy/server-setup.sh"

info "Пишу конфиг nginx для $DOMAIN (проект: $PROJECT_ROOT)..."
# /uploads/ намеренно НЕ отдаётся напрямую (alias) — проект лежит в /root/...,
# каталог /root закрыт для всех, кроме root, nginx (www-data/nginx) не смог бы
# прочитать файлы. Пускаем всё через Next.js, он и так работает от root.
cat > /etc/nginx/sites-available/ukusi <<EOF
server {
    listen 80;
    server_name $DOMAIN $WWW_DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    client_max_body_size 6M;
}
EOF

ln -sf /etc/nginx/sites-available/ukusi /etc/nginx/sites-enabled/ukusi
rm -f /etc/nginx/sites-enabled/default

info "Проверяю конфиг nginx..."
nginx -t

info "Перезапускаю nginx..."
systemctl reload nginx || systemctl restart nginx

echo ""
info "nginx настроен на порт 80. Убедитесь, что сайт запущен на 127.0.0.1:3000 (./start.sh prod)."
echo ""
read -rp "Email для Let's Encrypt (уведомления об истечении сертификата): " LE_EMAIL
[[ -n "$LE_EMAIL" ]] || die "Email обязателен для certbot"

info "Получаю SSL-сертификат от Let's Encrypt..."
certbot --nginx -d "$DOMAIN" -d "$WWW_DOMAIN" --non-interactive --agree-tos -m "$LE_EMAIL" --redirect

echo ""
info "Готово! Сайт должен открываться по https://$DOMAIN"
info "Не забудьте поменять NEXT_PUBLIC_SITE_URL в .env на https://$DOMAIN и перезапустить сайт"
info "Проверка автопродления сертификата: certbot renew --dry-run"
