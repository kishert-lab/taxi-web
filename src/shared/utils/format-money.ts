import type { MoneyCentsResponse, MoneyResponse } from '../api/types'

export function formatMoneyCents(money?: MoneyCentsResponse | number | null) {
  const amountCents =
    typeof money === 'number' ? money : (money?.amount_cents ?? 0)
  const currency = typeof money === 'number' ? 'RUB' : (money?.currency ?? 'RUB')

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amountCents / 100)
}

export function formatMoneyAmount(money?: MoneyResponse | number | null) {
  const amount = typeof money === 'number' ? money : (money?.amount ?? 0)
  const currency = typeof money === 'number' ? 'RUB' : (money?.currency ?? 'RUB')

  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function basisPointsToPercent(value: number) {
  return value / 100
}

export function percentToBasisPoints(value: number) {
  return Math.round(value * 100)
}

export function rublesToCents(value: number) {
  return Math.round(value * 100)
}

export function centsToRubles(value: number) {
  return value / 100
}
