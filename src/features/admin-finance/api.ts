import { http } from '../../shared/api/http'
import type { ApiResponse, MoneyCentsResponse } from '../../shared/api/types'

export type AdminFinanceOverview = {
  completed_orders_revenue: MoneyCentsResponse
  total_commissions: MoneyCentsResponse
  average_commission_per_order: MoneyCentsResponse
  completed_orders_count: number
  driver_payouts: MoneyCentsResponse
  taxi_park_revenue: MoneyCentsResponse
  period_from: string
  period_to: string
}

export async function getAdminFinanceOverview() {
  const response = await http.get<ApiResponse<AdminFinanceOverview>>(
    '/admin/finance/overview',
  )
  return response.data.data
}
