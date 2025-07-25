<!-- Назначение файла: руководство по настройке функций Telegram-бота. -->
# Мануал по настройке Telegram-бота

В этом документе описаны базовые шаги для конфигурации и использования функций бота согласно [Telegram Bot API](https://core.telegram.org/bots/api). Предполагается, что бот развёрнут из каталога `bot`.

## Получение токена
1. Откройте диалог с [@BotFather](https://t.me/BotFather).
2. Введите команду `/newbot` и следуйте подсказкам для задания имени и юзернейма.
3. После создания BotFather выдаст токен доступа вида `123456:ABC-DEF` — скопируйте его.
4. Запишите токен в переменную `BOT_TOKEN` файла `.env`.


### Настройка описания и ссылки
Вы также можете настроить описание и аватар:
```bash
curl "https://api.telegram.org/bot${BOT_TOKEN}/setMyDescription" -d 'description=Task manager bot'
curl "https://api.telegram.org/bot${BOT_TOKEN}/setChatPhoto" -F "photo=@avatar.png"
```

## Установка команд бота
Telegram позволяет задать список команд для подсказок пользователю:
```bash
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{"commands":[{"command":"start","description":"Запуск"},
                    {"command":"help","description":"Справка"}]}'
```
Команды будут отображаться в меню клиента Telegram.

Для упрощения в репозитории есть файл `scripts/bot_commands.json` с набором типовых команд и скрипт `scripts/set_bot_commands.sh`:
```bash
BOT_TOKEN=123 scripts/set_bot_commands.sh
```
Скрипт отправит содержимое JSON в метод `setMyCommands` и обновит меню бота.
При деплое на Railway этот скрипт выполняется автоматически через Procfile,
поэтому меню синхронизируется без ручных действий.

### Быстрая настройка через BotFather
Если нет доступа к терминалу, воспользуйтесь диалогом с BotFather:
1. Отправьте команду `/setcommands` и выберите нужного бота.
2. Отправьте список строк вида `команда - описание`. Пример:
   ```
   start - Запуск бота
   help - Справка
   ```
3. Можно прикрепить файл со списком команд или ссылку на него — BotFather примет её и обновит меню.
4. Текущий перечень меню можно получить через `/mybots` → **Bot Settings** → **Edit Commands** и опцию `Copy commands link`.
   Аналогичный запрос через API:
   ```bash
   curl "https://api.telegram.org/bot${BOT_TOKEN}/getMyCommands"
   ```

## Работа без вебхуков
Бот использует только метод `getUpdates` (polling), поэтому настройка вебхука не требуется.

## Отправка сообщений
Примеры запросов к Telegram Bot API:
```bash
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -d chat_id=${CHAT_ID} \
  -d text="Привет!"
```
В коде проекта отправка реализована в `src/bot/bot.js` с помощью библиотеки `node-telegram-bot-api`.

## Использование клавиатур
Для интерактивного взаимодействия можно подключить встроенные клавиатуры:
```javascript
bot.sendMessage(chatId, 'Выберите действие', {
  reply_markup: {
    keyboard: [[{ text: 'Создать задачу' }], ['Список задач']],
    resize_keyboard: true
  }
});
```
Подробнее об опциях клавиатур смотрите в разделе [ReplyKeyboardMarkup](https://core.telegram.org/bots/api#replykeyboardmarkup).

## Создание меню команд без `/`
Чтобы показать пользователю блок кнопок, используйте `Markup.keyboard` и обработчики `bot.hears`. Ниже приведён пример из файла `bot/src/bot/bot.js`:
```javascript
Markup.keyboard([
  ["Справка", "Кто я", "Регистрация"],
  ["Меню задач", "Приложение", "Браузер"]
]).resize()
```
Текстовые сообщения обрабатываются так:
```javascript
bot.hears("Меню задач", async (ctx) => {
  await showTaskMenu(ctx)
})
```
Для callback-кнопок используйте `Markup.inlineKeyboard`.

## Дополнительные функции
- [Inline-режим](https://core.telegram.org/bots/api#inline-mode) позволяет обрабатывать запросы без открытия диалога с ботом.
- В нём доступны команды `add <текст>` для быстрого создания задачи и `search <ключ>` для поиска.
- `sendPhoto` отправляет изображения, пример команды `/send_photo <url>`.
- `editMessageText` позволяет редактировать сообщения, используйте `/edit_last <id> <текст>` — оба аргумента обязательны.
- Для произвольных методов можно вызвать `call('method', params)` из `telegramApi.js`.
- Для международной аудитории подключите `language_code` из объекта `from`.

## Регистрация и администрирование
Бот автоматически сохраняет пользователя при `/start`. Администраторы используют `/list_users` и `/add_user` для управления списком пользователей.
-Ниже приведены основные команды:
- `/create_task` — создать задачу
- Если не указать текст после команды, бот напомнит о необходимости ввести название
- `/list_tasks` — мои задачи
- `/update_task_status` — сменить статус задачи
- `/task_info` — краткое описание задачи
- `/send_photo` — отправить фото по URL
- `/edit_last` — редактировать сообщение
- При первом `/start` бот отправляет ссылку на мини‑приложение, поэтому
  команда `/app` остаётся дополнительным способом открыть его
  Бот выдаёт ссылку и код только участникам группы, указанной в переменной
  `CHAT_ID`, проверяя статус через `getChatMember`.

## Диагностика
Запрос `getMe` проверяет работоспособность токена:
```bash
curl "https://api.telegram.org/bot${BOT_TOKEN}/getMe"
```

## Проверка URL кнопки меню
Скрипт `scripts/get_menu_button_url.js` выводит текущую ссылку в меню Telegram. Если меню сброшено к стандартным командам, вернётся `/empty`.
```bash
node scripts/get_menu_button_url.js
```
Пример вывода при дефолтных переменных окружения:
```
Ошибка: request to https://api.telegram.org/botyour_bot_token/getChatMenuButton failed, reason:
```

## Обновление кнопки меню
Скрипт `scripts/set_menu_button_url.js` отправляет запрос `setChatMenuButton` с типом `web_app`.
URL берётся из переменной `APP_URL` файла `.env`.
```bash
node scripts/set_menu_button_url.js
```
Если задан `CHAT_ID`, кнопка обновится только в указанном чате.

## Включение Attachment Menu
1. В диалоге с [@BotFather](https://t.me/BotFather) выберите нужного бота.
2. Откройте раздел *Attachment Menu* и включите `Enable Attachment Menu`.
3. Страница выбора задачи расположена по пути `/menu` мини‑приложения.
4. Обновите ссылку кнопкой скриптом:
```bash
node scripts/set_attachment_menu_url.js
```

## Типовые ошибки API
Ниже приведён пример сообщения, которое возвращает Bot API:
```
Bad Request: message text is empty
```
Такая ошибка появляется, когда команда не содержит необходимого текста.
После внедрения проверки бот отвечает так:
```
Пожалуйста, укажите текст после команды, иначе задача не будет создана
```

Теперь вы можете адаптировать приведённые примеры под особенности проекта и расширять функциональность бота.

## Вход через код подтверждения


При первом запуске мини‑приложения бот отправляет пользователю шестизначный код. Введите его на странице входа, чтобы получить JWT. Код действует пять минут и проверяется не более пяти раз.

## CSRF и Telegram WebApp

Перед отправкой запросов мини‑приложение вызывает `GET /api/v1/csrf`. Сервер
устанавливает cookie `XSRF-TOKEN` и возвращает значение токена. Клиент
автоматически делает этот запрос при инициализации, копирует токен из cookie и
передаёт его в заголовке `X-XSRF-TOKEN`. При ошибке 403 запрос токена можно
повторить.

## Глубокие ссылки

Бот распознаёт payload в ссылке `/start`.
Примеры форматов:

- `https://t.me/YourBot?start=task_<id>` — открывает задачу в приложении.

После перехода по ссылке бот обработает payload и отправит кнопку для входа в мини‑приложение.

## Короткие ссылки Google Maps
Бот разворачивает URL вида `https://maps.app.goo.gl/...` в полный адрес и сохраняет координаты задачи.

## Обмен данными Web App ↔ бот

После успешного создания задачи в мини‑приложении вызывается
`window.Telegram.WebApp.sendData('task_created:<id>')`.
Бот ловит событие `web_app_data`, распознаёт префикс `task_created` и отправляет
пользователю подтверждение или обновляет список задач.

## Напоминания о сроках

При создании задачи с указанием даты сохраняется поле `remind_at`. Планировщик `scheduler.js` каждые минуты проверяет такие записи и отправляет сообщение в чат, когда время наступает. Период проверки задаётся переменной `SCHEDULE_CRON` в `.env`.

## Запуск в GitHub Actions

Для корректной работы CI нужен доступный MongoDB-хост. Можно использовать
отдельный кластер или выполнить `railway up` через Railway CLI, что поднимет базу
перед тестами.
