import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { appConfig } from '../../app/config'
import { useAuthStore } from '../../shared/auth/auth-store'
import { AdminWebSocketService } from './ws-service'

export function useAdminWebSocket() {
  const queryClient = useQueryClient()
  const accessToken = useAuthStore((state) => state.accessToken)

  useEffect(() => {
    if (!accessToken || appConfig.useMockApi) return

    const service = new AdminWebSocketService(queryClient)
    service.connect()

    return () => service.disconnect()
  }, [accessToken, queryClient])
}
