# Заметки для Claude Code

## Хостинг и деплой (актуально на 2026-06-25)

Задеплоен на VPS **Kamatera** (Ubuntu 24.04, IP `79.108.163.110`), за reverse-proxy **Caddy** с авто-HTTPS. Доступ к серверу — по SSH-ключу.

- Адрес: **https://suvenir.fedortsov.pro** (поддомен `fedortsov.pro`, регистратор hoster.by, есть wildcard `*.fedortsov.pro`).
- Это Next.js со статическим экспортом (`output: 'export'`). Отдаётся как статика из `/opt/sites/suvenir` (Caddy `file_server`).
- **ВАЖНО при сборке под этот домен:** в `next.config.ts` для GitHub Pages заданы `basePath: '/Suvenir'`, `assetPrefix` и `NEXT_PUBLIC_BASE_PATH` — для поддомена их нужно УБРАТЬ (иначе пути к ресурсам будут вида `/Suvenir/...` и сайт сломается). На сервере сборка: удалить эти строки из `next.config.ts` → `npm run build` → результат в `out/` → скопировать в `/opt/sites/suvenir`.
- GitHub Pages больше не основной деплой.

> Все остальные сервисы владельца тоже перенесены на этот сервер. Полные операционные детали — в памяти чата, открытого в `E:\ClaudeProj\Kassa`.
