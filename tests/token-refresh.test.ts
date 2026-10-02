import axios from 'axios'
import { afterEach, expect, it, vi } from 'vitest'

import { refreshSessionAccessToken } from '../src/shared/api/http'
import { useAuthStore } from '../src/shared/auth/auth-store'
import { getAccessToken } from '../src/shared/auth/token-storage'

function login(id: string) {
  useAuthStore.getState().setSession({
    accessToken: `access-${id}`,
    refreshToken: `refresh-${id}`,
    user: { id, role: 'driver' },
  })
}

function pendingResponse() {
  let resolve!: (response: {
    data: { data: { access_token: string; refresh_token: string } }
  }) => void
  const promise = new Promise<Parameters<typeof resolve>[0]>((complete) => {
    resolve = complete
  })
  return {
    promise,
    resolve: (id: string) =>
      resolve({
        data: {
          data: {
            access_token: `new-${id}`,
            refresh_token: `new-refresh-${id}`,
          },
        },
      }),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  useAuthStore.getState().logout()
})

it('deduplicates refresh for the same session and updates the stored token', async () => {
  login('first')
  const response = pendingResponse()
  const post = vi.spyOn(axios, 'post').mockReturnValue(response.promise)
  const first = refreshSessionAccessToken()
  const second = refreshSessionAccessToken()
  expect(post).toHaveBeenCalledTimes(1)
  response.resolve('first')
  await expect(first).resolves.toBe('new-first')
  await expect(second).resolves.toBe('new-first')
  expect(useAuthStore.getState().accessToken).toBe('new-first')
  expect(getAccessToken()).toBe('new-first')
})

it('does not restore tokens when refresh finishes after logout', async () => {
  login('first')
  const response = pendingResponse()
  vi.spyOn(axios, 'post').mockReturnValue(response.promise)
  const refresh = refreshSessionAccessToken()
  useAuthStore.getState().logout()
  response.resolve('first')
  await expect(refresh).rejects.toThrow('Session changed')
  expect(useAuthStore.getState().accessToken).toBeNull()
  expect(getAccessToken()).toBeNull()
})

it('isolates refresh promises between users and rejects the previous response', async () => {
  login('first')
  const oldResponse = pendingResponse()
  const newResponse = pendingResponse()
  const post = vi
    .spyOn(axios, 'post')
    .mockReturnValueOnce(oldResponse.promise)
    .mockReturnValueOnce(newResponse.promise)
  const oldRefresh = refreshSessionAccessToken()
  login('second')
  const newRefresh = refreshSessionAccessToken()
  oldResponse.resolve('first')
  await expect(oldRefresh).rejects.toThrow('Session changed')
  const repeatedRefresh = refreshSessionAccessToken()
  expect(post).toHaveBeenCalledTimes(2)
  newResponse.resolve('second')
  await expect(newRefresh).resolves.toBe('new-second')
  await expect(repeatedRefresh).resolves.toBe('new-second')
  expect(useAuthStore.getState().user?.id).toBe('second')
  expect(getAccessToken()).toBe('new-second')
})
