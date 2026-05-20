import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { http } from '../../shared/api/http'
import { useAuthStore } from '../../shared/auth/auth-store'
import { createWebSocket, type WebSocketEvent } from './ws-client'

export function useWebSocket() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.user?.role)

  useEffect(() => {
    if (!accessToken) return

    const socket = createWebSocket(accessToken)
    socket.onmessage = (message) => {
      const event = JSON.parse(message.data) as WebSocketEvent

      if (event.type === 'sync.required') {
        if (role === 'taxi_park' || role === 'dispatcher') {
          void http.get('/taxi-park/orders')
          void queryClient.invalidateQueries({ queryKey: ['taxi-park-orders'] })
        }
        if (role === 'driver') {
          void http.get('/driver/orders/current')
          void queryClient.invalidateQueries({ queryKey: ['driver-orders-history'] })
        }
        if (role === 'passenger') {
          void http.get('/passenger/orders/current')
        }
      }

      if (event.type === 'order.updated') {
        void queryClient.invalidateQueries({ queryKey: ['taxi-park-orders'] })
      }
    }

    return () => socket.close()
  }, [accessToken, queryClient, role])
}
