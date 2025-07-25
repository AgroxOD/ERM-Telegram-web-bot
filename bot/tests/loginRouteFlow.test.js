process.env.NODE_ENV = 'test';
process.env.BOT_TOKEN = 't';
process.env.CHAT_ID = '1';
process.env.JWT_SECRET = 'secret';
process.env.MONGO_DATABASE_URL = 'mongodb://localhost/db';
process.env.APP_URL = 'https://localhost';

const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const lusca = require('lusca');
const request = require('supertest');
jest.unmock('jsonwebtoken');

jest.mock('../src/services/telegramApi', () => ({ call: jest.fn() }));
jest.mock('../src/services/userInfoService', () => ({
  getMemberStatus: jest.fn(async () => 'member'),
}));

jest.mock('../src/db/queries', () => ({
  getUser: jest.fn(async () => null),
  createUser: jest.fn(async () => ({ username: 'u' })),
  updateUser: jest.fn(async () => ({})),
}));

const authRouter = require('../src/routes/authUser');
const routeRouter = require('../src/routes/route');
const { verifyToken, errorHandler } = require('../src/api/middleware');
const { codes } = require('../src/services/otp');
const { stopScheduler } = require('../src/services/scheduler');
const { stopQueue } = require('../src/services/messageQueue');

let app;
beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(
    session({
      secret: 'test',
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: true,
        sameSite: 'none',
        domain: 'localhost',
      },
    }),
  );
  const csrf = lusca.csrf({
    angular: true,
    cookie: { options: { sameSite: 'none', domain: 'localhost' } },
  });
  app.use((req, res, next) => {
    const url = req.originalUrl.split('?')[0];
    if (
      [
        '/api/v1/auth/send_code',
        '/api/v1/auth/verify_code',
        '/api/v1/csrf',
      ].includes(url)
    ) {
      return next();
    }
    return csrf(req, res, next);
  });
  app.get('/api/v1/csrf', csrf, (req, res) => {
    res.json({ csrfToken: req.csrfToken() });
  });
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/route', routeRouter);
  app.use(errorHandler);
});

afterAll(() => {
  stopScheduler();
  stopQueue();
});

test('полный цикл логина и запроса', async () => {
  const agent = request.agent(app);
  const csrfRes = await agent.get('/api/v1/csrf');
  const token = csrfRes.body.csrfToken;
  expect(csrfRes.headers['set-cookie'][0]).toMatch(/XSRF-TOKEN/);
  expect(csrfRes.headers['set-cookie'][0]).toMatch(/SameSite=None/);
  expect(token).toBeDefined();
  await agent.post('/api/v1/auth/send_code').send({ telegramId: 1 });
  const code = codes.get('1').code;
  const verifyRes = await agent
    .post('/api/v1/auth/verify_code')
    .set('X-XSRF-TOKEN', token)
    .send({ telegramId: 1, code, username: 'u' });
  expect(verifyRes.body.token).toBeDefined();
  expect(verifyRes.headers['set-cookie'][0]).toMatch(/token=/);
  expect(verifyRes.headers['set-cookie'][0]).toMatch(/Secure/);
  expect(verifyRes.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
  const res = await agent
    .post('/api/v1/route')
    .set('X-XSRF-TOKEN', token)
    .set('Authorization', `Bearer ${verifyRes.body.token}`)
    .send({ start: { lat: 1, lng: 2 }, end: { lat: 3, lng: 4 } });
  expect(res.status).toBeLessThan(500);
});
