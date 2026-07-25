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
  return runtimeConfig?.[key] || import.meta.env[key] || fallback
}

export const appConfig = {
  apiBaseUrl: getConfigValue('VITE_API_BASE_URL', 'http://192.168.0.50:8080/api/v1'),
  wsUrl: getConfigValue('VITE_WS_URL', 'ws://192.168.0.50:8080/api/v1/ws'),
  yandexMapsApiKey: getConfigValue('VITE_YANDEX_MAPS_API_KEY', ''),
  useMockApi: getConfigValue('VITE_USE_MOCK_API', 'false') === 'true',
}
