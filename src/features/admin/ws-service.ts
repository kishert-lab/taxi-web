import { QueryClient } from '@tanstack/react-query'

import { WebSocketConnection } from '../websocket/ws-connection'

export type AdminWebSocketEvent =
  | { type: 'order.created' | 'order.updated'; payload: { id: string } }
  | { type: 'driver.status.updated'; payload: { id: string; status: string } }
  | { type: 'notification'; payload: { message: string } }
  | { type: string; payload?: unknown }

export class AdminWebSocketService {
  private unsubscribe: (() => void) | null = null
  private readonly connection: WebSocketConnection
  private readonly queryClient: QueryClient

  constructor(queryClient: QueryClient, connection: WebSocketConnection) {
    this.queryClient = queryClient
    this.connection = connection
  }

  connect() {
<<<<<<< HEAD
    if (this.unsubscribe) return
    this.unsubscribe = this.connection.subscribe({
      onMessage: (message) => this.handleMessage(message.data),
    })
=======
    const accessToken = getAccessToken()
    if (!accessToken || this.socket) return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const baseUrl = `${protocol}//${window.location.host}`
    const url = new URL(appConfig.wsUrl, baseUrl)
    url.searchParams.set('token', accessToken)
    this.socket = new WebSocket(url.toString())
    this.socket.onmessage = (message) => this.handleMessage(message.data)
    this.socket.onclose = () => this.scheduleReconnect()
>>>>>>> 39ca61c0e4a4a33edd925074686400a364054679
  }

  disconnect() {
    this.unsubscribe?.()
    this.unsubscribe = null
  }

  private handleMessage(rawMessage: string) {
    let event: AdminWebSocketEvent
    try {
      event = JSON.parse(rawMessage) as AdminWebSocketEvent
      if (!event || typeof event.type !== 'string') return
    } catch {
      console.warn('Invalid admin WebSocket event')
      return
    }

    if (event.type === 'sync.required') {
      void this.queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      void this.queryClient.invalidateQueries({ queryKey: ['admin-drivers'] })
      void this.queryClient.invalidateQueries({ queryKey: ['admin-support'] })
      return
    }

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
}
