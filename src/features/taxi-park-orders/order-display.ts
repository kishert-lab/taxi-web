import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents } from '../../shared/utils/format-money'
import type { TaxiParkOrder, TaxiParkScheduledOrder } from './api'

type OrderLike = Partial<TaxiParkOrder> | Partial<TaxiParkScheduledOrder> | null | undefined

export function getOrderRouteLabel(order?: OrderLike) {
  if (!order) return 'Заказ'

  const pickup = cleanText(order.pickup_address)
  const destination = cleanText(order.destination_address)

  if (pickup && destination) return `${pickup} -> ${destination}`
  if (pickup) return `Откуда: ${pickup}`
  if (destination) return `Куда: ${destination}`

  return 'Заказ такси'
}

export function getOrderShortInfo(order?: Partial<TaxiParkOrder> | null) {
  if (!order) return 'Информация о заказе обновляется'

  const parts = [
    cleanText(order.passenger_phone) ? `пассажир ${cleanText(order.passenger_phone)}` : undefined,
    order.status ? `статус: ${order.status}` : undefined,
    order.created_at ? `создан ${formatDate(order.created_at)}` : undefined,
    formatMoneyCents(order.gross_amount ?? order.total_price ?? order.price),
  ].filter(Boolean)

  return parts.join(' · ') || 'Информация о заказе обновляется'
}

export function getDriverDisplayName(
  order?: Partial<TaxiParkOrder> | Partial<TaxiParkScheduledOrder> | null,
  fallbackName?: string,
) {
  const driverName = hasDriverName(order) ? order.driver_name : undefined
  const preassignedDriverId = hasPreassignedDriverId(order) ? order.preassigned_driver_id : undefined

  return (
    cleanText(driverName) ??
    cleanText(fallbackName) ??
    (order?.driver_id ? `Водитель ${order.driver_id.slice(0, 8)}` : undefined) ??
    (preassignedDriverId
      ? `Предназначен ${preassignedDriverId.slice(0, 8)}`
      : undefined) ??
    'Водитель не назначен'
  )
}

export function getReadableOrderTitle(order?: Partial<TaxiParkOrder> | null) {
  return `Заказ: ${getOrderRouteLabel(order)}`
}

function cleanText(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function hasDriverName(
  order?: Partial<TaxiParkOrder> | Partial<TaxiParkScheduledOrder> | null,
): order is Partial<TaxiParkOrder> {
  return Boolean(order && 'driver_name' in order)
}

function hasPreassignedDriverId(
  order?: Partial<TaxiParkOrder> | Partial<TaxiParkScheduledOrder> | null,
): order is Partial<TaxiParkScheduledOrder> {
  return Boolean(order && 'preassigned_driver_id' in order)
}
