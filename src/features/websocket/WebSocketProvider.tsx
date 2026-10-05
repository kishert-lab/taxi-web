import { useEffect, useState, type ReactNode } from 'react'

import { appConfig } from '../../app/config'
import { refreshSessionAccessToken } from '../../shared/api/http'
import { useAuthStore } from '../../shared/auth/auth-store'
import { createWebSocket, getWebSocketEndpoint } from './ws-client'
import { WebSocketConnection, type SocketSession } from './ws-connection'
import { WebSocketContext } from './ws-context'

async function getConnectionToken(
  session: SocketSession,
  options?: { forceRefresh?: boolean },
) {
  const state = useAuthStore.getState()
  if (state.user?.id !== session.userId || !state.accessToken) return null
  if (options?.forceRefresh || isAccessTokenExpired(state.accessToken)) {
    try {
      await refreshSessionAccessToken()
    } catch {
      if (
        useAuthStore.getState().user?.id === session.userId &&
        useAuthStore.getState().accessToken === state.accessToken
      ) {
        console.warn('WebSocket authentication refresh failed')
        useAuthStore.getState().logout()
      }
      return null
    }
  }
  const current = useAuthStore.getState()
  return current.user?.id === session.userId ? current.accessToken : null
}

function isAccessTokenExpired(token: string) {
  try {
    const payload = JSON.parse(
      atob((token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: number }
    return (
      typeof payload.exp !== 'number' ||
      payload.exp * 1000 <= Date.now() + 30_000
    )
  } catch {
    return true
  }
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [connection] = useState(
    () =>
      new WebSocketConnection({
        getAccessToken: getConnectionToken,
        createSocket: createWebSocket,
      }),
  )
  const endpoint = getWebSocketEndpoint()

  useEffect(() => {
    const updateSession = () => {
      const { user, accessToken } = useAuthStore.getState()
      connection.setSession(
        user && accessToken && !appConfig.useMockApi
          ? { userId: user.id, endpoint }
          : null,
      )
    }
    updateSession()
    const unsubscribe = useAuthStore.subscribe(updateSession)
    const handleOffline = () => connection.pauseForOffline()
    const handleOnline = () => connection.resumeAfterOnline()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine)
        connection.forceReconnect('tab became visible')
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      unsubscribe()
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      connection.disconnect('unmount')
    }
  }, [connection, endpoint])

  return (
    <WebSocketContext.Provider value={connection}>
      {children}
    </WebSocketContext.Provider>
  )
}
