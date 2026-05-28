import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { http } from '../../shared/api/http'
import { useAuthStore } from '../../shared/auth/auth-store'
import { createWebSocket, type WebSocketEvent } from './ws-client'

export type DriverLocationSnapshot = {
  driver_id: string
  user_id?: string
  name?: string
  phone?: string
  status?: string
  latitude?: number
  longitude?: number
  heading?: number
  speed_mps?: number
  accuracy_meters?: number
  updated_at?: string
  is_stale?: boolean
}

export type DriverLocationCache = Record<string, DriverLocationSnapshot>

export function useWebSocket() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.user?.role)

  useEffect(() => {
    if (!accessToken) return

    const socket = createWebSocket(accessToken)
    socket.onopen = () => {
      if (role === 'taxi_park' || role === 'dispatcher') {
        void http.get('/taxi-park/orders', { params: { limit: 50 } })
        void http.get('/taxi-park/drivers/locations')
        void queryClient.invalidateQueries({ queryKey: ['taxi-park-orders'] })
        void queryClient.invalidateQueries({ queryKey: ['taxi-park-driver-locations-snapshot'] })
      }
    }
    socket.onmessage = (message) => {
      const event = JSON.parse(message.data) as WebSocketEvent

      const eventName = getEventName(event)

      if (eventName === 'sync.required') {
        if (role === 'taxi_park' || role === 'dispatcher') {
          void http.get('/taxi-park/orders')
          void queryClient.invalidateQueries({ queryKey: ['taxi-park-orders'] })
        }
        if (role === 'driver') {
          void http.get('/driver/orders/current')
          void queryClient.invalidateQueries({ queryKey: ['driver-orders-history'] })
        }
        if (role === 'passenger') {
          void http.get('/passenger/orders/current')
        }
      }

      if (orderEventNames.has(eventName ?? '')) {
        const orderId = getOrderId(event.payload)
        void queryClient.invalidateQueries({ queryKey: ['taxi-park-orders'] })

        if (orderId) {
          void queryClient.invalidateQueries({ queryKey: ['taxi-park-order', orderId] })
        }
      }

      if (chatEventNames.has(eventName ?? '')) {
        const orderId = getOrderId(event.payload)

        if (orderId) {
          void queryClient.invalidateQueries({
            queryKey: ['taxi-park-order-driver-chat', orderId],
          })
        }
      }

      if (eventName === 'driver.location.updated' || eventName === 'driver.location_updated') {
        const location = normalizeDriverLocationEvent(event.payload)

        if (location) {
          queryClient.setQueryData<DriverLocationCache>(
            ['taxi-park-driver-locations'],
            (previous) => ({
              ...(previous ?? {}),
              [location.driver_id]: location,
              ...(location.user_id ? { [location.user_id]: location } : {}),
            }),
          )
        }

        void queryClient.invalidateQueries({ queryKey: ['taxi-park-drivers'] })
        void queryClient.invalidateQueries({ queryKey: ['taxi-park-driver-locations-snapshot'] })
      }

      if (driverStatusEventNames.has(eventName ?? '')) {
        const statusUpdate = normalizeDriverStatusEvent(event.payload)

        if (statusUpdate) {
          queryClient.setQueryData<DriverLocationCache>(
            ['taxi-park-driver-locations'],
            (previous) => {
              const current: Partial<DriverLocationSnapshot> =
                previous?.[statusUpdate.driver_id] ?? {}

              return {
                ...(previous ?? {}),
                [statusUpdate.driver_id]: {
                  ...current,
                  driver_id: statusUpdate.driver_id,
                  user_id: statusUpdate.user_id ?? current.user_id,
                  name: statusUpdate.name ?? current.name,
                  phone: statusUpdate.phone ?? current.phone,
                  status: statusUpdate.status,
                  latitude: current.latitude,
                  longitude: current.longitude,
                  updated_at: statusUpdate.updated_at ?? current.updated_at,
                },
                ...(statusUpdate.user_id
                  ? {
                      [statusUpdate.user_id]: {
                        ...current,
                        driver_id: statusUpdate.driver_id,
                        user_id: statusUpdate.user_id,
                        name: statusUpdate.name ?? current.name,
                        phone: statusUpdate.phone ?? current.phone,
                        status: statusUpdate.status,
                        latitude: current.latitude,
                        longitude: current.longitude,
                        updated_at: statusUpdate.updated_at ?? current.updated_at,
                      },
                    }
                  : {}),
              }
            },
          )
        }

        void queryClient.invalidateQueries({ queryKey: ['taxi-park-drivers'] })
        void queryClient.invalidateQueries({ queryKey: ['taxi-park-driver-locations-snapshot'] })
        void queryClient.invalidateQueries({ queryKey: ['taxi-park-balance'] })
      }
    }

    return () => socket.close()
  }, [accessToken, queryClient, role])
}

const orderEventNames = new Set([
  'order.offer',
  'order.driver_assigned',
  'order.driver_arriving',
  'order.driver_waiting',
  'order.trip_started',
  'order.updated',
  'order.cancelled',
  'order.completed',
  'no_drivers_found',
])

const driverStatusEventNames = new Set([
  'driver.online',
  'driver.offline',
  'driver.paused',
  'driver.status_updated',
  'driver.status.updated',
  'driver.line_started',
  'driver.line.stopped',
  'driver.line_started',
  'driver.line_stopped',
])

const chatEventNames = new Set([
  'chat.message',
  'chat.message_created',
  'chat.message.created',
  'chat.message_sent',
  'chat.message.sent',
])

function normalizeDriverLocationEvent(payload: unknown): DriverLocationSnapshot | null {
  if (!payload || typeof payload !== 'object') return null

  const data = payload as Record<string, unknown>
  const locationData = data.location as Record<string, unknown> | undefined
  const driverId = stringValue(data.driver_id) ?? stringValue(data.driverId) ?? stringValue(data.id)
  const latitude =
    numberValue(data.latitude) ??
    numberValue(data.lat) ??
    numberValue(locationData?.latitude) ??
    numberValue(locationData?.lat)
  const longitude =
    numberValue(data.longitude) ??
    numberValue(data.lng) ??
    numberValue(data.lon) ??
    numberValue(locationData?.longitude) ??
    numberValue(locationData?.lng) ??
    numberValue(locationData?.lon)

  if (!driverId || latitude === undefined || longitude === undefined) return null

  return {
    driver_id: driverId,
    user_id: stringValue(data.user_id),
    name: stringValue(data.name),
    phone: stringValue(data.phone),
    status: stringValue(data.status),
    latitude,
    longitude,
    heading: numberValue(data.heading),
    speed_mps: numberValue(data.speed_mps) ?? numberValue(data.speed),
    accuracy_meters: numberValue(data.accuracy_meters),
    updated_at:
      stringValue(data.recorded_at) ??
      stringValue(data.updated_at) ??
      stringValue(data.updatedAt) ??
      new Date().toISOString(),
  }
}

function normalizeDriverStatusEvent(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const data = payload as Record<string, unknown>
  const driverId = stringValue(data.driver_id) ?? stringValue(data.driverId) ?? stringValue(data.id)
  const status = stringValue(data.status)

  if (!driverId || !status) return null

  return {
    driver_id: driverId,
    user_id: stringValue(data.user_id),
    name: stringValue(data.name),
    phone: stringValue(data.phone),
    status,
    updated_at:
      stringValue(data.recorded_at) ??
      stringValue(data.updated_at) ??
      stringValue(data.updatedAt) ??
      new Date().toISOString(),
  }
}

function getEventName(event: WebSocketEvent) {
  if ('type' in event && event.type) return event.type
  if ('event' in event && event.event) return event.event
  return undefined
}

function getOrderId(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined
  const data = payload as Record<string, unknown>
  return (
    stringValue(data.order_id) ??
    stringValue(data.orderId) ??
    stringValue(data.id) ??
    stringValue((data.order as Record<string, unknown> | undefined)?.id) ??
    stringValue((data.order as Record<string, unknown> | undefined)?.order_id)
  )
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const number = Number(value)
    return Number.isFinite(number) ? number : undefined
  }
  return undefined
}
