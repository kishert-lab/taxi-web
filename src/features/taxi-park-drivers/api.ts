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
  verification_status?: DriverVerificationStatus
  birth_date?: string | null
  license_series?: string
  license_number?: string
  license_issued_at?: string | null
  license_expires_at?: string | null
  driving_experience_from?: string | null
  taxi_park_comment?: string
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
  phone: string
  email?: string
  password?: string
  first_name?: string
  last_name?: string
  birth_date?: string
  license_series?: string
  license_number?: string
  license_issued_at?: string
  license_expires_at?: string
  driving_experience_from?: string
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
  license_issued_at?: string | null
  license_expires_at?: string | null
  driving_experience_from?: string | null
  is_verified: boolean
  taxi_park_comment?: string
  generated_password?: string
  password_generated: boolean
}

export async function getTaxiParkDrivers(status?: string) {
  const response = await http.get<ApiResponse<{ drivers: TaxiParkDriver[] }>>('/taxi-park/drivers')
  const drivers = response.data.data.drivers
  return status ? drivers.filter((driver) => driver.status === status) : drivers
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

export async function blockTaxiParkDriver(driverId: string, reason: string) {
  const response = await http.post<ApiResponse<{ blocked: boolean }>>(
    `/taxi-park/drivers/${driverId}/block`,
    { reason },
  )
  return response.data.data
}

export async function archiveTaxiParkDriver(driverId: string) {
  const response = await http.delete<ApiResponse<{ archived: boolean }>>(
    `/taxi-park/drivers/${driverId}`,
  )
  return response.data.data
}

function emptyStringsToUndefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, value === '' ? undefined : value]),
  ) as T
}
