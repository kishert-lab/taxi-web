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

type TariffResponse = Omit<
  Tariff,
  | 'base_price_cents'
  | 'minimum_price_cents'
  | 'price_per_km_cents'
  | 'price_per_minute_cents'
  | 'fixed_routes'
> & {
  base_price: { amount_cents: number; currency: string }
  minimum_price: { amount_cents: number; currency: string }
  price_per_km: { amount_cents: number; currency: string }
  price_per_minute: { amount_cents: number; currency: string }
  fixed_routes?: unknown
}

function fromResponse(tariff: TariffResponse): Tariff {
  return {
    id: tariff.id,
    name: tariff.name,
    description: tariff.description,
    base_price_cents: tariff.base_price.amount_cents,
    minimum_price_cents: tariff.minimum_price.amount_cents,
    price_per_km_cents: tariff.price_per_km.amount_cents,
    price_per_minute_cents: tariff.price_per_minute.amount_cents,
    fixed_routes: Array.isArray(tariff.fixed_routes)
      ? tariff.fixed_routes.map(String)
      : [],
    is_active: tariff.is_active,
  }
}

export async function getTariffs() {
  const response = await http.get<ApiResponse<{ tariffs: TariffResponse[] }>>('/taxi-park/tariffs')
  return response.data.data.tariffs.map(fromResponse)
}

export async function createTariff(payload: TariffPayload) {
  const response = await http.post<ApiResponse<TariffResponse>>('/taxi-park/tariffs', payload)
  return fromResponse(response.data.data)
}

export async function updateTariff(id: string, payload: Partial<TariffPayload>) {
  const response = await http.patch<ApiResponse<TariffResponse>>(
    `/taxi-park/tariffs/${id}`,
    payload,
  )
  return fromResponse(response.data.data)
}
