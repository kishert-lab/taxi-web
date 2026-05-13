import { appConfig } from '../../app/config'
import { http } from '../../shared/api/http'
import { mockApi } from '../../shared/api/mock-api'
import type { ApiResponse, AuthUser, UserRole } from '../../shared/api/types'

export type LoginRequest = {
  phone: string
  email: string
  role: UserRole
}

export type VerifyCodeRequest = LoginRequest & {
  code: string
}

export async function login(payload: LoginRequest) {
  if (appConfig.useMockApi) {
    return mockApi.login()
  }

  const response = await http.post<ApiResponse<{ expires_in_sec?: number }>>(
    '/auth/login',
    payload,
  )
  return response.data.data
}

export async function verifyCode(payload: VerifyCodeRequest) {
  if (appConfig.useMockApi) {
    return mockApi.verifyCode(payload.role)
  }

  const response = await http.post<
    ApiResponse<{
      access_token: string
      refresh_token: string
      user: AuthUser
    }>
  >('/auth/verify-code', payload)

  return response.data.data
}
