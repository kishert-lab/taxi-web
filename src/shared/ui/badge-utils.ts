import type { BadgeVariant } from './Badge'

export function statusVariant(status?: string): BadgeVariant {
  if (status === 'online' || status === 'completed' || status === 'active' || status === 'verified' || status === 'approved') {
    return 'success'
  }

  if (status === 'blocked' || status === 'cancelled' || status === 'canceled' || status === 'failed' || status === 'rejected' || status === 'archived') {
    return 'danger'
  }

  if (status === 'busy' || status === 'paused' || status === 'pending' || status === 'pending_verification' || status === 'draft') {
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
}

export function statusLabel(status?: string | null) {
  if (!status) return '-'
  return statusLabels[status] ?? status
}
