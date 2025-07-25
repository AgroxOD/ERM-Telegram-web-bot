// Конфигурация pm2 для запуска API и бота
module.exports = {
  apps: [
    {
      name: 'api',
      script: 'src/api/api.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: 5000,
      restart_delay: 5000,
    },
    {
      name: 'bot',
      script: 'src/bot/bot.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: 5000,
      restart_delay: 5000,
    }
  ]
}
