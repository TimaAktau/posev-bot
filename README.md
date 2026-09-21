# Посевы — Telegram-бот

Обычный бот в чате (не Mini App). Grammy + SQLite.

Пока нет PDF, формы `?start=` и бэкапа — сначала живой клиент и `/report`.

## Токен

```bash
cp .env.example .env
```

В `.env`:

```
BOT_TOKEN=123456789:AA...ваш_токен
```

В BotFather `/setcommands`:

```
add_client - клиент
add_placement - посев
add_lead - заявка
clients - список клиентов
report - отчёт CPL
set_cpl_limit - порог CPL
help - команды
```

## Локально

```bash
cd posev-bot
npm install
npm run dev
```

Первый `/start` — вы админ.

## 24/7 на Railway (рекомендуется)

Локальный `npm run dev` умрёт, когда закроете терминал. Railway держит процесс.

1. Репозиторий с папкой `posev-bot` (без `.env`) на GitHub.
2. [Railway](https://railway.app) → New Project → Deploy from GitHub → этот репозиторий. Root directory: `posev-bot`, если бот не в корне.
3. Variables: `BOT_TOKEN` = токен от BotFather. `DATA_DIR` = `/data`.
4. Volume: New Volume, mount `/data`. Без тома SQLite сотрётся при каждом деплое.
5. Deploy. В логах: `Бот @username запущен`.
6. В Telegram `/start`. Если бот уже крутился локально — остановите локальный процесс, иначе два polling конфликтуют.

VPS: Docker из `Dockerfile`, `-v posev-data:/data`, `-e BOT_TOKEN=...`.

## Команды

- `/add_client` `/add_placement` `/add_lead` — вести работу только здесь
- `/report` — потрачено / лиды / CPL
- `/set_cpl_limit` — порог, иначе алерты бессмысленны
