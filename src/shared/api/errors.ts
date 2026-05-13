import { AxiosError } from 'axios'

import type { ApiError } from './types'

export function getApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined
    return apiError?.error?.message ?? error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Произошла неизвестная ошибка'
}
