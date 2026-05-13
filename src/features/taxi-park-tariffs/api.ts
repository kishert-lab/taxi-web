import { http } from '../../shared/api/http'
import type { ApiResponse } from '../../shared/api/types'

export type Tariff = {
  id: string
  name: string
  description?: string
  base_price_cents: number
  minimum_price_cents: number
  price_per_km_cents: number
  price_per_minute_cents: number
  fixed_routes: string[]
  is_active: boolean
}

export type TariffPayload = Omit<Tariff, 'id'>

export async function getTariffs() {
  const response = await http.get<ApiResponse<Tariff[]>>('/taxi-park/tariffs')
  return response.data.data
}

export async function createTariff(payload: TariffPayload) {
  const response = await http.post<ApiResponse<Tariff>>('/taxi-park/tariffs', payload)
  return response.data.data
}

export async function updateTariff(id: string, payload: Partial<TariffPayload>) {
  const response = await http.patch<ApiResponse<Tariff>>(
    `/taxi-park/tariffs/${id}`,
    payload,
  )
  return response.data.data
}
