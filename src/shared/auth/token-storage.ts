const accessTokenKey = 'taxi_platform_access_token'
const refreshTokenKey = 'taxi_platform_refresh_token'

export function getAccessToken() {
  return localStorage.getItem(accessTokenKey)
}

export function getRefreshToken() {
  return localStorage.getItem(refreshTokenKey)
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(accessTokenKey, accessToken)
  localStorage.setItem(refreshTokenKey, refreshToken)
}

export function clearTokens() {
  localStorage.removeItem(accessTokenKey)
  localStorage.removeItem(refreshTokenKey)
}
