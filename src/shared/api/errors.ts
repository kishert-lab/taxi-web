import { AxiosError } from 'axios'

import type { ApiError } from './types'

export function getApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined
    const details = apiError?.error?.details

    if (details && Object.keys(details).length > 0) {
      const detailsText = Object.entries(details)
        .map(([field, value]) => `${field}: ${String(value)}`)
        .join('; ')

      return `${apiError?.error?.message ?? error.message}. ${detailsText}`
    }

    return apiError?.error?.message ?? error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Произошла неизвестная ошибка'
}
