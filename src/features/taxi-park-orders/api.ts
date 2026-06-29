import { http } from '../../shared/api/http'
import type { ApiResponse, MoneyCentsResponse } from '../../shared/api/types'

export type CoordinatesPayload = {
  latitude: number
  longitude: number
}

export type TaxiParkPaymentType = 'cash' | 'card' | 'corporate'

export type TaxiParkOrder = {
  id: string
  order_id?: string
  status: string
  driver_id?: string
  driver_name?: string
  passenger_phone?: string
  pickup_address?: string
  pickup_location?: CoordinatesPayload
  pickup_point?: CoordinatesPayload
  destination_address?: string
  destination_location?: CoordinatesPayload
  destination_point?: CoordinatesPayload
  comment?: string
  currency?: string
  gross_amount?: MoneyCentsResponse
  total_price?: MoneyCentsResponse
  price?: MoneyCentsResponse
  created_at: string
  completed_at?: string | null
}

export type TaxiParkScheduledOrderStatus =
  | 'scheduled_new'
  | 'scheduled_confirmed'
  | 'scheduled_driver_assigned'
  | 'scheduled_waiting_activation'
  | 'scheduled_activated'
  | 'scheduled_cancelled'
  | 'scheduled_expired'
  | 'scheduled_failed'

export type TaxiParkScheduledOrder = {
  id: string
  status?: string
  order_type?: string
  city_id?: string
  tariff_id?: string
  passenger_id?: string
  passenger_name?: string
  passenger_phone?: string
  driver_id?: string
  preassigned_driver_id?: string
  pickup_address?: string
  pickup_location?: CoordinatesPayload
  destination_address?: string
  destination_location?: CoordinatesPayload
  comment?: string
  payment_method?: TaxiParkPaymentType
  payment_type?: TaxiParkPaymentType
  scheduled_status: TaxiParkScheduledOrderStatus
  scheduled_at: string
  scheduled_timezone?: string
  activation_at?: string
  activated_at?: string
  scheduled_cancel_reason?: string
  scheduled_cancelled_at?: string
  scheduled_expired_at?: string
  created_at: string
  updated_at?: string
}

export type TaxiParkCreateOrderPayload = {
  city_id?: string
  tariff_id: string
  passenger_phone?: string
  pickup_address: string
  pickup_location: CoordinatesPayload
  destination_address: string
  destination_location: CoordinatesPayload
  payment_type: TaxiParkPaymentType
  comment?: string
}

export type TaxiParkCreateScheduledOrderPayload = {
  tariff_id: string
  passenger_name?: string
  passenger_phone?: string
  pickup_address: string
  pickup_location: CoordinatesPayload
  destination_address: string
  destination_location?: CoordinatesPayload
  payment_type: TaxiParkPaymentType
  comment?: string
  scheduled_at: string
  timezone?: string
  preassigned_driver_id?: string
}

export type TaxiParkUpdateOrderPayload = {
  destination_address?: string
  destination_location?: CoordinatesPayload
  comment?: string
}

export type TaxiParkUpdateScheduledOrderPayload = {
  pickup_address?: string
  pickup_location?: CoordinatesPayload
  destination_address?: string
  destination_location?: CoordinatesPayload
  payment_type?: TaxiParkPaymentType
  comment?: string
  scheduled_at?: string
  timezone?: string
  preassigned_driver_id?: string
}

export type TaxiParkCancelOrderPayload = {
  reason: string
}

export type TaxiParkAssignScheduledOrderDriverPayload = {
  driver_id: string
}

export type TaxiParkCompleteOrderPayload = {
  final_price: number
  currency: string
}

export type ChatMessage = {
  id: string
  thread_id: string
  order_id: string
  chat_type: 'dispatcher_driver' | 'driver_passenger' | 'passenger_support' | string
  sender_user_id: string
  sender_role: string
  body: string
  created_at: string
}

export type ChatMessagesResponse = {
  thread_id: string
  chat_type: string
  messages: ChatMessage[]
}

export async function getTaxiParkOrders(params?: { status?: string; limit?: number }) {
  const response = await http.get<ApiResponse<{ orders: TaxiParkOrder[] }>>('/taxi-park/orders', {
    params: params?.limit ? { limit: params.limit } : undefined,
  })
  const orders = response.data.data.orders.map(normalizeOrder)
  return params?.status ? orders.filter((order) => order.status === params.status) : orders
}

export async function getTaxiParkOrder(orderId: string) {
  const response = await http.get<ApiResponse<TaxiParkOrder>>(`/taxi-park/orders/${orderId}`)
  return normalizeOrder(response.data.data)
}

export async function createTaxiParkOrder(payload: TaxiParkCreateOrderPayload) {
  const response = await http.post<ApiResponse<unknown>>(
    '/taxi-park/orders',
    emptyStringsToUndefined(payload),
  )
  return response.data.data
}

export async function updateTaxiParkOrder(orderId: string, payload: TaxiParkUpdateOrderPayload) {
  const response = await http.patch<ApiResponse<TaxiParkOrder>>(
    `/taxi-park/orders/${orderId}`,
    emptyStringsToUndefined(payload),
  )
  return normalizeOrder(response.data.data)
}

export async function cancelTaxiParkOrder(orderId: string, payload: TaxiParkCancelOrderPayload) {
  const response = await http.post<ApiResponse<TaxiParkOrder>>(
    `/taxi-park/orders/${orderId}/cancel`,
    payload,
  )
  return normalizeOrder(response.data.data)
}

export async function completeTaxiParkOrder(orderId: string, payload: TaxiParkCompleteOrderPayload) {
  const response = await http.post<ApiResponse<TaxiParkOrder>>(
    `/taxi-park/orders/${orderId}/complete`,
    payload,
  )
  return normalizeOrder(response.data.data)
}

export async function getTaxiParkScheduledOrders() {
  const response = await http.get<ApiResponse<{ orders: TaxiParkScheduledOrder[] }>>(
    '/taxi-park/orders/scheduled',
  )
  return response.data.data.orders.map(normalizeScheduledOrder)
}

export async function getTaxiParkScheduledOrder(orderId: string) {
  const response = await http.get<ApiResponse<TaxiParkScheduledOrder>>(
    `/taxi-park/orders/scheduled/${orderId}`,
  )
  return normalizeScheduledOrder(response.data.data)
}

export async function createTaxiParkScheduledOrder(payload: TaxiParkCreateScheduledOrderPayload) {
  const response = await http.post<ApiResponse<TaxiParkScheduledOrder>>(
    '/taxi-park/orders/scheduled',
    emptyStringsToUndefined(payload),
  )
  return normalizeScheduledOrder(response.data.data)
}

export async function updateTaxiParkScheduledOrder(
  orderId: string,
  payload: TaxiParkUpdateScheduledOrderPayload,
) {
  const response = await http.patch<ApiResponse<TaxiParkScheduledOrder>>(
    `/taxi-park/orders/scheduled/${orderId}`,
    emptyStringsToUndefined(payload),
  )
  return normalizeScheduledOrder(response.data.data)
}

export async function assignTaxiParkScheduledOrderDriver(
  orderId: string,
  payload: TaxiParkAssignScheduledOrderDriverPayload,
) {
  const response = await http.post<ApiResponse<TaxiParkScheduledOrder>>(
    `/taxi-park/orders/scheduled/${orderId}/assign-driver`,
    payload,
  )
  return normalizeScheduledOrder(response.data.data)
}

export async function cancelTaxiParkScheduledOrder(
  orderId: string,
  payload: TaxiParkCancelOrderPayload,
) {
  const response = await http.post<ApiResponse<TaxiParkScheduledOrder>>(
    `/taxi-park/orders/scheduled/${orderId}/cancel`,
    payload,
  )
  return normalizeScheduledOrder(response.data.data)
}

export async function getTaxiParkDriverChatMessages(orderId: string, limit = 50) {
  const response = await http.get<ApiResponse<ChatMessagesResponse>>(
    `/taxi-park/orders/${orderId}/chat/driver/messages`,
    { params: { limit } },
  )
  return response.data.data
}

export async function sendTaxiParkDriverChatMessage(orderId: string, body: string) {
  const response = await http.post<ApiResponse<ChatMessage>>(
    `/taxi-park/orders/${orderId}/chat/driver/messages`,
    { body },
  )
  return response.data.data
}

function normalizeOrder(order: TaxiParkOrder) {
  return {
    ...order,
    id: order.id ?? order.order_id,
  }
}

function normalizeScheduledOrder(order: TaxiParkScheduledOrder) {
  return {
    ...order,
    payment_type: order.payment_type ?? order.payment_method,
  }
}

function emptyStringsToUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === '' ? undefined : value]),
  ) as T
}
