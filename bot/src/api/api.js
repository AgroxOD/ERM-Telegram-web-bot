// HTTP API и мини-приложение. Модули: express, express-rate-limit,
// сервисы и middleware. spaRateLimiter ограничивает SPA fallback
// и использует маршрут "/*splat" вместо устаревшего "/{*splat}".
// Отдельный эндпойнт /health возвращает состояние сервера.
require('dotenv').config();
const config = require('../config');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const lusca = require('lusca');
const { body, validationResult } = require('express-validator');
const path = require('path');
const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const client = require('prom-client');
const { swaggerUi, specs } = require('./swagger');

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection in API:', err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in API:', err);
  process.exit(1);
});
const tasksRouter = require('../routes/tasks');
const mapsRouter = require('../routes/maps');
const routeRouter = require('../routes/route');
const routesRouter = require('../routes/routes');
const optimizerRouter = require('../routes/optimizer');
const authUserRouter = require('../routes/authUser');
const formatUser = require('../utils/formatUser');
const {
  updateTaskStatus,
  createUser,
  listUsers,
  listRoles,
  updateRole,
  writeLog,
  listLogs,
} = require('../services/service');
const { verifyToken, asyncHandler, errorHandler } = require('./middleware');
const checkRole = require('../middleware/checkRole');
const { ACCESS_ADMIN } = require('../utils/accessMask');

const validate = (validations) => [
  ...validations,
  (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    res.status(400).json({ errors: errors.array() });
  },
];

(async () => {
  // подключение к MongoDB и моделям
  const connect = require('../db/connection');
  await connect();
  require('../db/model');
  const app = express();
  app.use(require('./middleware').requestLogger);
  // при отсутствии статических файлов выполняем сборку мини-приложения
  const root = path.join(__dirname, '../..');
  const pub = path.join(root, 'public');
  const indexFile = path.join(pub, 'index.html');
  let needBuild = false;
  try {
    const st = await fs.stat(indexFile);
    if (st.size === 0) needBuild = true;
  } catch {
    needBuild = true;
  }
  if (needBuild) {
    console.log('Сборка интерфейса...');
    await execAsync('npm run build-client', { cwd: root });
  }
  // доверяем только первому прокси, чтобы получать корректный IP
  // и не допустить обход rate limit по X-Forwarded-For
  app.set('trust proxy', 1);
  app.use(express.json());
  app.use(cookieParser());
  // сессия для хранения CSRF-токена
  const domain = new URL(config.appUrl).hostname;
  const sessionOpts = {
    secret: process.env.SESSION_SECRET || 'session_secret',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      domain,
    },
  };
  if (process.env.NODE_ENV !== 'test') {
    sessionOpts.store = MongoStore.create({
      mongoUrl: config.mongoUrl,
      collectionName: 'sessions',
    });
  }
  app.use(session(sessionOpts));
  // защита от CSRF через lusca, токен кладётся в cookie XSRF-TOKEN
  const csrf = lusca.csrf({
    angular: true,
    cookie: {
      options: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
        domain,
      },
    },
  });
  const csrfExclude = [
    '/api/v1/auth/send_code',
    '/api/v1/auth/verify_code',
    '/api/v1/csrf',
    '/api/v1/optimizer',
    '/api/v1/maps/expand',
  ];
  app.use((req, res, next) => {
    const url = req.originalUrl.split('?')[0];
    if (csrfExclude.includes(url)) return next();
    return csrf(req, res, next);
  });
  // политика безопасности без карт Google, разрешены тайлы OpenStreetMap
  const connectSrc = ["'self'"];
  try {
    connectSrc.push(new URL(config.routingUrl).origin);
  } catch {
    // если значение routingUrl не похоже на URL, игнорируем ошибку
  }
  // разрешаем обращение к публичному OSRM
  connectSrc.push('https://router.project-osrm.org');
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'frame-src': ["'self'", 'https://oauth.telegram.org'],
          'script-src': ["'self'", "'unsafe-eval'", 'https://telegram.org'],
          'media-src': ["'self'", 'data:'],
          'img-src': [
            "'self'",
            'data:',
            'https://a.tile.openstreetmap.org',
            'https://b.tile.openstreetmap.org',
            'https://c.tile.openstreetmap.org',
          ],
          'connect-src': connectSrc,
        },
      },
    }),
  );
  app.use(cors());
  const prefix = '/api/v1';
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

  // простая проверка работоспособности контейнера
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  client.collectDefaultMetrics();
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });
  app.get(`${prefix}/csrf`, csrf, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });

  // лимит запросов к пользователям: 100 за 15 минут
  const usersRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
  });
  const logsRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
  });
  const rolesRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many requests, please try again later.' },
  });

  const taskStatusRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: { error: 'Too many requests, please try again later.' },
  });
  // ограничение обращений к SPA: 50 в минуту
  const spaRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use(express.static(path.join(__dirname, '../../public')));

  // Кастомный бекенд админки с базовой аутентификацией
  const initAdmin = require('../admin/customAdmin');
  initAdmin(app);

  // авторизация реализована через код подтверждения из Telegram

  // Устаревшие маршруты /tasks удалены, используйте /api/tasks

  app.get(
    `${prefix}/users`,
    usersRateLimiter,
    verifyToken,
    checkRole(ACCESS_ADMIN),
    asyncHandler(async (_req, res) => {
      const users = await listUsers();
      res.json(users.map((u) => formatUser(u)));
    }),
  );
  app.post(
    `${prefix}/users`,
    usersRateLimiter,
    verifyToken,
    checkRole(ACCESS_ADMIN),
    validate([
      body('id').isInt(),
      body('username').isString().notEmpty(),
      body('roleId').optional().isMongoId(),
    ]),
    asyncHandler(async (req, res) => {
      const user = await createUser(
        req.body.id,
        req.body.username,
        req.body.roleId,
      );
      res.json(formatUser(user));
    }),
  );

  app.get(
    `${prefix}/roles`,
    rolesRateLimiter,
    verifyToken,
    checkRole(ACCESS_ADMIN),
    asyncHandler(async (_req, res) => {
      res.json(await listRoles());
    }),
  );

  app.patch(
    `${prefix}/roles/:id`,
    rolesRateLimiter,
    verifyToken,
    checkRole(ACCESS_ADMIN),
    validate([
      body('permissions')
        .isArray()
        .custom((array) =>
          array.every(
            (item) => typeof item === 'string' || typeof item === 'number',
          ),
        ),
    ]),
    asyncHandler(async (req, res) => {
      const role = await updateRole(req.params.id, req.body.permissions);
      res.json(role);
    }),
  );

  /**
   * @swagger
   * /api/logs:
   *   get:
   *     summary: Получить последние логи
   *     security:
   *       - bearerAuth: []
   */

  app.get(
    `${prefix}/logs`,
    logsRateLimiter,
    verifyToken,
    checkRole(ACCESS_ADMIN),
    asyncHandler(async (req, res) => {
      res.json(await listLogs(req.query));
    }),
  );

  app.post(
    `${prefix}/logs`,
    logsRateLimiter,
    verifyToken,
    asyncHandler(async (req, res) => {
      if (typeof req.body.message === 'string') {
        await writeLog(req.body.message);
      }
      res.json({ status: 'ok' });
    }),
  );

  app.post(
    `${prefix}/tasks/:id/status`,
    taskStatusRateLimiter,
    verifyToken,

    validate([
      body('status').isIn(['Новая', 'В работе', 'Выполнена', 'Отменена']),
    ]),
    asyncHandler(async (req, res) => {
      await updateTaskStatus(req.params.id, req.body.status);
      await writeLog(`Статус задачи ${req.params.id} -> ${req.body.status}`);
      res.json({ status: 'ok' });
    }),
  );

  // авторизация пользователей и личный кабинет
  app.use(`${prefix}/auth`, authUserRouter);
  // работа с картами
  app.use(`${prefix}/maps`, mapsRouter);
  // маршрут
  app.use(`${prefix}/route`, routeRouter);
  // оптимизация маршрута
  app.use(`${prefix}/optimizer`, optimizerRouter);
  // список маршрутов
  app.use(`${prefix}/routes`, routesRouter);
  // новые REST маршруты для расширенной работы с задачами
  app.use(`${prefix}/tasks`, tasksRouter);

  // явно обрабатываем корневой адрес, чтобы исключить 403
  app.get('/', spaRateLimiter, (_req, res) => {
    res.sendFile(path.join(pub, 'index.html'));
  });

  // SPA fallback: Express 5 использует синтаксис `/*splat`
  // вместо устаревшего `/{*splat}` или "*"
  app.get('/*splat', spaRateLimiter, (_req, res) => {
    res.sendFile(path.join(pub, 'index.html'));
  });

  app.use(errorHandler);

  const port = config.port;
  app.listen(port, '0.0.0.0', () => {
    console.log(`API запущен на порту ${port}`);
    console.log(
      `Окружение: ${process.env.NODE_ENV || 'development'}, Node ${process.version}`,
    );
  });
})();
