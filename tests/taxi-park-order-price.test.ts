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

it('uses final price from a detail response before the estimate', () => {
  const order = normalizeTaxiParkOrder({
    id: 'order-1',
    status: 'completed',
    final_price: { amount: 0, currency: 'RUB' },
    estimated_price: { amount: 120.47, currency: 'RUB' },
  })

  expect(order.price).toEqual({ amount_cents: 0, currency: 'RUB' })
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

it('normalizes the passenger returned with an order detail', () => {
  const order = normalizeTaxiParkOrder({
    id: 'order-1',
    status: 'assigned',
    passenger_id: 'passenger-1',
    passenger: { id: 'passenger-1', name: 'Пассажир', phone: '+79990000002' },
  })

  expect(order.passenger_id).toBe('passenger-1')
  expect(order.passenger_name).toBe('Пассажир')
  expect(order.passenger_phone).toBe('+79990000002')
})
