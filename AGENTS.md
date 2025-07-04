🧠 Инструкции для Codex

- Документация и комментарии пишутся только по‑русски
- В начале каждого файла указывайте назначение и основные модули
- Текстовые сообщения бота в `bot/src/messages.js` должны быть на русском
- Код делайте лаконичным и понятным

✅ Тесты
- Перед коммитом запускайте `./scripts/setup_and_test.sh`
- При отсутствии `.env` используйте `./scripts/create_env_from_exports.sh`
- Если есть `docker-compose.yml`, выполняйте `docker compose config`

📄 Документация
- При изменениях обновляйте README.md, CHANGELOG.md, ROADMAP.md и AGENTS.md
- Каталог `bot` содержит сервер и веб‑интерфейс
- Веб-клиент использует meta description и файл `robots.txt` для SEO
- `.env.example` использует подключение `mongodb://admin:admin@localhost:27017/agrmcs?authSource=admin`
- Для GitHub Actions требуется собственный MongoDB-хост или Railway CLI
- Рекомендуется проверять базу командой `npm --prefix bot run check:mongo`
- Переменная `BOT_API_URL` позволяет использовать локальный telegram-bot-api
- Docker Compose содержит healthcheck для MongoDB
- Добавлена пагинация списка задач в API
- В задачи добавлено поле `slug`
- Появилась универсальная модель `UniversalTask`
- В расширенной модели появились поля с enum и default: `transport_type`,
  `payment_method`, `priority`, `status`
- Добавлена универсальная заявка с разделами логистики, закупок и работ;
  CRUD-маршруты доступны по `/api/universal_tasks`
- Для редактирования значений enum есть коллекции `DefaultValue` и `Transport`,
  эндпойнты `/api/defaults/:name` и `/api/transports`
- Для них действует rate limit и проверка входных данных
- Отделы редактируются через `/api/departments` и страницу `/defaults`

