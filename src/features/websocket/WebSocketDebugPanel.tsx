import { appConfig } from '../../app/config'
import { useWebSocketStore } from './ws-state'

function formatTime(timestamp: number | null) {
  return timestamp ? new Date(timestamp).toLocaleTimeString() : '—'
}

export function WebSocketDebugPanel() {
  const diagnostics = useWebSocketStore((state) => ({
    status: state.status,
    lastConnectedAt: state.lastConnectedAt,
    lastMessageAt: state.lastMessageAt,
    reconnectAttempts: state.reconnectAttempts,
    subscriptions: state.subscriptions,
    lastError: state.lastError,
  }))

  if (!import.meta.env.DEV && !appConfig.webSocketDebug) return null

  return (
    <aside className="fixed bottom-3 right-3 z-50 max-w-xs rounded-md border border-slate-300 bg-white/95 p-3 font-mono text-xs text-slate-700 shadow-lg">
      <p className="font-semibold">
        WebSocket: {diagnostics.status.toUpperCase()}
      </p>
      <p>Connected: {formatTime(diagnostics.lastConnectedAt)}</p>
      <p>Last message: {formatTime(diagnostics.lastMessageAt)}</p>
      <p>Reconnects: {diagnostics.reconnectAttempts}</p>
      <p>Subscriptions: {diagnostics.subscriptions.join(', ') || '—'}</p>
      {diagnostics.lastError && (
        <p className="mt-1 text-rose-700">{diagnostics.lastError}</p>
      )}
    </aside>
  )
}
