import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { appConfig } from '../../app/config'
import { useAuthStore } from '../auth/auth-store'
import { getAccessToken, getRefreshToken, setTokens } from '../auth/token-storage'
import type { ApiResponse } from './types'

export const http = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()

  if (!refreshToken) {
    throw new Error('Refresh token is missing')
  }

  const response = await axios.post<
    ApiResponse<{ access_token: string; refresh_token: string }>
  >(`${appConfig.apiBaseUrl}/auth/refresh`, {
    refresh_token: refreshToken,
  })

  const { access_token: accessToken, refresh_token: nextRefreshToken } =
    response.data.data
  setTokens(accessToken, nextRefreshToken)
  useAuthStore.setState({ accessToken })

  return accessToken
}

http.interceptors.request.use((config) => {
  const accessToken = getAccessToken()

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      refreshPromise = refreshPromise ?? refreshAccessToken()
      const accessToken = await refreshPromise
      refreshPromise = null
      originalRequest.headers.Authorization = `Bearer ${accessToken}`

      return http(originalRequest)
    } catch (refreshError) {
      refreshPromise = null
      useAuthStore.getState().logout()
      window.location.assign('/login')

      return Promise.reject(refreshError)
    }
  },
)
