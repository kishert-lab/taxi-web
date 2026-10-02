export type SocketSession = { userId: string; endpoint: string }
export type SocketListener = {
  onOpen?: () => void
  onMessage: (message: MessageEvent) => void
}

type ConnectionOptions = {
  getAccessToken: (session: SocketSession) => Promise<string | null>
  createSocket: (token: string, endpoint: string) => WebSocket
}

/** One transport shared by all consumers in the application provider. */
export class WebSocketConnection {
  private session: SocketSession | null = null
  private socket: WebSocket | null = null
  private listeners = new Set<SocketListener>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private generation = 0
  private connecting = false
  private intentionalClose = false
  private options: ConnectionOptions

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
    void this.connect()
  }

  subscribe(listener: SocketListener) {
    this.listeners.add(listener)
    if (this.socket?.readyState === WebSocket.OPEN && !this.intentionalClose)
      listener.onOpen?.()
    void this.connect()
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) this.stop('unmount')
    }
  }

  disconnect(reason = 'unmount') {
    this.stop(reason)
    this.session = null
  }

  async connect() {
    if (
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
    try {
      const token = await this.options.getAccessToken(session)
      if (generation !== this.generation || !token) return
      const socket = this.options.createSocket(token, session.endpoint)
      this.socket = socket
      this.intentionalClose = false
      socket.onopen = () => {
        if (this.socket !== socket || this.intentionalClose) return
        this.clearReconnectTimer()
        this.reconnectAttempts = 0
        for (const listener of this.listeners) listener.onOpen?.()
      }
      socket.onmessage = (message) => {
        if (this.socket !== socket || this.intentionalClose) return
        for (const listener of this.listeners) listener.onMessage(message)
      }
      // Browsers deliver close after a transport error. Only close schedules retries.
      socket.onerror = () => {
        console.warn('WebSocket transport error; waiting for close')
      }
      socket.onclose = (event) => {
        if (this.socket !== socket) return
        this.socket = null
        if (this.intentionalClose) {
          this.intentionalClose = false
          // A replacement session must wait for this close handshake.
          void this.connect()
        } else if (event.code !== 1000) {
          this.scheduleReconnect()
        }
      }
    } catch {
      if (generation === this.generation) {
        console.warn('WebSocket connection failed; scheduling retry')
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
    this.reconnectAttempts = 0
    if (this.socket) {
      this.intentionalClose = true
      if (
        this.socket.readyState !== WebSocket.CLOSING &&
        this.socket.readyState !== WebSocket.CLOSED
      ) {
        this.socket.close(1000, reason)
      }
      // Keep the socket until onclose, including during React StrictMode cleanup.
    }
  }

  private clearReconnectTimer() {
    if (this.reconnectTimer !== null) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
  }

  private scheduleReconnect() {
    if (!this.session || !this.listeners.size || this.reconnectTimer !== null)
      return
    const delay = Math.min(
      1000 * 2 ** Math.min(this.reconnectAttempts, 5),
      30_000,
    )
    this.reconnectAttempts += 1
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect()
    }, delay)
  }
}
