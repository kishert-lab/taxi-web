import { createContext, useContext } from 'react'

import { WebSocketConnection } from './ws-connection'

export const WebSocketContext = createContext<WebSocketConnection | null>(null)

export function useWebSocketConnection() {
  const connection = useContext(WebSocketContext)
  if (!connection) throw new Error('WebSocketProvider is missing')
  return connection
}
