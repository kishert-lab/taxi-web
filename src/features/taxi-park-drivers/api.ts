import { http } from '../../shared/api/http'
import type { ApiResponse } from '../../shared/api/types'

export type DriverStatus = 'offline' | 'online' | 'busy' | 'paused' | 'blocked'

export type TaxiParkDriver = {
  id: string
  user_id: string
  full_name: string
  rating: number
  status: DriverStatus
  created_at: string
}

export async function getTaxiParkDrivers(status?: string) {
  const response = await http.get<ApiResponse<TaxiParkDriver[]>>('/taxi-park/drivers', {
    params: status ? { status } : undefined,
  })
  return response.data.data
}
