import { http } from '../../shared/api/http'
import type { ApiResponse, MoneyCentsResponse } from '../../shared/api/types'

export type AdminFinanceOverview = {
  total_revenue: MoneyCentsResponse
  platform_commission: MoneyCentsResponse
  completed_orders_count: number
  driver_payouts: MoneyCentsResponse
  taxi_park_income: MoneyCentsResponse
}

export async function getAdminFinanceOverview() {
  const response = await http.get<ApiResponse<AdminFinanceOverview>>(
    '/admin/finance/overview',
  )
  return response.data.data
}
