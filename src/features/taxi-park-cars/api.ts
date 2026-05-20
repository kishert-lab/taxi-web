import { http } from '../../shared/api/http'
import type { ApiResponse } from '../../shared/api/types'
import type { DriverVerificationStatus } from '../taxi-park-drivers/api'

export type TaxiParkCar = {
  id: string
  taxi_park_id: string
  brand: string
  model: string
  plate_number: string
  color: string
  year?: number
  car_class?: string
  is_active?: boolean
  verification_status?: DriverVerificationStatus
  primary_driver_id?: string
  attached_driver_ids?: string[]
  vin?: string
  sts?: string
  pts?: string
  taxi_permit_number?: string
  permit_issued_at?: string | null
  permit_expires_at?: string | null
  permit_region?: string
  regional_registry_number?: string
  osago_expires_at?: string | null
  diagnostic_card_expires_at?: string | null
  owner_details?: string
  created_at?: string
  updated_at?: string
}

export type TaxiParkCarPayload = {
  brand: string
  model: string
  plate_number: string
  color: string
  year?: number
  car_class?: string
  is_active?: boolean
  verification_status?: DriverVerificationStatus
  primary_driver_id?: string
  attached_driver_ids?: string[]
  vin?: string
  sts?: string
  pts?: string
  taxi_permit_number?: string
  permit_issued_at?: string
  permit_expires_at?: string
  permit_region?: string
  regional_registry_number?: string
  osago_expires_at?: string
  diagnostic_card_expires_at?: string
  owner_details?: string
}

export type TaxiParkCarPatchPayload = Partial<TaxiParkCarPayload>

export async function getTaxiParkCars() {
  const response = await http.get<ApiResponse<{ cars: TaxiParkCar[] }>>('/taxi-park/cars')
  return response.data.data.cars
}

export async function createTaxiParkCar(payload: TaxiParkCarPayload) {
  const response = await http.post<ApiResponse<TaxiParkCar>>(
    '/taxi-park/cars',
    normalizePayload(payload),
  )
  return response.data.data
}

export async function updateTaxiParkCar(carId: string, payload: TaxiParkCarPatchPayload) {
  const response = await http.patch<ApiResponse<TaxiParkCar>>(
    `/taxi-park/cars/${carId}`,
    normalizePayload(payload),
  )
  return response.data.data
}

function normalizePayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value === '' || value === undefined) return false
      if (Array.isArray(value) && value.length === 0) return false
      return true
    }),
  ) as T
}
