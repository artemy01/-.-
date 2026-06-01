#!/bin/bash
# Создаёт ZIP-архив проекта для переноса (без node_modules и локальной БД)
set -e
cd "$(dirname "$0")/.."
NAME="korochki-portal-$(date +%Y-%m-%d)"
OUT="../${NAME}.zip"

echo "Создаю архив: $OUT"
zip -r "$OUT" . \
  -x "node_modules/*" \
  -x "node_modules/**/*" \
  -x "data/*" \
  -x "data/**/*" \
  -x ".DS_Store" \
  -x "*.log"

echo ""
echo "Готово: $OUT"
echo "Перенесите этот файл на другое устройство, распакуйте и выполните:"
echo "  npm install"
echo "  npm start"
echo "  ./scripts/push-github.sh"
