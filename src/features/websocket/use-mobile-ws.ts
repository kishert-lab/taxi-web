import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { createElement } from 'react'
import { useEffect } from 'react'
import toast from 'react-hot-toast'

import { http } from '../../shared/api/http'
import { useAuthStore } from '../../shared/auth/auth-store'
import { useNotificationStore } from '../notifications/notification-store'
import type { TaxiParkOrder } from '../taxi-park-orders/api'
import { getDriverDisplayName, getOrderShortInfo, getOrderRouteLabel } from '../taxi-park-orders/order-display'
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
  const userId = useAuthStore((state) => state.user?.id)
  const addChatNotification = useNotificationStore((state) => state.addChatNotification)

  useEffect(() => {
    if (!accessToken) return

    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempts = 0
    let isDisposed = false

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    const scheduleReconnect = () => {
      if (isDisposed) return

      clearReconnectTimer()
      const reconnectDelayMs = Math.min(1000 * 2 ** reconnectAttempts, 10000)
      reconnectAttempts += 1
      reconnectTimer = setTimeout(connect, reconnectDelayMs)
    }

    const connect = () => {
      if (isDisposed) return

      socket = createWebSocket(accessToken)

      socket.onopen = () => {
        reconnectAttempts = 0

        if (role === 'taxi_park' || role === 'dispatcher') {
          void http.get('/taxi-park/orders', { params: { limit: 50 } })
          void http.get('/taxi-park/drivers/locations')
          void queryClient.invalidateQueries({ queryKey: ['taxi-park-orders'] })
          void queryClient.invalidateQueries({ queryKey: ['taxi-park-driver-locations-snapshot'] })
        }
      }

      socket.onmessage = (message) => {
        const event = parseWebSocketEvent(message.data)
        if (!event) return

        const eventName = getEventName(event)
        const eventPayload = resolveEventPayload(event)

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
          const orderId = getOrderId(eventPayload)
          void queryClient.invalidateQueries({ queryKey: ['taxi-park-orders'] })

          if (orderId) {
            void queryClient.invalidateQueries({ queryKey: ['taxi-park-order', orderId] })
          }
        }

        if (chatEventNames.has(eventName ?? '')) {
          handleChatEvent(eventPayload, queryClient, userId, addChatNotification)
        }

        if (eventName === 'driver.location.updated' || eventName === 'driver.location_updated') {
          const location = normalizeDriverLocationEvent(eventPayload)

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

        if (isDriverStatusEvent(eventName) || hasDriverStatusPayload(eventPayload)) {
          const statusUpdate = normalizeDriverStatusEvent(eventPayload, eventName)

          if (statusUpdate) {
            showDriverStatusToast(statusUpdate)
            queryClient.setQueryData<DriverLocationCache>(
              ['taxi-park-driver-locations'],
              (previous) => applyDriverStatusToLocationCache(previous, statusUpdate),
            )
          }

          void queryClient.invalidateQueries({ queryKey: ['taxi-park-drivers'] })
          void queryClient.invalidateQueries({ queryKey: ['taxi-park-drivers', ''] })
          void queryClient.invalidateQueries({ queryKey: ['taxi-park-driver-locations-snapshot'] })
          void queryClient.invalidateQueries({ queryKey: ['taxi-park-balance'] })
        }
      }

      socket.onclose = () => {
        socket = null
        scheduleReconnect()
      }

      socket.onerror = () => {
        socket?.close()
      }
    }

    connect()

    return () => {
      isDisposed = true
      clearReconnectTimer()
      socket?.close()
    }
  }, [accessToken, addChatNotification, queryClient, role, userId])
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
  'driver.online_status_changed',
  'driver.availability_changed',
  'driver.availability.changed',
])

const chatEventNames = new Set([
  'chat.message',
  'chat.message_created',
  'chat.message.created',
  'chat.message_sent',
  'chat.message.sent',
])

function handleChatEvent(
  eventPayload: unknown,
  queryClient: QueryClient,
  currentUserId: string | undefined,
  addChatNotification: ReturnType<typeof useNotificationStore.getState>['addChatNotification'],
) {
  const chatMessage = normalizeChatMessageEvent(eventPayload)
  const orderId = chatMessage?.orderId ?? getOrderId(eventPayload)

  if (!orderId) return

  if (chatMessage) {
    queryClient.setQueryData<{ thread_id?: string; chat_type?: string; messages: Array<{
      id: string
      order_id?: string
      thread_id?: string
      chat_type?: string
      sender_user_id?: string
      sender_role?: string
      body: string
      created_at: string
    }> }>(
      ['taxi-park-order-driver-chat', orderId],
      (previous) => {
        if (!previous) {
          return {
            thread_id: undefined,
            chat_type: 'dispatcher_driver',
            messages: [
              {
                id: chatMessage.id,
                order_id: orderId,
                thread_id: '',
                chat_type: 'dispatcher_driver',
                sender_user_id: chatMessage.senderUserId,
                sender_role: chatMessage.senderRole,
                body: chatMessage.body,
                created_at: chatMessage.createdAt,
              },
            ],
          }
        }

        if (previous.messages.some((message) => message.id === chatMessage.id)) {
          return previous
        }

        return {
          ...previous,
          messages: [
            ...previous.messages,
            {
              id: chatMessage.id,
              order_id: orderId,
              thread_id: previous.thread_id,
              chat_type: previous.chat_type,
              sender_user_id: chatMessage.senderUserId,
              sender_role: chatMessage.senderRole,
              body: chatMessage.body,
              created_at: chatMessage.createdAt,
            },
          ],
        }
      },
    )
  }

  if (chatMessage && isIncomingDriverMessage(chatMessage, currentUserId)) {
    const cachedOrder = findCachedOrder(queryClient, orderId)
    const driverName =
      chatMessage.senderName ??
      (cachedOrder ? getDriverDisplayName(cachedOrder) : undefined)
    const notification = {
      ...chatMessage,
      senderName: driverName,
      driverName,
      orderTitle: cachedOrder ? getOrderRouteLabel(cachedOrder) : undefined,
      orderSummary: cachedOrder ? getOrderShortInfo(cachedOrder) : undefined,
    }

    addChatNotification(notification)
    showChatToast(orderId, notification)
  }

  void queryClient.invalidateQueries({
    queryKey: ['taxi-park-order-driver-chat', orderId],
  })
  void queryClient.invalidateQueries({ queryKey: ['taxi-park-order', orderId] })
}

function showChatToast(
  orderId: string,
  notification: Parameters<ReturnType<typeof useNotificationStore.getState>['addChatNotification']>[0],
) {
  toast.custom(
    (toastInstance) =>
      createElement(
        'div',
        { className: 'w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg' },
        createElement(
          'div',
          { className: 'text-sm font-bold text-slate-950' },
          `Сообщение от водителя: ${notification.driverName ?? notification.senderName ?? 'водитель'}`,
        ),
        createElement(
          'div',
          { className: 'mt-1 text-xs font-medium text-slate-600' },
          notification.orderTitle ?? 'Заказ такси',
        ),
        createElement(
          'div',
          { className: 'mt-1 text-xs text-slate-500' },
          notification.orderSummary ?? 'Информация о заказе обновляется',
        ),
        createElement('p', { className: 'mt-2 line-clamp-3 text-sm text-slate-700' }, notification.body),
        createElement(
          'div',
          { className: 'mt-3 flex items-center justify-between' },
          createElement(
            'a',
            {
              className: 'text-sm font-semibold text-amber-700 hover:text-amber-800',
              href: `/taxi-park/orders/${orderId}#driver-chat`,
              onClick: () => toast.dismiss(toastInstance.id),
            },
            'Открыть чат',
          ),
          createElement(
            'button',
            {
              type: 'button',
              className: 'text-sm text-slate-500 hover:text-slate-700',
              onClick: () => toast.dismiss(toastInstance.id),
            },
            'Закрыть',
          ),
        ),
      ),
    { duration: 7000 },
  )
}

function parseWebSocketEvent(rawMessage: unknown) {
  if (typeof rawMessage !== 'string') return null

  try {
    return JSON.parse(rawMessage) as WebSocketEvent
  } catch {
    return null
  }
}

function resolveEventPayload(event: WebSocketEvent) {
  const payload = getObject((event as Record<string, unknown>).payload)
  const payloadData = getObject(payload?.data)
  const payloadMessage = getObject(payload?.message)

  return payloadMessage ?? payloadData ?? payload ?? event
}

function normalizeDriverLocationEvent(payload: unknown): DriverLocationSnapshot | null {
  if (!payload || typeof payload !== 'object') return null

  const data = unwrapPayload(payload)
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

  const data = unwrapPayload(payload)
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
    booleanStatus(data.is_online) ??
    booleanStatus(data.isOnline) ??
    booleanStatus(data.online) ??
    booleanStatus(payloadData?.is_online) ??
    booleanStatus(payloadData?.isOnline) ??
    booleanStatus(payloadData?.online) ??
    booleanStatus(driver?.is_online) ??
    booleanStatus(driver?.isOnline) ??
    booleanStatus(driver?.online) ??
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

function normalizeChatMessageEvent(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const data = unwrapPayload(payload)
  const message = getObject(data.message) ?? getObject(data.chat_message) ?? data
  const orderId = getOrderId(data) ?? getOrderId(message)
  const body =
    stringValue(message.body) ??
    stringValue(message.message) ??
    stringValue(message.text) ??
    stringValue(message.content) ??
    stringValue(data.body) ??
    stringValue(data.message_text) ??
    stringValue(data.content)

  if (!orderId || !body) return null

  return {
    id:
      stringValue(message.id) ??
      stringValue(data.id) ??
      `${orderId}-${stringValue(data.request_id) ?? Date.now()}`,
    orderId,
    senderName:
      stringValue(message.sender_name) ??
      stringValue(message.senderName) ??
      stringValue(data.sender_name) ??
      stringValue(data.driver_name),
    senderRole:
      stringValue(message.sender_role) ??
      stringValue(message.senderRole) ??
      stringValue(data.sender_role),
    senderUserId:
      stringValue(message.sender_user_id) ??
      stringValue(message.senderUserId) ??
      stringValue(data.sender_user_id),
    body,
    createdAt:
      stringValue(message.created_at) ??
      stringValue(message.createdAt) ??
      stringValue(data.created_at) ??
      stringValue(data.occurred_at) ??
      new Date().toISOString(),
  }
}

function isIncomingDriverMessage(
  message: NonNullable<ReturnType<typeof normalizeChatMessageEvent>>,
  currentUserId?: string,
) {
  if (message.senderUserId && message.senderUserId === currentUserId) return false
  if (!message.senderRole) return true

  return message.senderRole === 'driver'
}

function isDriverStatusEvent(eventName?: string) {
  if (!eventName) return false
  if (driverStatusEventNames.has(eventName)) return true

  return (
    eventName.startsWith('driver.status') ||
    eventName.startsWith('driver.line') ||
    (eventName.startsWith('driver.') && eventName.includes('status')) ||
    (eventName.startsWith('driver.') && eventName.includes('online')) ||
    (eventName.startsWith('driver.') && eventName.includes('offline')) ||
    (eventName.startsWith('driver.') && eventName.includes('availability')) ||
    eventName === 'driver.online' ||
    eventName === 'driver.offline' ||
    eventName === 'driver.paused'
  )
}

function hasDriverStatusPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') return false

  const data = unwrapPayload(payload)
  const driver = getObject(data.driver)
  const hasDriverIdentity = Boolean(
    stringValue(data.driver_id) ??
      stringValue(data.driverId) ??
      stringValue(data.user_id) ??
      stringValue(driver?.id) ??
      stringValue(driver?.driver_id) ??
      stringValue(driver?.user_id),
  )
  const hasStatusValue = Boolean(
    stringValue(data.status) ??
      stringValue(data.new_status) ??
      stringValue(data.driver_status) ??
      stringValue(driver?.status) ??
      booleanStatus(data.is_online) ??
      booleanStatus(data.online) ??
      booleanStatus(driver?.is_online) ??
      booleanStatus(driver?.online),
  )

  return hasDriverIdentity && hasStatusValue
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

function showDriverStatusToast(
  statusUpdate: NonNullable<ReturnType<typeof normalizeDriverStatusEvent>>,
) {
  const name = statusUpdate.name ?? statusUpdate.phone ?? 'водитель'

  if (statusUpdate.status === 'online') {
    toast.success(`Водитель вышел на линию: ${name}`)
    return
  }

  if (statusUpdate.status === 'offline') {
    toast(`Водитель ушел с линии: ${name}`)
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
    eventName === 'driver.line.offline' ||
    eventName.includes('offline')
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
    eventName === 'driver.line.online' ||
    eventName.includes('online')
  ) {
    return 'online'
  }

  if (eventName === 'driver.paused') return 'paused'

  return undefined
}

function getEventName(event: WebSocketEvent) {
  const data = event as Record<string, unknown>
  const payload = getObject(data.payload)
  const nestedData = getObject(data.data)
  const topLevelType = stringValue(data.type)
  const topLevelEvent = stringValue(data.event)
  const nestedEventName =
    stringValue(payload?.type) ??
    stringValue(payload?.event) ??
    stringValue(payload?.event_type) ??
    stringValue(payload?.eventType) ??
    stringValue(nestedData?.type) ??
    stringValue(nestedData?.event) ??
    stringValue(nestedData?.event_type) ??
    stringValue(nestedData?.eventType)

  if (nestedEventName && (topLevelType === 'notification' || topLevelEvent === 'notification')) {
    return nestedEventName
  }

  return (
    nestedEventName ??
    topLevelType ??
    topLevelEvent ??
    stringValue(data.event_type) ??
    stringValue(data.eventType) ??
    stringValue(data.name) ??
    stringValue(data.topic) ??
    undefined
  )
}

function getOrderId(payload: unknown) {
  if (!payload || typeof payload !== 'object') return undefined
  const data = unwrapPayload(payload)
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

function findCachedOrder(queryClient: QueryClient, orderId: string) {
  const directOrder = queryClient.getQueryData<TaxiParkOrder>(['taxi-park-order', orderId])
  if (directOrder) return directOrder

  for (const [, orders] of queryClient.getQueriesData<TaxiParkOrder[]>({
    queryKey: ['taxi-park-orders'],
  })) {
    const order = orders?.find((item) => item.id === orderId || item.order_id === orderId)
    if (order) return order
  }

  return undefined
}

function unwrapPayload(payload: unknown): Record<string, unknown> {
  const data = payload as Record<string, unknown>
  const nestedPayload = getObject(data.payload)
  const nestedData = getObject(data.data)

  return nestedPayload ?? nestedData ?? data
}

function getObject(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
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

function booleanStatus(value: unknown) {
  if (typeof value === 'boolean') return value ? 'online' : 'offline'
  if (typeof value === 'string') {
    if (value === 'true') return 'online'
    if (value === 'false') return 'offline'
  }
  return undefined
}
