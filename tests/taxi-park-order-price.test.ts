import { expect, it } from 'vitest'

import { normalizeTaxiParkOrder } from '../src/features/taxi-park-orders/api'

it('converts a detail price in rubles to kopecks', () => {
  const order = normalizeTaxiParkOrder({
    id: 'order-1',
    status: 'searching',
    final_price: { amount: 120.47, currency: 'RUB' },
  })

  expect(order.price).toEqual({ amount_cents: 12047, currency: 'RUB' })
})

it('preserves a list price already expressed in kopecks', () => {
  const order = normalizeTaxiParkOrder({
    id: 'order-1',
    status: 'searching',
    gross_amount: { amount_cents: 12047, currency: 'RUB' },
  })

  expect(order.gross_amount).toEqual({ amount_cents: 12047, currency: 'RUB' })
  expect(order.price).toEqual({ amount_cents: 12047, currency: 'RUB' })
})

it('normalizes the driver returned with a taxi park order', () => {
  const order = normalizeTaxiParkOrder({
    id: 'order-1',
    status: 'assigned',
    driver: { id: 'driver-1', name: 'Сергей Жуков', phone: '+79001234567' },
  })

  expect(order.driver_id).toBe('driver-1')
  expect(order.driver_name).toBe('Сергей Жуков')
  expect(order.driver_phone).toBe('+79001234567')
})
