// Назначение файла: общие поля формы задачи для бота и веб-клиента
module.exports = [
  { name: 'title', label: 'Название', type: 'text', required: true },
  {
    name: 'task_type',
    label: 'Тип',
    type: 'select',
    options: ['Доставить', 'Купить', 'Выполнить', 'Построить', 'Починить'],

    default: 'Доставить'
  },
  {
    name: 'priority',
    label: 'Приоритет',
    type: 'select',
    options: ['Срочно', 'В течение дня', 'Бессрочно'],
    default: 'В течение дня'
  },
  { name: 'department', label: 'Отдел', type: 'select' },
  { name: 'creator', label: 'Задачу создал', type: 'select' },
  { name: 'assignees', label: 'Исполнители', type: 'multiselect' },
  { name: 'start_location', label: 'Старт точка', type: 'location' },
  {
    name: 'transport_type',
    label: 'Тип транспорта',
    type: 'select',
    options: ['Пешком', 'Авто', 'Дрон'],
    default: 'Авто'
  },
  { name: 'end_location', label: 'Финальная точка', type: 'location' },
  {
    name: 'payment_method',
    label: 'Способ оплаты',
    type: 'select',
    options: ['Наличные', 'Карта', 'Безнал', 'Без оплаты'],
    default: 'Карта'
  },
  {
    name: 'status',
    label: 'Статус',
    type: 'select',
    options: ['Новая', 'В работе', 'Выполнена', 'Отменена'],
    default: 'Новая'
  },
  { name: 'description', label: '🔨 Задача', type: 'richtext' },
  { name: 'comment', label: 'Комментарий', type: 'richtext' }
]
