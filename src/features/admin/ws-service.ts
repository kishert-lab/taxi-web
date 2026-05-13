import { QueryClient } from '@tanstack/react-query'

import { appConfig } from '../../app/config'
import { getAccessToken } from '../../shared/auth/token-storage'

export type AdminWebSocketEvent =
  | { type: 'order.created' | 'order.updated'; payload: { id: string } }
  | { type: 'driver.status.updated'; payload: { id: string; status: string } }
  | { type: 'notification'; payload: { message: string } }
  | { type: string; payload?: unknown }

export class AdminWebSocketService {
  private socket: WebSocket | null = null
  private reconnectTimer: number | null = null
  private readonly queryClient: QueryClient

  constructor(queryClient: QueryClient) {
    this.queryClient = queryClient
  }

  connect() {
    const accessToken = getAccessToken()
    if (!accessToken || this.socket) return

    const url = new URL(appConfig.wsUrl)
    url.searchParams.set('token', accessToken)
    this.socket = new WebSocket(url.toString())
    this.socket.onmessage = (message) => this.handleMessage(message.data)
    this.socket.onclose = () => this.scheduleReconnect()
  }

  disconnect() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.socket?.close()
    this.socket = null
  }

  private handleMessage(rawMessage: string) {
    const event = JSON.parse(rawMessage) as AdminWebSocketEvent

    if (event.type === 'order.created' || event.type === 'order.updated') {
      void this.queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      return
    }

    if (event.type === 'driver.status.updated') {
      void this.queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
      return
    }

    if (event.type === 'notification') {
      void this.queryClient.invalidateQueries({ queryKey: ['admin-support'] })
    }
  }

  private scheduleReconnect() {
    this.socket = null
    this.reconnectTimer = window.setTimeout(() => this.connect(), 3000)
  }
}
