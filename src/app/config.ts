type RuntimeConfig = {
  VITE_API_BASE_URL?: string
  VITE_WS_URL?: string
  VITE_YANDEX_MAPS_API_KEY?: string
  VITE_USE_MOCK_API?: string
}

declare global {
  interface Window {
    __TAXI_WEB_CONFIG__?: RuntimeConfig
  }
}

const runtimeConfig = typeof window !== 'undefined' ? window.__TAXI_WEB_CONFIG__ : undefined

function getConfigValue(key: keyof RuntimeConfig, fallback: string) {
  if (runtimeConfig && Object.prototype.hasOwnProperty.call(runtimeConfig, key)) {
    return runtimeConfig[key] || fallback
  }

  return import.meta.env[key] || fallback
}

function getDefaultWebSocketUrl() {
  if (typeof window === 'undefined') return '/api/v1/ws'

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/api/v1/ws`
}

export const appConfig = {
  apiBaseUrl: getConfigValue('VITE_API_BASE_URL', '/api/v1'),
  wsUrl: getConfigValue('VITE_WS_URL', getDefaultWebSocketUrl()),
  yandexMapsApiKey: getConfigValue('VITE_YANDEX_MAPS_API_KEY', ''),
  useMockApi: getConfigValue('VITE_USE_MOCK_API', 'false') === 'true',
}
