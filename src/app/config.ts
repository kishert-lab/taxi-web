export const appConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? 'http://192.168.0.50:8080/api/v1',
  wsUrl: import.meta.env.VITE_WS_URL ?? 'ws://192.168.0.50:8080/api/v1/ws',
  useMockApi: import.meta.env.VITE_USE_MOCK_API === 'FALSE',
}
