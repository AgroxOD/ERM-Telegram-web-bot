<!-- Назначение файла: план внедрения рекомендаций из анализа. Затрагиваются модули bot и web. -->

# План внедрения рекомендаций

Документ содержит задачи по реализации предложений из проведённого анализа. Они сгруппированы по направлениям.

## Бекенд

1. Подготовить постепенную миграцию кода на TypeScript: настроить сборку и добавить типы для сервисов.
2. Проверить индексы MongoDB на полях фильтрации задач и пользователей.
3. Настроить ротацию коллекции логов, удаляя записи старше 30 дней.
4. Добавить алерты Prometheus на рост метрик ошибок и CSRF.
5. Расширить набор автотестов, покрывая критичные маршруты и проверки ролей.

## Фронтенд

1. Провести тестирование интерфейса в актуальных браузерах и на мобильных устройствах.
2. Реализовать переключение тёмной темы через Tailwind.
3. Проверить контрастность текста по WCAG и скорректировать цвета при необходимости.
4. Доработать поиск и фильтры задач, добавить всплывающие уведомления об успехе и ошибках.

## Безопасность

1. Использовать DOMPurify для очистки HTML описаний задач.
2. Настроить лимит попыток отправки кода авторизации и добавить логирование этих событий.
3. Регулярно обновлять зависимости через npm audit и Dependabot.

## Telegram-бот

1. Обновить команду `/help`, указав все доступные действия.
2. Добавить inline-кнопки для смены статуса задач прямо из списка.
3. Использовать `sendChatAction('typing')` при длительных операциях.
4. Реализовать команду `/feedback` для сбора отзывов.

## Общие задачи

1. Завершить настройку CI/CD на GitHub Actions с автодеплоем на Railway.
2. Дополнить документацию диаграммами архитектуры.

