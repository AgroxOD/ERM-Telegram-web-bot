Вот однострочный Markdown-текст, который вы можете скопировать и вставить в файл `ModuleCore.md`, чтобы использовать его как основу для перехода на модульность (в духе NestJS и лучших практик) и затем дать этот файл в Codex:

```markdown
## ModuleCore.md 📁

### Цель проекта  
Преобразовать текущий Express‑backend на Node.js/TypeScript в модульную архитектуру в стиле NestJS, сохранив стек технологий (Express, MongoDB, TypeScript), но приняв лучшие практики: разделение на feature‑модули (auth, tasks, users, roles, logs), чёткий слой контроллеров и сервисов, DTO‑валидация, зависимость через DI, декораторы / guards для RBAC и audit‑логирование.

### Структура каталогов  
```

src/
common/
decorators/
guards/
dto/
error-handler.ts
logger.ts
modules/
auth/
auth.controller.ts
auth.service.ts
auth.dto.ts
auth.guard.ts
tasks/
tasks.controller.ts
tasks.service.ts
tasks.dto.ts
tasks.guard.ts
users/
roles/
logs/
config/
app.ts

```

### Технологии и подходы  
- Express + TypeScript, MongoDB через Mongoose  
- Инъекция зависимостей (tsyringe або inversify)  
- class-validator / DTO-пайпы для валидации  
- Кастомные декораторы `@Roles('admin')` или `@Access(2)` + guards, проверяющие `req.user.role/access`  
- AuthService: OTP через Telegram, проверки группы, выдача JWT и CSRF-токена, установка HttpOnly cookie  
- Middleware/interceptor для логирования запросов и ошибок, audit-логи (включая userId и событие)  
- Prometheus-метрики (CSRF ошибки, операция задачи, логины) и endpoint health-check

### Модули и их ответственность  
**AuthModule**: вход по Telegram‑коду, выдача JWT, CSRF, логирование входов  
**TasksModule**: CRUD задач, рассчеты маршрутов, права доступа (user только свои задачи, admin все)  
**UsersModule** (admin): управление пользователями  
**RolesModule**: CRUD ролей, управление permissions  
**LogsModule**: просмотр и запись логов (audit), логирование неудачных попыток доступа и CSRF‑failures

### Этапы внедрения (Roadmap)  
1. Определить структуру и архитектуру в ModuleCore.md  
2. Настроить DI контейнер и структурирование модулей  
3. Создать DTO‑классы и middleware для валидации  
4. Реализовать декораторы и guards для RBAC  
5. Перенести авторизацию (Telegram, JWT, CSRF) в AuthModule  
6. Поочередно перенести Tasks, Users, Roles и Logs модули  
7. Добавить middleware для логирования и Prometheus‑метрик  
8. Покрыть код unit‑ и e2e‑тестами  
9. Обеспечить обратную совместимость API и плавный релиз

### KPI и критерии успеха  
- Устранение ошибок CSRF (<1 %)  
- Все POST/PATCH routes защищены DTO‑валидацией (>95 %)  
- RBAC работает корректно (user не может изменять чужие задачи)  
- Тестовое покрытие > 80 %  
- Логи содержат userId для каждого действия, включая попытки админ‑доступа


