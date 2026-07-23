import { AxiosError } from 'axios'

import { http } from '../../shared/api/http'
import type { ApiResponse, MoneyResponse } from '../../shared/api/types'
import type { CoordinatesPayload } from '../taxi-park-orders/api'

export type PassengerProfile = {
  id: string
  phone: string
  name?: string
  email?: string
  avatar_url?: string | null
  is_active?: boolean
  phone_verified?: boolean
  created_at?: string
  updated_at?: string
}

export type PassengerProfilePayload = {
  name?: string
  email?: string
  avatar_url?: string
}

export type PassengerAddressPoint = {
  id?: string
  local_point_id?: string | null
  provider?: string
  name?: string
  address: string
  city_id?: string
  coordinates: CoordinatesPayload
  confidence?: number
  trust_level?: string
  external_place_id?: string
}

export type PassengerOrderPoint = {
  address?: string
  location?: CoordinatesPayload
}

export type PassengerOrder = {
  id: string
  order_id?: string
  status: string
  price?: MoneyResponse
  price_amount?: number
  eta_seconds?: number
  pickup_point?: PassengerOrderPoint
  destination_point?: PassengerOrderPoint
  pickup_address?: string
  destination_address?: string
  driver?: {
    id?: string
    name?: string
    phone?: string
    photo_url?: string
    rating?: number
    ratings_count?: number
  }
  car?: {
    id?: string
    brand?: string
    model?: string
    color?: string
    plate_number?: string
  }
  timeline: Array<{
    status?: string
    occurred_at?: string
    created_at?: string
  }>
  allowed_actions: string[]
  version?: number
}

export type PassengerOrderEstimate = {
  currency?: string
  distance_km?: number
  duration_min?: number
  price?: number
  price_type?: string
  tariff_id?: string
  tariff_name?: string
}

export type PassengerCreateOrderPayload = {
  city_id: string
  tariff_id: string
  pickup_address: string
  pickup_location: CoordinatesPayload
  destination_address: string
  destination_location: CoordinatesPayload
  payment_type: 'cash' | 'card' | 'corporate'
  passenger_phone?: string
  comment?: string
}

export type PassengerEstimatePayload = {
  city_id: string
  tariff_id: string
  pickup_location: CoordinatesPayload
  destination_location: CoordinatesPayload
}

export type PassengerChatMessage = {
  id: string
  thread_id: string
  order_id?: string
  chat_type?: string
  sender_user_id?: string
  sender_role?: string
  body: string
  created_at: string
}

export type PassengerChatThread = {
  thread_id: string
  chat_type?: string
  messages: PassengerChatMessage[]
}

type PassengerHistoryResponse =
  | PassengerOrder[]
  | {
      orders?: PassengerOrder[]
      items?: PassengerOrder[]
      history?: PassengerOrder[]
    }

export async function registerPassengerPushToken(payload: {
  token: string
  platform: string
  device_id?: string
}) {
  const response = await http.post<
    ApiResponse<{ token: string; platform: string; device_id?: string }>
  >('/passenger/push/token', payload)
  return response.data.data
}

export async function getPassengerProfile() {
  const response = await http.get<ApiResponse<PassengerProfile>>('/passenger/me')
  return response.data.data
}

export async function updatePassengerProfile(payload: PassengerProfilePayload) {
  const response = await http.patch<ApiResponse<PassengerProfile>>(
    '/passenger/me',
    emptyStringsToUndefined(payload),
  )
  return response.data.data
}

export async function searchPassengerAddresses(params: {
  q: string
  city_id?: string
  lat?: number
  lon?: number
  limit?: number
}) {
  const response = await http.get<ApiResponse<{ results?: PassengerAddressPoint[] }>>(
    '/passenger/address/search',
    { params },
  )
  return response.data.data.results ?? []
}

export async function getCurrentPassengerOrder() {
  try {
    const response = await http.get<ApiResponse<PassengerOrder>>('/passenger/orders/current')
    return normalizePassengerOrder(response.data.data)
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null
    }
    throw error
  }
}

export async function getPassengerCurrentOrder() {
  return getCurrentPassengerOrder()
}

export async function getPassengerOrderHistory() {
  const response = await http.get<ApiResponse<PassengerHistoryResponse>>('/passenger/orders/history')
  return getPassengerOrders(response.data.data).map(normalizePassengerOrder)
}

export async function getPassengerOrder(orderId: string) {
  const response = await http.get<ApiResponse<PassengerOrder>>(`/passenger/orders/${orderId}`)
  return normalizePassengerOrder(response.data.data)
}

export async function estimatePassengerOrder(payload: PassengerEstimatePayload) {
  const response = await http.post<ApiResponse<PassengerOrderEstimate>>(
    '/passenger/orders/estimate',
    payload,
  )
  return response.data.data
}

export async function createPassengerOrder(payload: PassengerCreateOrderPayload) {
  const response = await http.post<ApiResponse<PassengerOrder>>('/passenger/orders', payload)
  return normalizePassengerOrder(response.data.data)
}

export async function cancelPassengerOrder(orderId: string, payload: { reason: string }) {
  const response = await http.post<ApiResponse<PassengerOrder>>(
    `/passenger/orders/${orderId}/cancel`,
    payload,
  )
  return normalizePassengerOrder(response.data.data)
}

export async function ratePassengerOrder(orderId: string, payload: { score: number; comment?: string }) {
  const response = await http.post<ApiResponse<PassengerOrder>>(
    `/passenger/orders/${orderId}/rate`,
    emptyStringsToUndefined(payload),
  )
  return normalizePassengerOrder(response.data.data)
}

export async function getPassengerDriverChatMessages(orderId: string, limit = 50) {
  const response = await http.get<ApiResponse<PassengerChatThread>>(
    `/passenger/orders/${orderId}/chat/driver/messages`,
    { params: { limit } },
  )
  return {
    ...response.data.data,
    messages: Array.isArray(response.data.data.messages) ? response.data.data.messages : [],
  }
}

export async function sendPassengerDriverChatMessage(orderId: string, body: string) {
  const response = await http.post<ApiResponse<PassengerChatMessage>>(
    `/passenger/orders/${orderId}/chat/driver/messages`,
    { body },
  )
  return response.data.data
}

export async function getPassengerSupportChatMessages(limit = 50) {
  const response = await http.get<ApiResponse<PassengerChatThread>>(
    '/passenger/support/chat/messages',
    { params: { limit } },
  )
  return {
    ...response.data.data,
    messages: Array.isArray(response.data.data.messages) ? response.data.data.messages : [],
  }
}

export async function sendPassengerSupportChatMessage(body: string) {
  const response = await http.post<ApiResponse<PassengerChatMessage>>(
    '/passenger/support/chat/messages',
    { body },
  )
  return response.data.data
}

export async function getPassengerSupportMessages(limit = 50) {
  return getPassengerSupportChatMessages(limit)
}

export async function sendPassengerSupportMessage(body: string) {
  return sendPassengerSupportChatMessage(body)
}

function normalizePassengerOrder(order: PassengerOrder) {
  return {
    ...order,
    id: order.id ?? order.order_id ?? '',
    price_amount: typeof order.price?.amount === 'number' ? order.price.amount * 100 : undefined,
    pickup_address: order.pickup_point?.address,
    destination_address: order.destination_point?.address,
    timeline: Array.isArray(order.timeline)
      ? order.timeline.map((item) => ({
          ...item,
          created_at: item.created_at ?? item.occurred_at,
        }))
      : [],
    allowed_actions: Array.isArray(order.allowed_actions) ? order.allowed_actions : [],
  }
}

function getPassengerOrders(data: PassengerHistoryResponse) {
  if (Array.isArray(data)) return data
  return data.orders ?? data.items ?? data.history ?? []
}

function emptyStringsToUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === '' ? undefined : value]),
  ) as T
}
