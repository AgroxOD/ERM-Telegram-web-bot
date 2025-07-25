// Планировщик напоминаний для задач.
// Использует node-cron и Telegram Bot API.
const cron = require('node-cron');
const { Task, User } = require('../db/model');
const { call } = require('./telegramApi');
const { enqueue } = require('./messageQueue');
const { chatId } = require('../config');

let task;

function startScheduler() {
  const expr = process.env.SCHEDULE_CRON || '*/1 * * * *';
  task = cron.schedule(expr, async () => {
    const tasks = await Task.find({
      remind_at: { $lte: new Date() },
      status: { $ne: 'done' },
    }).lean();
    for (const t of tasks) {
      const ids = new Set();
      if (t.assigned_user_id) ids.add(t.assigned_user_id);
      if (Array.isArray(t.assignees)) t.assignees.forEach((id) => ids.add(id));
      let notified = false;
      for (const id of ids) {
        const user = await User.findOne({ telegram_id: id }).lean();
        if (user && user.receive_reminders !== false) {
          await enqueue(() =>
            call('sendMessage', {
              chat_id: user.telegram_id,
              text: `Напоминание: ${t.title}`,
            }),
          );
          notified = true;
        }
      }
      if (!notified) {
        await enqueue(() =>
          call('sendMessage', {
            chat_id: chatId,
            text: `Напоминание: ${t.title}`,
          }),
        );
      }
    }
    if (tasks.length) {
      await Task.updateMany(
        { _id: { $in: tasks.map((t) => t._id) } },
        { $unset: { remind_at: '' } },
      );
    }
  });
}

function stopScheduler() {
  if (task) {
    task.stop();
    task = undefined;
  }
}

module.exports = { startScheduler, stopScheduler };
