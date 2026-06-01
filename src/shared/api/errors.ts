import { AxiosError } from 'axios'

import type { ApiError } from './types'

const constraintMessages: Record<string, string> = {
  cars_plate_number_unique: 'Автомобиль с таким госномером уже существует',
  idx_cars_vin_unique: 'Автомобиль с таким VIN уже существует',
}

const codeMessages: Record<string, string> = {
  ORDER_INVALID_STATE: 'Действие уже недоступно для текущего статуса заказа',
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const apiError = error.response?.data as ApiError | undefined
    const code = apiError?.error?.code
    const details = apiError?.error?.details
    const constraint = typeof details?.constraint === 'string' ? details.constraint : undefined
    const fields = details?.fields

    if (constraint && constraintMessages[constraint]) {
      return constraintMessages[constraint]
    }

    if (code && codeMessages[code]) {
      return codeMessages[code]
    }

    if (fields && typeof fields === 'object') {
      const fieldsText = Object.entries(fields)
        .map(([field, value]) => `${field}: ${String(value)}`)
        .join('; ')

      return `${apiError?.error?.message ?? error.message}. ${fieldsText}`
    }

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
