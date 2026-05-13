export type UserRole =
  | 'super_admin'
  | 'city_admin'
  | 'dispatcher'
  | 'taxi_park_admin'
  | 'finance_manager'
  | 'moderator'
  | 'support'
  | 'admin'
  | 'taxi_park'
  | 'driver'
  | 'passenger'

export type ApiResponse<T> = {
  data: T
  meta: {
    request_id: string
  }
}

export type ApiError = {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  meta?: {
    request_id?: string
  }
}

export type MoneyCentsResponse = {
  amount_cents: number
  currency: string
}

export type MoneyResponse = {
  amount: number
  currency: string
}

export type AuthUser = {
  id: string
  name?: string
  email?: string
  phone?: string
  role: UserRole
  permissions?: string[]
}

export type PaginatedResponse<T> = {
  items: T[]
  total?: number
  limit?: number
  offset?: number
}

export type ListQuery = {
  search?: string
  page?: number
  page_size?: number
  sort_by?: string
  sort_dir?: 'asc' | 'desc'
  status?: string
  city_id?: string
}
