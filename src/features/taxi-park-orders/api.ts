import { http } from '../../shared/api/http'
import type { ApiResponse, MoneyCentsResponse } from '../../shared/api/types'

export type TaxiParkOrder = {
  id: string
  status: string
  driver_id?: string
  driver_name?: string
  gross_amount?: MoneyCentsResponse
  total_price?: MoneyCentsResponse
  price?: MoneyCentsResponse
  created_at: string
  completed_at?: string | null
}

export async function getTaxiParkOrders(params?: { status?: string; limit?: number }) {
  const response = await http.get<ApiResponse<{ orders: TaxiParkOrder[] }>>('/taxi-park/orders', {
    params: params?.limit ? { limit: params.limit } : undefined,
  })
  const orders = response.data.data.orders
  return params?.status ? orders.filter((order) => order.status === params.status) : orders
}
