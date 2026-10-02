import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import { appConfig } from '../../app/config'
import { useAuthStore } from '../auth/auth-store'
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '../auth/token-storage'
import type { ApiResponse } from './types'

export const http = axios.create({
  baseURL: appConfig.apiBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<string> | null = null
let refreshingSessionToken: string | null = null

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  const user = useAuthStore.getState().user

  if (!refreshToken) {
    throw new Error('Refresh token is missing')
  }

<<<<<<< HEAD
  const ensureCurrentSession = () => {
    if (
      getRefreshToken() !== refreshToken ||
      useAuthStore.getState().user?.id !== user?.id
    ) {
      throw new Error('Session changed during access token refresh')
    }
  }

  if (user?.role === 'passenger') {
    const response = await axios.post<
      ApiResponse<{ access_token: string; refresh_token: string }>
    >(`${appConfig.apiBaseUrl}/passenger/auth/refresh`, {
      refresh_token: refreshToken,
    })

    const { access_token: accessToken, refresh_token: nextRefreshToken } =
      response.data.data
    ensureCurrentSession()
    setTokens(accessToken, nextRefreshToken)
    useAuthStore.setState({ accessToken })

    return accessToken
  }

  const response = await axios.post<
    ApiResponse<{ access_token: string; refresh_token: string }>
  >(`${appConfig.apiBaseUrl}/auth/refresh`, {
    refresh_token: refreshToken,
  })

  const { access_token: accessToken, refresh_token: nextRefreshToken } =
    response.data.data
  ensureCurrentSession()
=======
  if (user?.role === 'passenger') {
    const response = await axios.post<ApiResponse<{ access_token: string; refresh_token: string }>>(
      `${appConfig.apiBaseUrl}/passenger/auth/refresh`,
      {
        refresh_token: refreshToken,
      },
    )

    const { access_token: accessToken, refresh_token: nextRefreshToken } = response.data.data
    setTokens(accessToken, nextRefreshToken)
    useAuthStore.setState({ accessToken })

    return accessToken
  }

  const response = await axios.post<ApiResponse<{ access_token: string; refresh_token: string }>>(
    `${appConfig.apiBaseUrl}/auth/refresh`,
    {
      refresh_token: refreshToken,
    },
  )

  const { access_token: accessToken, refresh_token: nextRefreshToken } = response.data.data
>>>>>>> 39ca61c0e4a4a33edd925074686400a364054679
  setTokens(accessToken, nextRefreshToken)
  useAuthStore.setState({ accessToken })

  return accessToken
}

export async function refreshSessionAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshPromise || refreshingSessionToken !== refreshToken) {
    refreshingSessionToken = refreshToken
    refreshPromise = refreshAccessToken()
  }
  const pendingRefresh = refreshPromise
  try {
    return await pendingRefresh
  } finally {
    if (refreshPromise === pendingRefresh) {
      refreshPromise = null
      refreshingSessionToken = null
    }
  }
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

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true
    const sessionBeforeRefresh = useAuthStore.getState()

    try {
      const accessToken = await refreshSessionAccessToken()
      originalRequest.headers.Authorization = `Bearer ${accessToken}`

      return http(originalRequest)
    } catch (refreshError) {
      const currentSession = useAuthStore.getState()
      if (
        currentSession.user?.id === sessionBeforeRefresh.user?.id &&
        currentSession.accessToken === sessionBeforeRefresh.accessToken
      ) {
        currentSession.logout()
        window.location.assign('/login')
      }

      return Promise.reject(refreshError)
    }
  },
)
