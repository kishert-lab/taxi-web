import { appConfig } from '../../app/config'
import { type WebSocketDiagnostics, useWebSocketStore } from './ws-state'

export type SocketSession = { userId: string; endpoint: string }
export type SocketListener = {
  name?: string
  onOpen?: () => void
  onMessage: (message: MessageEvent) => void
}

type ConnectionOptions = {
  getAccessToken: (session: SocketSession) => Promise<string | null>
  createSocket: (token: string, endpoint: string) => WebSocket
}

const reconnectDelaysMs = [1000, 2000, 5000, 10_000, 30_000, 60_000]
const maxReconnectAttempts = 8
const heartbeatIntervalMs = 25_000

/** One transport shared by all consumers in the application provider. */
export class WebSocketConnection {
  private session: SocketSession | null = null
  private socket: WebSocket | null = null
  private listeners = new Set<SocketListener>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectAttempts = 0
  private generation = 0
  private connecting = false
  private intentionalClose = false
  private paused = false
  private readonly options: ConnectionOptions

  constructor(options: ConnectionOptions) {
    this.options = options
  }

  setSession(session: SocketSession | null) {
    if (
      this.session?.userId === session?.userId &&
      this.session?.endpoint === session?.endpoint
    )
      return
    this.stop(session ? 'session changed' : 'logout')
    this.session = session
    this.publish({ subscriptions: this.subscriptionNames() })
    void this.connect()
  }

  subscribe(listener: SocketListener) {
    this.listeners.add(listener)
    this.publish({ subscriptions: this.subscriptionNames() })
    if (this.socket?.readyState === WebSocket.OPEN && !this.intentionalClose)
      listener.onOpen?.()
    void this.connect()
    return () => {
      this.listeners.delete(listener)
      this.publish({ subscriptions: this.subscriptionNames() })
      if (this.listeners.size === 0) this.stop('unmount')
    }
  }

  disconnect(reason = 'unmount') {
    this.stop(reason)
    this.session = null
    this.publish({ status: 'disconnected', subscriptions: [] })
  }

  pauseForOffline() {
    if (this.paused) return
    this.paused = true
    this.stop('offline')
    this.publish({ status: 'disconnected', lastError: 'Network is offline' })
  }

  resumeAfterOnline() {
    this.paused = false
    this.forceReconnect('network restored')
  }

  forceReconnect(reason: string) {
    if (this.paused || !this.session || !this.listeners.size) return
    if (this.socket?.readyState === WebSocket.OPEN) return

    this.clearReconnectTimer()
    this.reconnectAttempts = 0
    this.publish({ reconnectAttempts: 0, lastError: null })

    if (this.socket?.readyState === WebSocket.CLOSED) {
      this.socket = null
      this.intentionalClose = false
    }
    if (this.socket?.readyState === WebSocket.CONNECTING) {
      this.intentionalClose = true
      this.log(`CLOSING stalled connection reason=${reason}`)
      this.socket.close(1000, reason)
      return
    }
    if (this.socket?.readyState === WebSocket.CLOSING) return
    void this.connect()
  }

  async connect() {
    if (
      this.paused ||
      !this.session ||
      !this.listeners.size ||
      this.connecting ||
      this.socket ||
      this.reconnectTimer !== null
    )
      return
    const generation = this.generation
    const session = this.session
    this.connecting = true
    this.publish({
      status: this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting',
      lastError: null,
    })
    this.log(
      this.reconnectAttempts > 0
        ? `RECONNECTING attempt ${this.reconnectAttempts}`
        : 'CONNECTING',
    )

    try {
      const token = await this.options.getAccessToken(session)
      if (generation !== this.generation || !token || this.paused) return
      const socket = this.options.createSocket(token, session.endpoint)
      this.socket = socket
      this.intentionalClose = false
      socket.onopen = () => {
        if (this.socket !== socket || this.intentionalClose) return
        this.clearReconnectTimer()
        this.reconnectAttempts = 0
        this.publish({
          status: 'connected',
          lastConnectedAt: Date.now(),
          reconnectAttempts: 0,
          lastError: null,
        })
        this.log('CONNECTED')
        this.startHeartbeat(socket)
        for (const listener of this.listeners) listener.onOpen?.()
      }
      socket.onmessage = (message) => {
        if (this.socket !== socket || this.intentionalClose) return
        this.publish({ lastMessageAt: Date.now() })
        this.log('MESSAGE received')
        for (const listener of this.listeners) listener.onMessage(message)
      }
      socket.onerror = () => {
        if (this.socket !== socket || this.intentionalClose) return
        this.publish({
          status: 'error',
          lastError: 'WebSocket transport error',
        })
        this.log('ERROR; waiting for CLOSE')
      }
      socket.onclose = (event) => {
        if (this.socket !== socket) return
        this.socket = null
        this.stopHeartbeat()
        this.publish({ lastDisconnectedAt: Date.now() })
        const details = `WebSocket closed: code=${event.code}${event.reason ? `, reason=${event.reason}` : ''}`
        this.log(details)
        if (this.intentionalClose) {
          this.intentionalClose = false
          void this.connect()
        } else if (event.code === 1000) {
          this.publish({ status: 'disconnected', lastError: details })
        } else {
          this.publish({ status: 'error', lastError: details })
          this.scheduleReconnect()
        }
      }
    } catch {
      if (generation === this.generation) {
        this.publish({
          status: 'error',
          lastError: 'WebSocket connection failed',
        })
        this.log('CONNECTION FAILED')
        this.scheduleReconnect()
      }
    } finally {
      if (generation === this.generation) this.connecting = false
    }
  }

  private stop(reason: string) {
    this.generation += 1
    this.connecting = false
    this.clearReconnectTimer()
    this.stopHeartbeat()
    this.reconnectAttempts = 0
    if (this.socket) {
      this.intentionalClose = true
      if (
        this.socket.readyState !== WebSocket.CLOSING &&
        this.socket.readyState !== WebSocket.CLOSED
      ) {
        this.log(`CLOSING reason=${reason}`)
        this.socket.close(1000, reason)
      }
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private startHeartbeat(socket: WebSocket) {
    this.stopHeartbeat()
    this.heartbeatTimer = setInterval(() => {
      if (this.socket !== socket || socket.readyState !== WebSocket.OPEN) return
      try {
        socket.send(
          JSON.stringify({
            event: 'ping',
            occurred_at: new Date().toISOString(),
          }),
        )
        this.log('HEARTBEAT ping')
      } catch {
        // A transport failure is reported through onerror/onclose.
        this.log('HEARTBEAT send failed; waiting for CLOSE')
      }
    }, heartbeatIntervalMs)
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = null
  }

  private scheduleReconnect() {
    if (
      this.paused ||
      !this.session ||
      !this.listeners.size ||
      this.reconnectTimer !== null
    )
      return
    if (this.reconnectAttempts >= maxReconnectAttempts) {
      this.publish({
        status: 'error',
        lastError: 'WebSocket reconnect limit reached',
        reconnectAttempts: this.reconnectAttempts,
      })
      this.log('RECONNECT LIMIT REACHED')
      return
    }
    const delay =
      reconnectDelaysMs[
        Math.min(this.reconnectAttempts, reconnectDelaysMs.length - 1)
      ]
    this.reconnectAttempts += 1
    this.publish({
      status: 'reconnecting',
      reconnectAttempts: this.reconnectAttempts,
    })
    this.log(
      `RECONNECT scheduled attempt ${this.reconnectAttempts} in ${delay}ms`,
    )
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, delay)
  }

  private subscriptionNames() {
    return [
      ...new Set(
        [...this.listeners]
          .map((listener) => listener.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ].sort()
  }

  private publish(state: Partial<WebSocketDiagnostics>) {
    useWebSocketStore.getState().update(state)
  }

  private log(message: string) {
    if (appConfig.webSocketDebug || import.meta.env.DEV)
      console.info(`[WS] ${message}`)
  }
}
