import { http } from '../../shared/api/http'
import type { ApiResponse } from '../../shared/api/types'
import type { DriverVerificationStatus } from '../taxi-park-drivers/api'

export type CarVerificationStatus =
  | 'draft'
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'blocked'
  | 'archived'

export type TaxiParkCar = {
  id: string
  taxi_park_id: string
  brand: string
  model: string
  plate_number: string
  color: string
  year?: number
  vin?: string
  sts?: string
  pts?: string
  car_class?: string
  verification_status?: CarVerificationStatus | DriverVerificationStatus
  owner_or_legal_basis?: string
  owner_details?: string
  osago_expires_at?: string | null
  diagnostic_card_expires_at?: string | null
  taxi_permit_number?: string
  regional_registry_number?: string
  permit_region?: string
  permit_issued_at?: string | null
  permit_expires_at?: string | null
  driver_ids?: string[]
  primary_driver_id?: string
  attached_driver_ids?: string[]
  is_active?: boolean
  taxi_permit_verified?: boolean
  regional_registry_verified?: boolean
  regional_requirements_compliant?: boolean
  has_taxi_color_scheme?: boolean
  has_orange_roof_lamp?: boolean
  has_passenger_info?: boolean
  osago_verified?: boolean
  diagnostic_card_verified?: boolean
  technical_state_verified?: boolean
  localization_compliant?: boolean
  legal_use_basis_verified?: boolean
  created_at?: string
  updated_at?: string
}

export type TaxiParkCarPayload = {
  brand: string
  model: string
  plate_number: string
  color: string
  year?: number
  vin?: string
  sts?: string
  pts?: string
  car_class?: string
  verification_status?: CarVerificationStatus
  owner_or_legal_basis?: string
  owner_details?: string
  osago_expires_at?: string
  diagnostic_card_expires_at?: string
  taxi_permit_number?: string
  regional_registry_number?: string
  permit_region?: string
  permit_issued_at?: string
  permit_expires_at?: string
  driver_ids?: string[]
  is_active?: boolean
  taxi_permit_verified?: boolean
  regional_registry_verified?: boolean
  regional_requirements_compliant?: boolean
  has_taxi_color_scheme?: boolean
  has_orange_roof_lamp?: boolean
  has_passenger_info?: boolean
  osago_verified?: boolean
  diagnostic_card_verified?: boolean
  technical_state_verified?: boolean
  localization_compliant?: boolean
  legal_use_basis_verified?: boolean
}

export type TaxiParkCarDocument = {
  id: string
  car_id?: string
  document_type: string
  status?: CarVerificationStatus | DriverVerificationStatus | string
  file_url?: string
  url?: string
  number?: string
  issued_at?: string | null
  expires_at?: string | null
  comment?: string
  created_at?: string
  updated_at?: string
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

export async function archiveTaxiParkCar(carId: string) {
  const response = await http.delete<ApiResponse<{ archived: boolean }>>(
    `/taxi-park/cars/${carId}`,
  )
  return response.data.data
}

export async function getTaxiParkCarDocuments(carId: string) {
  const response = await http.get<
    ApiResponse<{ documents?: TaxiParkCarDocument[] } | TaxiParkCarDocument[]>
  >(`/taxi-park/cars/${carId}/documents`)
  return normalizeDocumentsResponse<TaxiParkCarDocument>(response.data.data)
}

export async function verifyTaxiParkCar(carId: string) {
  const response = await http.post<ApiResponse<TaxiParkCar>>(
    `/taxi-park/cars/${carId}/verify`,
  )
  return response.data.data
}

function normalizeDocumentsResponse<T>(data: { documents?: T[] } | T[]) {
  return Array.isArray(data) ? data : (data.documents ?? [])
}

function normalizePayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => {
      if (value === '' || value === undefined || value === null) return false
      if (Array.isArray(value) && value.length === 0) return false
      return true
    }),
  ) as T
}
