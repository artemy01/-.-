# Корочки.есть

Портал записи на онлайн-курсы дополнительного профессионального образования.

## Быстрый старт (VS Code)

1. Установите [VS Code](https://code.visualstudio.com/) и [Node.js](https://nodejs.org/) 22+.
2. **Файл → Открыть папку** — папка с проектом (`-.--main`)  
   или **Файл → Открыть рабочую область** — `korochki.code-workspace`.
3. **Терминал → Создать терминал** (`` Ctrl+` ``) и один раз выполните:

   ```bash
   npm install
   ```

4. Нажмите **F5** (или **Run and Debug** → **Запуск сайта**) — сайт откроется в браузере.

Остановка сервера: красная кнопка **Stop** на панели отладки или закройте терминал с `node server.js`.

### Если `npm` не работает в PowerShell (Windows)

В терминале VS Code выберите профиль **Command Prompt** (стрелка ▼ справа от «+» в терминале)  
или выполняйте:

```bash
npm.cmd install
npm.cmd start
```

В проекте терминал по умолчанию настроен на Command Prompt — обычный `npm install` должен работать.

### Задачи без F5

**Terminal → Run Task…**:

| Задача | Назначение |
|--------|------------|
| `npm: install` | Установить зависимости |
| `npm: start` | Запустить сервер в терминале |
| `npm: dev` | Сервер с автоперезагрузкой |
| `Открыть сайт в браузере` | Открыть страницу входа |

## Возможности

- Регистрация и авторизация пользователей
- Формирование заявки на курс (название, дата начала, способ оплаты)
- Просмотр своих заявок и отзывов
- Панель администратора (логин `Admin`, пароль `KorokNET`)

## Стек

- HTML, CSS, JavaScript
- **Node.js** + Express
- **SQLite** (файл `data/korochki.db`, отдельный MySQL не нужен)

## Запуск из терминала

Нужен [Node.js](https://nodejs.org/) 22.5+ (встроенный SQLite, без компиляции и Python).

```bash
cd путь/к/папке-проекта
npm install
npm start
```

Откройте в браузере: **http://localhost:3000/login.html**

База данных создаётся автоматически при первом запуске. При необходимости пересоздать схему и администратора:

```bash
npm run db:init
```

Режим разработки с автоперезапуском при изменении файлов:

```bash
npm run dev
```

Другой порт:

```bash
PORT=8080 npm start
```

## Перенос на другое устройство (где есть Git)

**Что переносить:** всю папку проекта **или** ZIP-архив (без `node_modules` и `data/`).

Создать архив на этом Mac:

```bash
chmod +x scripts/pack-for-transfer.sh
./scripts/pack-for-transfer.sh
```

В папке `Downloads` появится файл `korochki-portal-ГГГГ-ММ-ДД.zip`. Перенесите его через:

- флешку / внешний диск;
- облако (Google Drive, iCloud, Яндекс.Диск);
- AirDrop;
- GitHub (после push) — тогда перенос не нужен.

**На другом устройстве:**

```bash
unzip korochki-portal-*.zip -d ~/Projects/korochki
cd ~/Projects/korochki
npm install
chmod +x scripts/push-github.sh
./scripts/push-github.sh
```

`node_modules` и база `data/korochki.db` создадутся заново при `npm install` и первом `npm start`.

---

## Отправка на GitHub

1. Если Git ещё не установлен: `xcode-select --install`
2. В терминале из папки проекта:

```bash
chmod +x scripts/push-github.sh
./scripts/push-github.sh
```

При первом запуске укажите URL вашего репозитория. Либо вручную:

```bash
git init && git branch -M main
git add -A
git commit -m "Node.js backend, VS Code config, security fix on login"
git remote add origin https://github.com/ВАШ_ЛОГИН/ИМЯ_РЕПО.git
git push -u origin main
```

В репозиторий не попадают `node_modules/` и `data/` (см. `.gitignore`).

## Структура

```
.vscode/             — настройки запуска в VS Code (F5, задачи)
server.js            — веб-сервер и API
db.js                — SQLite
scripts/             — инициализация БД
data/                — файл базы (создаётся автоматически)
js/api.js            — запросы к API с фронтенда
*.html               — страницы сайта
```

## API

- `POST /api/register` — регистрация
- `POST /api/login` — вход пользователя / администратора
- `POST /api/logout` — выход
- `GET/POST /api/applications` — заявки пользователя
- `GET/POST /api/feedback` — отзывы
- `GET/POST /api/admin/applications` — все заявки (админ)
- `POST /api/admin/clear-test-data` — удалить пользователей, заявки и отзывы (админ)
