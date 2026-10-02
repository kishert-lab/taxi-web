import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  delete window.__TAXI_WEB_CONFIG__
  vi.unstubAllEnvs()
  vi.resetModules()
})

it('uses build environment endpoints when no container override is present', async () => {
  vi.resetModules()
  window.__TAXI_WEB_CONFIG__ = {}
  vi.stubEnv('VITE_API_BASE_URL', 'https://build.example/api/v1')
  vi.stubEnv('VITE_WS_URL', 'wss://build.example/api/v1/ws')
  const { appConfig } = await import('../src/app/config')
  expect(appConfig.apiBaseUrl).toBe('https://build.example/api/v1')
  expect(appConfig.wsUrl).toBe('wss://build.example/api/v1/ws')
})

it('prefers container configuration over the compiled build environment', async () => {
  vi.resetModules()
  vi.stubEnv('VITE_API_BASE_URL', 'https://build.example/api/v1')
  vi.stubEnv('VITE_WS_URL', 'wss://build.example/api/v1/ws')
  window.__TAXI_WEB_CONFIG__ = {
    VITE_API_BASE_URL: 'https://runtime.example/api/v1',
    VITE_WS_URL: 'wss://runtime.example/api/v1/ws',
    VITE_USE_MOCK_API: 'false',
  }
  const { appConfig } = await import('../src/app/config')
  expect(appConfig.apiBaseUrl).toBe('https://runtime.example/api/v1')
  expect(appConfig.wsUrl).toBe('wss://runtime.example/api/v1/ws')
  expect(appConfig.useMockApi).toBe(false)
})
