import { http } from '../../shared/api/http'
import type { ApiResponse } from '../../shared/api/types'

export type TaxiParkDispatcher = {
  id: string
  dispatcher_id: string
  user_id: string
  taxi_park_id: string
  role: string
  phone: string
  email?: string
  first_name?: string
  last_name?: string
  name?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type TaxiParkCreateDispatcherPayload = {
  phone: string
  password: string
  email?: string
  first_name?: string
  last_name?: string
}

export type TaxiParkUpdateDispatcherPayload = {
  email?: string
  first_name?: string
  last_name?: string
}

export async function getTaxiParkDispatchers() {
  const response = await http.get<ApiResponse<{ dispatchers: TaxiParkDispatcher[] }>>(
    '/taxi-park/dispatchers',
  )

  return response.data.data.dispatchers.map(normalizeDispatcher)
}

export async function createTaxiParkDispatcher(payload: TaxiParkCreateDispatcherPayload) {
  const response = await http.post<ApiResponse<TaxiParkDispatcher>>(
    '/taxi-park/dispatchers',
    emptyStringsToUndefined(payload),
  )

  return normalizeDispatcher(response.data.data)
}

export async function updateTaxiParkDispatcher(
  dispatcherId: string,
  payload: TaxiParkUpdateDispatcherPayload,
) {
  const response = await http.patch<ApiResponse<TaxiParkDispatcher>>(
    `/taxi-park/dispatchers/${dispatcherId}`,
    emptyStringsToUndefined(payload),
  )

  return normalizeDispatcher(response.data.data)
}

export async function blockTaxiParkDispatcher(dispatcherId: string) {
  const response = await http.post<ApiResponse<unknown>>(
    `/taxi-park/dispatchers/${dispatcherId}/block`,
  )

  return response.data.data
}

export async function unblockTaxiParkDispatcher(dispatcherId: string) {
  const response = await http.post<ApiResponse<unknown>>(
    `/taxi-park/dispatchers/${dispatcherId}/unblock`,
  )

  return response.data.data
}

function normalizeDispatcher(dispatcher: TaxiParkDispatcher): TaxiParkDispatcher {
  return {
    ...dispatcher,
    id: dispatcher.dispatcher_id ?? dispatcher.id,
  }
}

function emptyStringsToUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === '' ? undefined : value]),
  ) as T
}
