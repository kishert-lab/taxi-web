import { create } from 'zustand'

import type { AuthUser } from '../api/types'
import { clearTokens, getAccessToken, setTokens } from './token-storage'

const userStorageKey = 'taxi_platform_user'

function getStoredUser() {
  const rawUser = localStorage.getItem(userStorageKey)
  if (!rawUser) return null

  try {
    return JSON.parse(rawUser) as AuthUser
  } catch {
    return null
  }
}

type AuthState = {
  accessToken: string | null
  user: AuthUser | null
  setSession: (payload: {
    accessToken: string
    refreshToken: string
    user: AuthUser
  }) => void
  setUser: (user: AuthUser | null) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: getAccessToken(),
  user: getStoredUser(),
  setSession: ({ accessToken, refreshToken, user }) => {
    setTokens(accessToken, refreshToken)
    localStorage.setItem(userStorageKey, JSON.stringify(user))
    set({ accessToken, user })
  },
  setUser: (user) => {
    if (user) {
      localStorage.setItem(userStorageKey, JSON.stringify(user))
    } else {
      localStorage.removeItem(userStorageKey)
    }
    set({ user })
  },
  logout: () => {
    clearTokens()
    localStorage.removeItem(userStorageKey)
    set({ accessToken: null, user: null })
  },
}))
