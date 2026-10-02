import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useWebSocketConnection } from '../websocket/ws-context'
import { AdminWebSocketService } from './ws-service'

export function useAdminWebSocket() {
  const queryClient = useQueryClient()
  const connection = useWebSocketConnection()

  useEffect(() => {
    const service = new AdminWebSocketService(queryClient, connection)
    service.connect()

    return () => service.disconnect()
  }, [connection, queryClient])
}
