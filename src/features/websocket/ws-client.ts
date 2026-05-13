import { appConfig } from '../../app/config'

export type WebSocketEvent =
  | { type: 'sync.required'; payload?: unknown }
  | { type: 'order.updated'; payload: unknown }
  | { type: 'driver.location.updated'; payload: unknown }
  | { type: 'notification'; payload: unknown }
  | { type: string; payload?: unknown }

export function createWebSocket(accessToken: string) {
  const url = new URL(appConfig.wsUrl)
  url.searchParams.set('token', accessToken)
  return new WebSocket(url.toString())
}
