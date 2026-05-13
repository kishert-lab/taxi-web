import { http } from '../../shared/api/http'
import type { ApiResponse } from '../../shared/api/types'

export type TaxiParkSettings = {
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
}

export async function getTaxiParkSettings() {
  const response = await http.get<ApiResponse<TaxiParkSettings>>('/taxi-park/settings')
  return response.data.data
}

export async function updateTaxiParkSettings(payload: TaxiParkSettings) {
  const response = await http.patch<ApiResponse<TaxiParkSettings>>(
    '/taxi-park/settings',
    payload,
  )
  return response.data.data
}
