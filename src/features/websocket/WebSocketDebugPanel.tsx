import { appConfig } from '../../app/config'
import { useWebSocketStore } from './ws-state'

function formatTime(timestamp: number | null) {
  return timestamp ? new Date(timestamp).toLocaleTimeString() : '—'
}

export function WebSocketDebugPanel() {
  const status = useWebSocketStore((state) => state.status)
  const lastConnectedAt = useWebSocketStore((state) => state.lastConnectedAt)
  const lastMessageAt = useWebSocketStore((state) => state.lastMessageAt)
  const reconnectAttempts = useWebSocketStore(
    (state) => state.reconnectAttempts,
  )
  const subscriptions = useWebSocketStore((state) => state.subscriptions)
  const lastError = useWebSocketStore((state) => state.lastError)

  if (!import.meta.env.DEV && !appConfig.webSocketDebug) return null

  return (
    <aside className="fixed bottom-3 right-3 z-50 max-w-xs rounded-md border border-slate-300 bg-white/95 p-3 font-mono text-xs text-slate-700 shadow-lg">
      <p className="font-semibold">WebSocket: {status.toUpperCase()}</p>
      <p>Connected: {formatTime(lastConnectedAt)}</p>
      <p>Last message: {formatTime(lastMessageAt)}</p>
      <p>Reconnects: {reconnectAttempts}</p>
      <p>Subscriptions: {subscriptions.join(', ') || '—'}</p>
      {lastError && <p className="mt-1 text-rose-700">{lastError}</p>}
    </aside>
  )
}
