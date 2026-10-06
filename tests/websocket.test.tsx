import { StrictMode, type ReactNode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { appConfig } from '../src/app/config'
import { http, refreshSessionAccessToken } from '../src/shared/api/http'
import { useAuthStore } from '../src/shared/auth/auth-store'
import { WebSocketProvider } from '../src/features/websocket/WebSocketProvider'
import { useWebSocket } from '../src/features/websocket/use-mobile-ws'
import { useAdminWebSocket } from '../src/features/admin/use-admin-websocket'
import { WebSocketConnection } from '../src/features/websocket/ws-connection'
import { createWebSocket } from '../src/features/websocket/ws-client'
import {
  initialWebSocketDiagnostics,
  useWebSocketStore,
} from '../src/features/websocket/ws-state'

vi.mock('../src/shared/api/http', () => ({
  http: { get: vi.fn().mockResolvedValue({ data: {} }) },
  refreshSessionAccessToken: vi.fn(),
}))

vi.mock('react-hot-toast', () => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    custom: vi.fn(),
    dismiss: vi.fn(),
  })
  return { default: toast }
})

class FakeWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: FakeWebSocket[] = []
  readyState = FakeWebSocket.CONNECTING
  url: string
  onopen: (() => void) | null = null
  onclose: ((event: { code: number }) => void) | null = null
  onerror: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  send = vi.fn()
  close = vi.fn((...args: [number, string]) => {
    void args
    this.readyState = FakeWebSocket.CLOSING
  })
  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }
  open() {
    this.readyState = FakeWebSocket.OPEN
    this.onopen?.()
  }
  finishClose(code = 1006) {
    this.readyState = FakeWebSocket.CLOSED
    this.onclose?.({ code })
  }
  message(type: string, payload?: unknown) {
    this.onmessage?.({
      data: JSON.stringify(payload === undefined ? { type } : { type, payload }),
    })
  }
}

const endpoint = 'wss://taxi.dev.wkfc.ru/api/v1/ws'
const token = (suffix: string, exp = Date.now() / 1000 + 3600) =>
  `header.${btoa(JSON.stringify({ exp }))}.${suffix}`
const session = (id = 'user-1', accessToken = token('first')) =>
  useAuthStore.getState().setSession({
    accessToken,
    refreshToken: 'refresh',
    user: { id, role: 'driver' },
  })
const flush = async () => {
  await act(async () => {
    await Promise.resolve()
  })
}
const advance = async (milliseconds: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds)
  })
}

function Consumer() {
  useWebSocket()
  return null
}
function AdminConsumer() {
  useAdminWebSocket()
  return null
}
function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>{children}</WebSocketProvider>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'Date',
    ],
  })
  vi.clearAllMocks()
  vi.stubGlobal('WebSocket', FakeWebSocket)
  FakeWebSocket.instances = []
  appConfig.wsUrl = endpoint
  appConfig.useMockApi = false
  useWebSocketStore.setState(initialWebSocketDiagnostics)
  session()
})
afterEach(() => {
  cleanup()
  useAuthStore.getState().logout()
  useWebSocketStore.setState(initialWebSocketDiagnostics)
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('application WebSocket lifecycle', () => {
  it('keeps the open connection through access token refresh and the 15 minute boundary', async () => {
    render(<Consumer />, { wrapper: Wrapper })
    await flush()
    const socket = FakeWebSocket.instances[0]
    act(() => socket.open())
    act(() => useAuthStore.setState({ accessToken: token('refreshed') }))
    await advance(901_000)
    expect(socket.close).not.toHaveBeenCalled()
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('closes logout explicitly with 1000 and does not reconnect', async () => {
    render(<Consumer />, { wrapper: Wrapper })
    await flush()
    const socket = FakeWebSocket.instances[0]
    act(() => {
      socket.open()
      useAuthStore.getState().logout()
    })
    expect(socket.close).toHaveBeenCalledWith(1000, 'logout')
    act(() => socket.finishClose(1000))
    await advance(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('shares one connecting/open socket across mobile and admin consumers', async () => {
    render(
      <>
        <Consumer />
        <AdminConsumer />
        <Consumer />
      </>,
      { wrapper: Wrapper },
    )
    await flush()
    expect(FakeWebSocket.instances).toHaveLength(1)
    act(() => FakeWebSocket.instances[0].open())
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('uses the latest token after abnormal close, with one timer for repeated errors', async () => {
    render(<Consumer />, { wrapper: Wrapper })
    await flush()
    const socket = FakeWebSocket.instances[0]
    act(() => socket.open())
    act(() => {
      socket.onerror?.()
      socket.onerror?.()
      socket.finishClose()
      socket.finishClose()
    })
    await advance(0)
    expect(vi.getTimerCount()).toBe(1)
    const nextToken = token('new-token')
    act(() => useAuthStore.setState({ accessToken: nextToken }))
    await advance(999)
    expect(FakeWebSocket.instances).toHaveLength(1)
    await advance(1)
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(FakeWebSocket.instances[1].url).toBe(
      `${endpoint}?token=${encodeURIComponent(nextToken)}`,
    )
    act(() => FakeWebSocket.instances[1].open())
    await advance(0)
    expect(vi.getTimerCount()).toBe(1)
  })

  it('refreshes an access token once after a failed WebSocket handshake', async () => {
    const nextToken = token('after-handshake-refresh')
    vi.mocked(refreshSessionAccessToken).mockImplementationOnce(async () => {
      useAuthStore.setState({ accessToken: nextToken })
      return nextToken
    })
    render(<Consumer />, { wrapper: Wrapper })
    await flush()

    act(() => FakeWebSocket.instances[0].finishClose(1006))
    await advance(1000)

    expect(refreshSessionAccessToken).toHaveBeenCalledTimes(1)
    expect(FakeWebSocket.instances[1].url).toBe(
      `${endpoint}?token=${encodeURIComponent(nextToken)}`,
    )

    act(() => FakeWebSocket.instances[1].finishClose(1006))
    await advance(2000)
    expect(refreshSessionAccessToken).toHaveBeenCalledTimes(1)
  })

  it('waits for the old close event on user and host changes', async () => {
    const view = render(<Consumer />, { wrapper: Wrapper })
    await flush()
    const first = FakeWebSocket.instances[0]
    act(() => {
      first.open()
      session('user-2', token('second'))
    })
    await flush()
    expect(first.close).toHaveBeenCalledWith(1000, 'session changed')
    expect(FakeWebSocket.instances).toHaveLength(1)
    act(() => first.finishClose(1000))
    await flush()
    const second = FakeWebSocket.instances[1]
    expect(second.url).toContain(encodeURIComponent(token('second')))
    appConfig.wsUrl = 'wss://other.example/api/v1/ws'
    view.rerender(<Consumer />)
    await flush()
    expect(second.close).toHaveBeenCalledWith(1000, 'unmount')
    expect(FakeWebSocket.instances).toHaveLength(2)
    act(() => second.finishClose(1000))
    await flush()
    expect(FakeWebSocket.instances[2].url).toContain(
      'wss://other.example/api/v1/ws?token=',
    )
  })

  it('sync.required performs REST synchronization without creating a socket', async () => {
    render(<Consumer />, { wrapper: Wrapper })
    await flush()
    act(() => FakeWebSocket.instances[0].message('sync.required'))
    expect(http.get).toHaveBeenCalledWith('/driver/orders/current')
    expect(FakeWebSocket.instances).toHaveLength(1)
  })

  it('updates driver location without showing a line-status notification', async () => {
    render(<Consumer />, { wrapper: Wrapper })
    await flush()

    act(() =>
      FakeWebSocket.instances[0].message('driver.location_updated', {
        driver_id: 'driver-1',
        status: 'online',
        latitude: 58.085281,
        longitude: 56.404685,
      }),
    )

    expect(toast.success).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
  })

  it('clears a previous user reconnect timer when switching users', async () => {
    render(<Consumer />, { wrapper: Wrapper })
    await flush()
    act(() => FakeWebSocket.instances[0].finishClose())
    await advance(0)
    expect(vi.getTimerCount()).toBe(1)
    act(() => session('user-2'))
    await flush()
    await advance(0)
    expect(vi.getTimerCount()).toBe(0)
    expect(FakeWebSocket.instances).toHaveLength(2)
    await advance(30_000)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('does not reconnect a normal server close', async () => {
    render(<Consumer />, { wrapper: Wrapper })
    await flush()
    act(() => FakeWebSocket.instances[0].finishClose(1000))
    await advance(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
    await advance(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('publishes connection diagnostics without clearing query data', async () => {
    render(<Consumer />, { wrapper: Wrapper })
    await flush()
    expect(useWebSocketStore.getState().status).toBe('connecting')
    expect(useWebSocketStore.getState().subscriptions).toContain(
      'dispatcher-data',
    )
    act(() => FakeWebSocket.instances[0].open())
    expect(useWebSocketStore.getState().status).toBe('connected')
    expect(useWebSocketStore.getState().lastConnectedAt).not.toBeNull()
    act(() => FakeWebSocket.instances[0].finishClose(1006))
    expect(useWebSocketStore.getState().status).toBe('reconnecting')
    expect(useWebSocketStore.getState().lastError).toContain('code=1006')
  })

  it.each(['logout', 'unmount'] as const)(
    'clears pending retries on %s',
    async (action) => {
      const view = render(<Consumer />, { wrapper: Wrapper })
      await flush()
      act(() => FakeWebSocket.instances[0].finishClose())
      await advance(0)
      expect(vi.getTimerCount()).toBe(1)
      if (action === 'logout') act(() => useAuthStore.getState().logout())
      else view.unmount()
      await advance(0)
      expect(vi.getTimerCount()).toBe(0)
      await advance(60_000)
      expect(FakeWebSocket.instances).toHaveLength(1)
    },
  )

  it('cancels a connection awaiting refresh after logout', async () => {
    session('user-1', token('expired', 1))
    let resolveRefresh!: (value: string) => void
    vi.mocked(refreshSessionAccessToken).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRefresh = resolve
        }),
    )
    render(<Consumer />, { wrapper: Wrapper })
    await flush()
    act(() => useAuthStore.getState().logout())
    await act(async () => resolveRefresh(token('late')))
    expect(FakeWebSocket.instances).toHaveLength(0)
  })

  it('refreshes an expired token only when a real reconnect is needed', async () => {
    render(<Consumer />, { wrapper: Wrapper })
    await flush()
    const socket = FakeWebSocket.instances[0]
    act(() => socket.open())
    act(() => useAuthStore.setState({ accessToken: token('expired', 1) }))
    expect(socket.close).not.toHaveBeenCalled()
    expect(refreshSessionAccessToken).not.toHaveBeenCalled()
    const nextToken = token('renewed')
    vi.mocked(refreshSessionAccessToken).mockImplementationOnce(async () => {
      useAuthStore.setState({ accessToken: nextToken })
      return nextToken
    })
    act(() => socket.finishClose())
    await advance(1000)
    expect(refreshSessionAccessToken).toHaveBeenCalledTimes(1)
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(FakeWebSocket.instances[1].url).toBe(
      `${endpoint}?token=${encodeURIComponent(nextToken)}`,
    )
  })

  it('does not duplicate connections during StrictMode effect replay', async () => {
    render(
      <StrictMode>
        <Wrapper>
          <Consumer />
        </Wrapper>
      </StrictMode>,
    )
    await flush()
    expect(FakeWebSocket.instances).toHaveLength(1)
  })
})

describe('connection service', () => {
  it('deduplicates concurrent connect calls and waits for unmount close before remount', async () => {
    const connection = new WebSocketConnection({
      getAccessToken: async () => 'a+b /?',
      createSocket: createWebSocket,
    })
    connection.setSession({ userId: 'user-1', endpoint })
    const unsubscribe = connection.subscribe({ onMessage: vi.fn() })
    await Promise.all([connection.connect(), connection.connect()])
    await flush()
    const first = FakeWebSocket.instances[0]
    expect(first.url).toBe(`${endpoint}?token=a%2Bb%20%2F%3F`)
    await connection.connect()
    first.open()
    await connection.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)
    unsubscribe()
    expect(first.close).toHaveBeenCalledWith(1000, 'unmount')
    connection.subscribe({ onMessage: vi.fn() })
    await flush()
    expect(FakeWebSocket.instances).toHaveLength(1)
    first.finishClose(1000)
    await flush()
    expect(FakeWebSocket.instances).toHaveLength(2)
    connection.disconnect()
  })

  it('caps exponential backoff at 30 seconds and resets on open', async () => {
    const connection = new WebSocketConnection({
      getAccessToken: async () => 'token',
      createSocket: createWebSocket,
    })
    connection.setSession({ userId: 'user-1', endpoint })
    connection.subscribe({ onMessage: vi.fn() })
    await flush()
    for (const delay of [1000, 2000, 5000, 10_000, 30_000, 30_000, 30_000]) {
      const count = FakeWebSocket.instances.length
      FakeWebSocket.instances[count - 1].finishClose()
      await advance(delay - 1)
      expect(FakeWebSocket.instances).toHaveLength(count)
      await advance(1)
      expect(FakeWebSocket.instances).toHaveLength(count + 1)
    }
    const count = FakeWebSocket.instances.length
    FakeWebSocket.instances[count - 1].open()
    FakeWebSocket.instances[count - 1].finishClose()
    await advance(1000)
    expect(FakeWebSocket.instances).toHaveLength(count + 1)
    connection.disconnect()
  })

  it('pauses reconnects while offline and reconnects after the network returns', async () => {
    const connection = new WebSocketConnection({
      getAccessToken: async () => 'token',
      createSocket: createWebSocket,
    })
    connection.setSession({ userId: 'user-1', endpoint })
    connection.subscribe({ name: 'orders', onMessage: vi.fn() })
    await flush()
    const first = FakeWebSocket.instances[0]
    connection.pauseForOffline()
    expect(first.close).toHaveBeenCalledWith(1000, 'offline')
    first.finishClose(1000)
    await advance(60_000)
    expect(FakeWebSocket.instances).toHaveLength(1)
    connection.resumeAfterOnline()
    await flush()
    expect(FakeWebSocket.instances).toHaveLength(2)
    connection.disconnect()
  })

  it('sends heartbeat pings only while the socket is open', async () => {
    const connection = new WebSocketConnection({
      getAccessToken: async () => 'token',
      createSocket: createWebSocket,
    })
    connection.setSession({ userId: 'user-1', endpoint })
    connection.subscribe({ onMessage: vi.fn() })
    await flush()
    const socket = FakeWebSocket.instances[0]
    socket.open()
    await advance(25_000)
    expect(socket.send).toHaveBeenCalledWith(
      expect.stringMatching(/^\{"event":"ping","occurred_at":".+"\}$/),
    )
    connection.disconnect()
    await advance(25_000)
    expect(socket.send).toHaveBeenCalledTimes(1)
  })

  it('force reconnects a socket that is no longer open without waiting for backoff', async () => {
    const connection = new WebSocketConnection({
      getAccessToken: async () => 'token',
      createSocket: createWebSocket,
    })
    connection.setSession({ userId: 'user-1', endpoint })
    connection.subscribe({ onMessage: vi.fn() })
    await flush()
    const first = FakeWebSocket.instances[0]
    first.finishClose(1006)
    connection.forceReconnect('tab became visible')
    await flush()
    expect(FakeWebSocket.instances).toHaveLength(2)
    connection.disconnect()
  })
})
