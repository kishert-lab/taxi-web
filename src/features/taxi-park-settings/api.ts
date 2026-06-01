import { http } from '../../shared/api/http'
import type { ApiResponse } from '../../shared/api/types'

export type TaxiParkSettings = {
  city_id?: string
  city?: {
    id: string
    name: string
    region?: string
    country_code?: string
    timezone?: string
    center?: {
      latitude: number
      longitude: number
    }
  }
  display_name: string
  short_name: string
  legal_name: string
  inn: string
  ogrn: string
  legal_address: string
  support_phone: string
  support_email: string
  website?: string
  logo_url?: string
  primary_color: string
  secondary_color: string
  allow_cash_payment: boolean
  allow_card_payment: boolean
  allow_transfer_payment: boolean
  minimum_order_price_cents: number
  commission_basis_points: number
  cancellation_timeout_sec: number
  driver_arrival_timeout_sec: number
  is_active: boolean
  dispatch?: TaxiParkDispatchSettings
}

export type TaxiParkDispatchSettings = {
  initial_radius_meters: number
  max_radius_meters: number
  radius_step_meters: number
  radius_attempts_meters: number[]
  max_drivers_per_offer: number
  driver_location_max_age_sec: number
  offer_ttl_sec: number
  accept_lock_ttl_sec: number
  worker_poll_timeout_sec: number
  recovery_interval_sec: number
}

export type TaxiParkSettingsPayload = {
  display_name: string
  short_name?: string
  legal_name?: string
  inn?: string
  ogrn?: string
  legal_address?: string
  support_phone?: string
  support_email?: string
  website?: string
  logo_url?: string
  primary_color?: string
  secondary_color?: string
  allow_cash_payment: boolean
  allow_card_payment: boolean
  allow_transfer_payment: boolean
  minimum_order_price_cents: number
  commission_basis_points: number
  cancellation_timeout_sec: number
  driver_arrival_timeout_sec: number
  dispatch?: TaxiParkDispatchSettings
}

type TaxiParkSettingsResponse = Omit<
  TaxiParkSettings,
  'minimum_order_price_cents' | 'commission_basis_points'
> & {
  minimum_order_price: { amount_cents: number; currency: string }
  commission_basis_points?: number | null
}

export async function getTaxiParkSettings() {
  const response = await http.get<ApiResponse<TaxiParkSettingsResponse>>('/taxi-park/settings')
  const data = response.data.data
  return {
    ...data,
    minimum_order_price_cents: data.minimum_order_price.amount_cents,
    commission_basis_points: data.commission_basis_points ?? 100,
  }
}

export async function updateTaxiParkSettings(payload: TaxiParkSettingsPayload) {
  const response = await http.patch<ApiResponse<TaxiParkSettings>>(
    '/taxi-park/settings',
    payload,
  )
  return response.data.data
}
