import type { BadgeVariant } from './Badge'

export function statusVariant(status?: string): BadgeVariant {
  if (
    status === 'online' ||
    status === 'completed' ||
    status === 'active' ||
    status === 'verified' ||
    status === 'approved' ||
    status === 'scheduled_confirmed' ||
    status === 'scheduled_driver_assigned' ||
    status === 'scheduled_activated'
  ) {
    return 'success'
  }

  if (
    status === 'blocked' ||
    status === 'cancelled' ||
    status === 'canceled' ||
    status === 'failed' ||
    status === 'rejected' ||
    status === 'archived' ||
    status === 'scheduled_cancelled' ||
    status === 'scheduled_expired' ||
    status === 'scheduled_failed'
  ) {
    return 'danger'
  }

  if (
    status === 'busy' ||
    status === 'paused' ||
    status === 'pending' ||
    status === 'pending_verification' ||
    status === 'draft' ||
    status === 'no_drivers_found' ||
    status === 'scheduled_new' ||
    status === 'scheduled_waiting_activation'
  ) {
    return 'warning'
  }

  return 'muted'
}

const statusLabels: Record<string, string> = {
  created: 'Создан',
  offered: 'Предложен',
  assigned: 'Водитель назначен',
  driver_assigned: 'Водитель назначен',
  driver_arriving: 'Водитель едет',
  driver_waiting: 'Водитель ожидает',
  trip_started: 'Поездка началась',
  in_progress: 'В пути',
  completed: 'Завершен',
  cancelled: 'Отменен',
  canceled: 'Отменен',
  failed: 'Ошибка',
  pending: 'Ожидает',
  active: 'Активен',
  inactive: 'Неактивен',
  online: 'На линии',
  offline: 'Не на линии',
  busy: 'Занят',
  paused: 'Пауза',
  blocked: 'Заблокирован',
  verified: 'Проверен',
  approved: 'Одобрен',
  not_verified: 'Не проверен',
  pending_verification: 'Ожидает проверки',
  rejected: 'Отклонен',
  archived: 'Архив',
  draft: 'Черновик',
  no_drivers_found: 'Водители не найдены',
  scheduled_new: 'Новый предварительный',
  scheduled_confirmed: 'Подтвержден',
  scheduled_driver_assigned: 'Водитель назначен',
  scheduled_waiting_activation: 'Ожидает активации',
  scheduled_activated: 'Активирован',
  scheduled_cancelled: 'Отменен',
  scheduled_expired: 'Просрочен',
  scheduled_failed: 'Ошибка',
}

export function statusLabel(status?: string | null) {
  if (!status) return '-'
  return statusLabels[status] ?? status
}
