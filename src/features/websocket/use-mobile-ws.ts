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

      if (isDriverStatusEvent(eventName)) {
        const statusUpdate = normalizeDriverStatusEvent(event.payload, eventName)

        if (statusUpdate) {
          queryClient.setQueryData<DriverLocationCache>(
            ['taxi-park-driver-locations'],
            (previous) => applyDriverStatusToLocationCache(previous, statusUpdate),
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
  'driver.status.online',
  'driver.status.offline',
  'driver.status_updated',
  'driver.status.updated',
  'driver.line.started',
  'driver.line.stopped',
  'driver.line_started',
  'driver.line_stopped',
  'driver.went_online',
  'driver.went_offline',
  'driver.status_changed',
  'driver.status.changed',
  'driver.line_online',
  'driver.line_offline',
  'driver.line.online',
  'driver.line.offline',
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

function normalizeDriverStatusEvent(payload: unknown, eventName?: string) {
  if (!payload || typeof payload !== 'object') return null

  const data = payload as Record<string, unknown>
  const payloadData = data.data as Record<string, unknown> | undefined
  const driver = data.driver as Record<string, unknown> | undefined
  const driverId =
    stringValue(data.driver_id) ??
    stringValue(data.driverId) ??
    stringValue(data.driverID) ??
    stringValue(data.id) ??
    stringValue(data.user_id) ??
    stringValue(payloadData?.driver_id) ??
    stringValue(payloadData?.driverId) ??
    stringValue(payloadData?.driverID) ??
    stringValue(payloadData?.id) ??
    stringValue(payloadData?.user_id) ??
    stringValue(driver?.driver_id) ??
    stringValue(driver?.driverId) ??
    stringValue(driver?.driverID) ??
    stringValue(driver?.id)
  const status =
    stringValue(data.status) ??
    stringValue(data.new_status) ??
    stringValue(data.newStatus) ??
    stringValue(data.current_status) ??
    stringValue(data.currentStatus) ??
    stringValue(data.driver_status) ??
    stringValue(data.driverStatus) ??
    stringValue(payloadData?.status) ??
    stringValue(payloadData?.new_status) ??
    stringValue(payloadData?.newStatus) ??
    stringValue(payloadData?.current_status) ??
    stringValue(payloadData?.currentStatus) ??
    stringValue(payloadData?.driver_status) ??
    stringValue(payloadData?.driverStatus) ??
    stringValue(driver?.status) ??
    inferDriverStatusFromEventName(eventName)

  if (!driverId || !status) return null

  return {
    driver_id: driverId,
    user_id: stringValue(data.user_id) ?? stringValue(payloadData?.user_id) ?? stringValue(driver?.user_id),
    name: stringValue(data.name) ?? stringValue(payloadData?.name) ?? stringValue(driver?.name),
    phone: stringValue(data.phone) ?? stringValue(payloadData?.phone) ?? stringValue(driver?.phone),
    status,
    updated_at:
      stringValue(data.recorded_at) ??
      stringValue(data.updated_at) ??
      stringValue(data.updatedAt) ??
      stringValue(payloadData?.recorded_at) ??
      stringValue(payloadData?.updated_at) ??
      stringValue(payloadData?.updatedAt) ??
      new Date().toISOString(),
  }
}

function isDriverStatusEvent(eventName?: string) {
  if (!eventName) return false
  if (driverStatusEventNames.has(eventName)) return true

  return (
    eventName.startsWith('driver.status') ||
    eventName.startsWith('driver.line') ||
    eventName === 'driver.online' ||
    eventName === 'driver.offline' ||
    eventName === 'driver.paused'
  )
}

function applyDriverStatusToLocationCache(
  previous: DriverLocationCache | undefined,
  statusUpdate: NonNullable<ReturnType<typeof normalizeDriverStatusEvent>>,
): DriverLocationCache {
  const next: DriverLocationCache = {}
  const previousEntries = Object.entries(previous ?? {})
  const matchingEntries = previousEntries.filter(([, value]) => {
    return (
      value.driver_id === statusUpdate.driver_id ||
      value.user_id === statusUpdate.user_id ||
      (statusUpdate.user_id !== undefined && value.driver_id === statusUpdate.user_id)
    )
  })
  const base =
    previous?.[statusUpdate.driver_id] ??
    (statusUpdate.user_id ? previous?.[statusUpdate.user_id] : undefined) ??
    matchingEntries[0]?.[1]

  for (const [key, value] of previousEntries) {
    const shouldUpdate =
      key === statusUpdate.driver_id ||
      key === statusUpdate.user_id ||
      value.driver_id === statusUpdate.driver_id ||
      value.user_id === statusUpdate.user_id ||
      (statusUpdate.user_id !== undefined && value.driver_id === statusUpdate.user_id)

    next[key] = shouldUpdate ? mergeDriverStatus(value, statusUpdate) : value
  }

  next[statusUpdate.driver_id] = mergeDriverStatus(base, statusUpdate)

  if (statusUpdate.user_id) {
    next[statusUpdate.user_id] = mergeDriverStatus(base, statusUpdate)
  }

  return next
}

function mergeDriverStatus(
  current: DriverLocationSnapshot | undefined,
  statusUpdate: NonNullable<ReturnType<typeof normalizeDriverStatusEvent>>,
): DriverLocationSnapshot {
  return {
    ...current,
    driver_id: statusUpdate.driver_id,
    user_id: statusUpdate.user_id ?? current?.user_id,
    name: statusUpdate.name ?? current?.name,
    phone: statusUpdate.phone ?? current?.phone,
    status: statusUpdate.status,
    latitude: current?.latitude,
    longitude: current?.longitude,
    heading: current?.heading,
    speed_mps: current?.speed_mps,
    accuracy_meters: current?.accuracy_meters,
    updated_at: statusUpdate.updated_at ?? current?.updated_at,
    is_stale: statusUpdate.status === 'offline' ? true : current?.is_stale,
  }
}

function inferDriverStatusFromEventName(eventName?: string) {
  if (!eventName) return undefined

  if (
    eventName === 'driver.offline' ||
    eventName === 'driver.status.offline' ||
    eventName === 'driver.line.stopped' ||
    eventName === 'driver.line_stopped' ||
    eventName === 'driver.went_offline' ||
    eventName === 'driver.line_offline' ||
    eventName === 'driver.line.offline'
  ) {
    return 'offline'
  }

  if (
    eventName === 'driver.online' ||
    eventName === 'driver.status.online' ||
    eventName === 'driver.line.started' ||
    eventName === 'driver.line_started' ||
    eventName === 'driver.went_online' ||
    eventName === 'driver.line_online' ||
    eventName === 'driver.line.online'
  ) {
    return 'online'
  }

  if (eventName === 'driver.paused') return 'paused'

  return undefined
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
    stringValue((data.order as Record<string, unknown> | undefined)?.order_id) ??
    stringValue((data.message as Record<string, unknown> | undefined)?.order_id) ??
    stringValue((data.message as Record<string, unknown> | undefined)?.orderId) ??
    stringValue((data.chat as Record<string, unknown> | undefined)?.order_id) ??
    stringValue((data.chat as Record<string, unknown> | undefined)?.orderId) ??
    stringValue((data.data as Record<string, unknown> | undefined)?.order_id) ??
    stringValue((data.data as Record<string, unknown> | undefined)?.orderId)
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
