<!-- Назначение файла: план нагрузочного тестирования и хаос-теста. -->

# План стресс-тестирования

1. Используйте `locust` из каталога `loadtest`.
2. Запуск локально:
   ```bash
   locust -f loadtest/locustfile.py --host http://localhost:3000 \
     --users 300 --spawn-rate 30
   ```
3. Наблюдайте среднее время ответа и процент неудачных запросов.
4. После изменения инфраструктуры тест повторяется.
5. Для проверки устойчивости можно включить команду `npm --prefix bot run chaos`.

## Чек-лист отказоустойчивости

1. Ежедневно сохраняйте резервную копию MongoDB командой
   `mongodump --archive=backup.gz --gzip`.
2. Храните копии минимум на двух хостах.
4. При сбое основного сервера:
   - запустите резервную базу,
   - восстановите данные `mongorestore --archive=backup.gz --gzip`,
   - обновите переменные подключения в `.env` и перезапустите сервисы.
5. DNS должен указывать на запасной сервер в течение пяти минут.
