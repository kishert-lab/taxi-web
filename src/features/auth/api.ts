import { appConfig } from '../../app/config'
import { http } from '../../shared/api/http'
import { mockApi } from '../../shared/api/mock-api'
import type { ApiResponse, AuthUser, UserRole } from '../../shared/api/types'

export type LoginRequest = {
  phone: string
  password: string
  role: UserRole
}

export type DriverRegistrationRequest = {
  phone: string
  email: string
  password: string
  first_name: string
  last_name?: string
  registration_type: 'driver'
  city_id?: string
  personal_data_consent: boolean
  terms_accepted: boolean
  privacy_policy_version: string
  terms_version: string
}

export type RegistrationResponse = {
  user_id: string
  role: UserRole
  registration_type: 'driver' | 'passenger' | 'taxi_park'
  phone_masked: string
  email_masked: string
  message: string
  debug_code?: string
}

export type ConfirmPhoneRequest = {
  phone: string
  registration_type: 'driver' | 'passenger' | 'taxi_park'
  code: string
}

export async function login(payload: LoginRequest) {
  if (appConfig.useMockApi) {
    return mockApi.login(payload.role, payload.phone)
  }

  const response = await http.post<
    ApiResponse<{
      access_token: string
      refresh_token: string
      token_type: string
      expires_in: number
      user?: AuthUser
    }>
  >('/auth/login', payload)
  return {
    ...response.data.data,
    user: {
      id: payload.phone,
      phone: payload.phone,
      role: payload.role,
      name: payload.phone,
    },
  }
}

export async function registerDriver(payload: DriverRegistrationRequest) {
  const response = await http.post<ApiResponse<RegistrationResponse>>(
    '/auth/register',
    payload,
  )
  return response.data.data
}

export async function confirmPhone(payload: ConfirmPhoneRequest) {
  const response = await http.post<ApiResponse<{ phone_confirmed: boolean }>>(
    '/auth/confirm-phone',
    payload,
  )
  return response.data.data
}
