// Назначение файла: общие поля формы задачи для бота и веб-клиента
// Модули: constants

import {
  TASK_TYPES,
  PRIORITIES,
  TRANSPORT_TYPES,
  PAYMENT_METHODS,
  TASK_STATUSES,
} from './constants';

export interface TaskField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  options?: readonly string[];
  default?: string;
}

export const taskFields: TaskField[] = [
  { name: 'title', label: 'Название', type: 'text', required: true },
  {
    name: 'task_type',
    label: 'Тип',
    type: 'select',
    options: TASK_TYPES,
    default: TASK_TYPES[0],
  },
  {
    name: 'priority',
    label: 'Приоритет',
    type: 'select',
    options: PRIORITIES,
    default: PRIORITIES[1],
  },
  { name: 'department', label: 'Отдел', type: 'select' },
  { name: 'creator', label: 'Задачу создал', type: 'select' },
  { name: 'assignees', label: 'Исполнители', type: 'multiselect' },
  { name: 'start_location', label: 'Старт точка', type: 'location' },
  {
    name: 'transport_type',
    label: 'Тип транспорта',
    type: 'select',
    options: TRANSPORT_TYPES,
    default: TRANSPORT_TYPES[1],
  },
  { name: 'end_location', label: 'Финальная точка', type: 'location' },
  {
    name: 'payment_method',
    label: 'Способ оплаты',
    type: 'select',
    options: PAYMENT_METHODS,
    default: PAYMENT_METHODS[1],
  },
  {
    name: 'status',
    label: 'Статус',
    type: 'select',
    options: TASK_STATUSES,
    default: TASK_STATUSES[0],
  },
  { name: 'description', label: '🔨 Задача', type: 'richtext' },
  { name: 'comment', label: 'Комментарий', type: 'richtext' },
];

export default taskFields;
