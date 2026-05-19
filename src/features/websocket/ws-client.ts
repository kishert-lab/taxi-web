import { appConfig } from '../../app/config'

export type WebSocketEvent =
  | { type: 'sync.required'; payload?: unknown }
  | { type: 'order.updated'; payload: unknown }
  | { type: 'driver.location.updated'; payload: unknown }
  | { type: 'notification'; payload: unknown }
  | { type: string; payload?: unknown }

export function createWebSocket(accessToken: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const baseUrl = `${protocol}//${window.location.host}`
  const url = new URL(appConfig.wsUrl, baseUrl)
  url.searchParams.set('token', accessToken)
  return new WebSocket(url.toString())
}
