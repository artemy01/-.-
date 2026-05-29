#!/bin/bash
# Отправка изменений на GitHub (запускайте в терминале macOS / VS Code)
set -e
cd "$(dirname "$0")/.."

if ! command -v git >/dev/null 2>&1; then
  echo "Git не найден. Установите Xcode Command Line Tools:"
  echo "  xcode-select --install"
  exit 1
fi

if [ ! -d .git ]; then
  git init
  git branch -M main
fi

git add -A
git status

if git diff --cached --quiet; then
  echo "Нет изменений для коммита."
  exit 0
fi

git commit -m "$(cat <<'EOF'
Перевод на Node.js и обновления портала

Express API, SQLite (node:sqlite), конфигурация VS Code, убрана подсказка с паролем админа на странице входа.
EOF
)"

if ! git remote get-url origin >/dev/null 2>&1; then
  echo ""
  read -r -p "URL репозитория (например https://github.com/ВАШ_ЛОГИН/gospodypomogy.git): " REMOTE_URL
  git remote add origin "$REMOTE_URL"
fi

echo ""
echo "Отправка на GitHub..."
git push -u origin main

echo "Готово."
