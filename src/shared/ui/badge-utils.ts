import type { BadgeVariant } from './Badge'

export function statusVariant(status?: string): BadgeVariant {
  if (status === 'online' || status === 'completed' || status === 'active') {
    return 'success'
  }

  if (status === 'blocked' || status === 'cancelled' || status === 'failed') {
    return 'danger'
  }

  if (status === 'busy' || status === 'paused' || status === 'pending') {
    return 'warning'
  }

  return 'muted'
}
