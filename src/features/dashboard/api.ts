import { http } from '../../shared/api/http'
import type { ApiResponse, MoneyCentsResponse } from '../../shared/api/types'
import { getAdminFinanceOverview } from '../admin-finance/api'
import { getTaxiParkDrivers } from '../taxi-park-drivers/api'
import { getTaxiParkOrders } from '../taxi-park-orders/api'

export type TaxiParkBalance = {
  available_balance: MoneyCentsResponse
  pending_balance?: MoneyCentsResponse
  available?: MoneyCentsResponse
  pending?: MoneyCentsResponse
}

export type Transaction = {
  id: string
  type?: string
  transaction_type?: string
  amount?: MoneyCentsResponse
  gross_amount?: MoneyCentsResponse
  commission?: MoneyCentsResponse
  commission_amount?: MoneyCentsResponse
  net_income?: MoneyCentsResponse
  net_amount?: MoneyCentsResponse
  created_at: string
}

function normalizeBalance<T extends TaxiParkBalance>(balance: T): T {
  return {
    ...balance,
    available: balance.available ?? balance.available_balance,
    pending: balance.pending ?? balance.pending_balance,
  }
}

export async function getTaxiParkBalance() {
  const response = await http.get<ApiResponse<TaxiParkBalance>>('/taxi-park/balance')
  return normalizeBalance(response.data.data)
}

export async function getTaxiParkTransactions() {
  const response = await http.get<ApiResponse<{ transactions: Transaction[] }>>('/taxi-park/transactions')
  return response.data.data.transactions
}

export async function getDriverBalance() {
  const response = await http.get<ApiResponse<TaxiParkBalance>>('/driver/balance')
  return normalizeBalance(response.data.data)
}

export async function getDriverTransactions() {
  const response = await http.get<ApiResponse<{ transactions: Transaction[] }>>('/driver/transactions')
  return response.data.data.transactions
}

export async function getDriverOrderHistory() {
  const response = await http.get<ApiResponse<{ orders: unknown[] }>>('/driver/orders/history')
  return response.data.data.orders
}

export {
  getAdminFinanceOverview,
  getTaxiParkDrivers,
  getTaxiParkOrders,
}
