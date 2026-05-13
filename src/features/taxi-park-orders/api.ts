import { http } from '../../shared/api/http'
import type { ApiResponse, MoneyCentsResponse } from '../../shared/api/types'

export type TaxiParkOrder = {
  id: string
  status: string
  driver_name?: string
  driver_id?: string
  total_price?: MoneyCentsResponse
  price?: MoneyCentsResponse
  created_at: string
  completed_at?: string | null
}

export async function getTaxiParkOrders(params?: { status?: string; limit?: number }) {
  const response = await http.get<ApiResponse<TaxiParkOrder[]>>('/taxi-park/orders', {
    params,
  })
  return response.data.data
}
