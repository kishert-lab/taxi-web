import { appConfig } from '../../app/config'

export type WebSocketEvent =
  | { type: 'sync.required'; payload?: unknown }
  | { type: 'order.updated'; payload: unknown }
  | { type: 'driver.location.updated'; payload: unknown }
  | { event: 'driver.location_updated'; payload: unknown; request_id?: string; occurred_at?: string }
  | { type: 'notification'; payload: unknown }
  | { type?: string; event?: string; payload?: unknown }

<<<<<<< HEAD
export function getWebSocketEndpoint() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const baseUrl = `${protocol}//${window.location.host}`
  const url = new URL(appConfig.wsUrl, baseUrl)
  url.pathname = '/api/v1/ws'
  url.search = ''
  url.hash = ''
  return url.toString()
}

export function createWebSocket(accessToken: string, endpoint = getWebSocketEndpoint()) {
  return new WebSocket(`${endpoint}?token=${encodeURIComponent(accessToken)}`)
=======
export function createWebSocket(accessToken: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const baseUrl = `${protocol}//${window.location.host}`
  const url = new URL(appConfig.wsUrl, baseUrl)
  url.searchParams.set('token', accessToken)
  return new WebSocket(url.toString())
>>>>>>> 39ca61c0e4a4a33edd925074686400a364054679
}
