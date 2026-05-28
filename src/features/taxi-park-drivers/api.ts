import { http } from '../../shared/api/http'
import type { ApiResponse } from '../../shared/api/types'

export type DriverStatus = 'offline' | 'online' | 'busy' | 'paused' | 'blocked'

export type TaxiParkDriver = {
  id: string
  user_id: string
  full_name: string
  phone?: string
  email?: string
  rating: number
  status: DriverStatus
  is_verified?: boolean
  verification_status?: DriverVerificationStatus
  birth_date?: string | null
  license_series?: string
  license_number?: string
  license_category?: string
  license_issued_at?: string | null
  license_expires_at?: string | null
  driving_experience_from?: string | null
  has_no_taxi_work_restrictions?: boolean
  federal_law_580_compliant?: boolean
  regional_requirements_compliant?: boolean
  medical_check_passed?: boolean
  pretrip_control_required?: boolean
  pretrip_control_passed?: boolean
  no_transport_ban?: boolean
  taxi_park_comment?: string
  attached_car_id?: string | null
  attached_car_ids?: string[]
  latitude?: number
  longitude?: number
  lat?: number
  lng?: number
  location?: {
    latitude?: number
    longitude?: number
    lat?: number
    lng?: number
  }
  last_location?: {
    latitude?: number
    longitude?: number
    lat?: number
    lng?: number
    updated_at?: string
  }
  location_updated_at?: string
  created_at: string
}

export type DriverVerificationStatus =
  | 'draft'
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'blocked'
  | 'archived'

export type TaxiParkDriverPayload = {
  phone?: string
  email?: string
  password?: string
  first_name?: string
  last_name?: string
  birth_date?: string
  license_series?: string
  license_number?: string
  license_category?: string
  license_issued_at?: string
  license_expires_at?: string
  driving_experience_from?: string
  has_no_taxi_work_restrictions?: boolean
  federal_law_580_compliant?: boolean
  regional_requirements_compliant?: boolean
  medical_check_passed?: boolean
  pretrip_control_required?: boolean
  pretrip_control_passed?: boolean
  no_transport_ban?: boolean
  verification_status?: DriverVerificationStatus
  taxi_park_comment?: string
  attached_car_id?: string
}

export type TaxiParkDriverPatchPayload = Partial<
  Omit<TaxiParkDriverPayload, 'phone' | 'email' | 'password'>
>

export type TaxiParkDriverMutationResponse = {
  user_id: string
  driver_id: string
  taxi_park_id: string
  phone: string
  email?: string
  name?: string
  status: DriverStatus
  verification_status: DriverVerificationStatus
  rating: number
  ratings_count: number
  birth_date?: string | null
  license_series?: string
  license_number?: string
  license_category?: string
  license_issued_at?: string | null
  license_expires_at?: string | null
  driving_experience_from?: string | null
  has_no_taxi_work_restrictions?: boolean
  federal_law_580_compliant?: boolean
  regional_requirements_compliant?: boolean
  medical_check_passed?: boolean
  pretrip_control_required?: boolean
  pretrip_control_passed?: boolean
  no_transport_ban?: boolean
  is_verified: boolean
  taxi_park_comment?: string
  generated_password?: string
  password_generated: boolean
}

export type TaxiParkDriverDocument = {
  id: string
  driver_id?: string
  document_type: string
  status?: DriverVerificationStatus | string
  file_url?: string
  url?: string
  number?: string
  issued_at?: string | null
  expires_at?: string | null
  comment?: string
  created_at?: string
  updated_at?: string
}

export type TaxiParkDriverPasswordResponse = {
  driver_id: string
  password_updated: boolean
}

export async function getTaxiParkDrivers(status?: string) {
  const response = await http.get<ApiResponse<{ drivers: TaxiParkDriver[] }>>('/taxi-park/drivers')
  const drivers = response.data.data.drivers
  return status ? drivers.filter((driver) => driver.status === status) : drivers
}

export async function getTaxiParkDriverDocuments(driverId: string) {
  const response = await http.get<
    ApiResponse<{ documents?: TaxiParkDriverDocument[] } | TaxiParkDriverDocument[]>
  >(`/taxi-park/drivers/${driverId}/documents`)
  return normalizeDocumentsResponse<TaxiParkDriverDocument>(response.data.data)
}

export async function attachTaxiParkDriverCar(driverId: string, carId: string) {
  const response = await http.post<ApiResponse<{ attached: boolean; assigned?: boolean }>>(
    `/taxi-park/drivers/${driverId}/cars/${carId}`,
  )
  return response.data.data
}

export async function assignTaxiParkDriverCar(driverId: string, carId: string) {
  const response = await http.post<ApiResponse<{ assigned: boolean }>>(
    `/taxi-park/drivers/${driverId}/cars/${carId}/assign`,
  )
  return response.data.data
}

export async function detachTaxiParkDriverCar(driverId: string, carId: string) {
  const response = await http.delete<ApiResponse<{ detached: boolean }>>(
    `/taxi-park/drivers/${driverId}/cars/${carId}`,
  )
  return response.data.data
}

export async function createTaxiParkDriver(payload: TaxiParkDriverPayload) {
  const response = await http.post<ApiResponse<TaxiParkDriverMutationResponse>>(
    '/taxi-park/drivers',
    emptyStringsToUndefined(payload),
  )
  return response.data.data
}

export async function updateTaxiParkDriver(
  driverId: string,
  payload: TaxiParkDriverPatchPayload,
) {
  const response = await http.patch<ApiResponse<TaxiParkDriverMutationResponse>>(
    `/taxi-park/drivers/${driverId}`,
    emptyStringsToUndefined(payload),
  )
  return response.data.data
}

export async function verifyTaxiParkDriverForLine(driverId: string) {
  return updateTaxiParkDriver(driverId, {
    verification_status: 'verified',
    has_no_taxi_work_restrictions: true,
    federal_law_580_compliant: true,
    regional_requirements_compliant: true,
    medical_check_passed: true,
    pretrip_control_required: false,
    pretrip_control_passed: true,
    no_transport_ban: true,
  })
}

export async function blockTaxiParkDriver(driverId: string, reason: string) {
  const response = await http.post<ApiResponse<{ blocked: boolean }>>(
    `/taxi-park/drivers/${driverId}/block`,
    { reason },
  )
  return response.data.data
}

export async function unblockTaxiParkDriver(driverId: string) {
  const response = await http.post<ApiResponse<{ unblocked: boolean }>>(
    `/taxi-park/drivers/${driverId}/unblock`,
  )
  return response.data.data
}

export async function setTaxiParkDriverPassword(driverId: string, password: string) {
  const response = await http.post<ApiResponse<TaxiParkDriverPasswordResponse>>(
    `/taxi-park/drivers/${driverId}/password`,
    { password },
  )
  return response.data.data
}

export async function archiveTaxiParkDriver(driverId: string) {
  const response = await http.delete<ApiResponse<{ archived: boolean }>>(
    `/taxi-park/drivers/${driverId}`,
  )
  return response.data.data
}

function normalizeDocumentsResponse<T>(data: { documents?: T[] } | T[]) {
  return Array.isArray(data) ? data : (data.documents ?? [])
}

function emptyStringsToUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === '' ? undefined : value]),
  ) as T
}
