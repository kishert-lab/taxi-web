import { StrictMode, type ReactNode } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { appConfig } from '../src/app/config'
import { http, refreshSessionAccessToken } from '../src/shared/api/http'
import { useAuthStore } from '../src/shared/auth/auth-store'
import { WebSocketProvider } from '../src/features/websocket/WebSocketProvider'
import { useWebSocket } from '../src/features/websocket/use-mobile-ws'
import { useAdminWebSocket } from '../src/features/admin/use-admin-websocket'
import { WebSocketConnection } from '../src/features/websocket/ws-connection'
import { createWebSocket } from '../src/features/websocket/ws-client'

vi.mock('../src/shared/api/http', () => ({
  http: { get: vi.fn().mockResolvedValue({ data: {} }) },
  refreshSessionAccessToken: vi.fn(),
}))

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
  message(type: string) {
    this.onmessage?.({ data: JSON.stringify({ type }) })
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
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
  vi.clearAllMocks()
  vi.stubGlobal('WebSocket', FakeWebSocket)
  FakeWebSocket.instances = []
  appConfig.wsUrl = endpoint
  appConfig.useMockApi = false
  session()
})
afterEach(() => {
  cleanup()
  useAuthStore.getState().logout()
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
    expect(vi.getTimerCount()).toBe(0)
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
    expect(FakeWebSocket.instances[1].url).toBe(`${endpoint}?token=${encodeURIComponent(nextToken)}`)
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
    for (const delay of [1000, 2000, 4000, 8000, 16000, 30000, 30000]) {
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
})
