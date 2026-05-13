import { http } from '../../shared/api/http'
import type { ApiResponse, MoneyCentsResponse } from '../../shared/api/types'
import { getAdminFinanceOverview } from '../admin-finance/api'
import { getTaxiParkDrivers } from '../taxi-park-drivers/api'
import { getTaxiParkOrders } from '../taxi-park-orders/api'

export type TaxiParkBalance = {
  available: MoneyCentsResponse
  pending?: MoneyCentsResponse
}

export type Transaction = {
  id: string
  type: string
  amount: MoneyCentsResponse
  commission?: MoneyCentsResponse
  net_income?: MoneyCentsResponse
  created_at: string
}

export async function getTaxiParkBalance() {
  const response = await http.get<ApiResponse<TaxiParkBalance>>('/taxi-park/balance')
  return response.data.data
}

export async function getTaxiParkTransactions() {
  const response = await http.get<ApiResponse<Transaction[]>>('/taxi-park/transactions')
  return response.data.data
}

export async function getDriverBalance() {
  const response = await http.get<ApiResponse<TaxiParkBalance>>('/driver/balance')
  return response.data.data
}

export async function getDriverTransactions() {
  const response = await http.get<ApiResponse<Transaction[]>>('/driver/transactions')
  return response.data.data
}

export async function getDriverOrderHistory() {
  const response = await http.get<ApiResponse<unknown[]>>('/driver/orders/history')
  return response.data.data
}

export {
  getAdminFinanceOverview,
  getTaxiParkDrivers,
  getTaxiParkOrders,
}
