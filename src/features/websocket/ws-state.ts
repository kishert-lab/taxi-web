import { create } from 'zustand'

export type WebSocketStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error'

export type WebSocketDiagnostics = {
  status: WebSocketStatus
  lastConnectedAt: number | null
  lastDisconnectedAt: number | null
  reconnectAttempts: number
  lastError: string | null
  lastMessageAt: number | null
  subscriptions: string[]
}

type WebSocketDiagnosticsState = WebSocketDiagnostics & {
  update: (state: Partial<WebSocketDiagnostics>) => void
  reset: () => void
}

export const initialWebSocketDiagnostics: WebSocketDiagnostics = {
  status: 'disconnected',
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  reconnectAttempts: 0,
  lastError: null,
  lastMessageAt: null,
  subscriptions: [],
}

export const useWebSocketStore = create<WebSocketDiagnosticsState>((set) => ({
  ...initialWebSocketDiagnostics,
  update: (state) => set(state),
  reset: () => set(initialWebSocketDiagnostics),
}))
