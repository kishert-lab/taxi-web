import { http } from '../../shared/api/http'
import type { ApiResponse, MoneyCentsResponse } from '../../shared/api/types'

export type TaxiParkFinanceSettings = {
  taxi_park_id: string
  driver_commission_basis_points: number
  driver_commission_percent: string
  platform_fee_basis_points: number
  platform_fee_percent: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type TaxiParkFinanceOverview = {
  taxi_park_id: string
  orders_count: number
  order_total_amount: MoneyCentsResponse
  driver_income_amount: MoneyCentsResponse
  taxi_park_commission_amount: MoneyCentsResponse
  taxi_park_income_amount: MoneyCentsResponse
  platform_service_fee_amount: MoneyCentsResponse
  platform_debt_amount: MoneyCentsResponse
  period_from?: string
  period_to?: string
}

export type AdminPlatformFinanceOverview = {
  completed_orders_revenue: MoneyCentsResponse
  total_commissions: MoneyCentsResponse
  driver_payouts: MoneyCentsResponse
  taxi_park_revenue: MoneyCentsResponse
  average_commission_per_order: MoneyCentsResponse
  completed_orders_count: number
  period_from?: string
  period_to?: string
}

export type OrderFinance = {
  id: string
  order_id: string
  taxi_park_id: string
  driver_id?: string
  passenger_id?: string
  order_total_amount: MoneyCentsResponse
  driver_commission_basis_points: number
  driver_commission_percent: string
  taxi_park_commission_amount: MoneyCentsResponse
  driver_income_amount: MoneyCentsResponse
  taxi_park_income_amount: MoneyCentsResponse
  platform_fee_basis_points: number
  platform_fee_percent: string
  platform_fee_amount: MoneyCentsResponse
  status: string
  created_at: string
  updated_at?: string
}

export type DriverBalance = {
  driver_id: string
  available_balance: MoneyCentsResponse
  pending_balance: MoneyCentsResponse
  available?: MoneyCentsResponse
  pending?: MoneyCentsResponse
  updated_at: string
}

export type DriverPayout = {
  id: string
  taxi_park_id: string
  driver_id: string
  amount: MoneyCentsResponse
  status: string
  comment?: string
  period_from?: string
  period_to?: string
  payment_method?: string
  payment_document_number?: string
  created_by?: string
  paid_at?: string
  created_at: string
  updated_at?: string
}

export type PlatformInvoice = {
  id: string
  taxi_park_id: string
  invoice_number?: string
  amount: MoneyCentsResponse
  status: string
  period_from: string
  period_to: string
  document_url?: string
  paid_at?: string
  created_at: string
  updated_at?: string
}

export type FinanceDocument = {
  id: string
  type: string
  number?: string
  status: string
  taxi_park_id?: string
  driver_id?: string
  order_id?: string
  payout_id?: string
  invoice_id?: string
  file_url?: string
  payload?: string
  created_at: string
  updated_at?: string
}

export type PlatformFeeDebt = {
  amount: MoneyCentsResponse
}

export type CreateDriverPayoutPayload = {
  amount_cents: number
  comment?: string
  period_from?: string
  period_to?: string
}

export type CreatePlatformInvoicePayload = {
  period_from: string
  period_to: string
}

export type FinanceListParams = {
  limit?: number
  from?: string
  to?: string
}

function normalizeDriverBalance(balance: DriverBalance): DriverBalance {
  return {
    ...balance,
    available: balance.available ?? balance.available_balance,
    pending: balance.pending ?? balance.pending_balance,
  }
}

export async function getTaxiParkFinanceSettings() {
  const response = await http.get<ApiResponse<TaxiParkFinanceSettings>>('/taxi-park/finance/settings')
  return response.data.data
}

export async function updateTaxiParkDriverCommission(driverCommissionBasisPoints: number) {
  const response = await http.put<ApiResponse<TaxiParkFinanceSettings>>(
    '/taxi-park/finance/settings/driver-commission',
    { driver_commission_basis_points: driverCommissionBasisPoints },
  )
  return response.data.data
}

export async function getTaxiParkFinanceOverview(params?: FinanceListParams) {
  const response = await http.get<ApiResponse<TaxiParkFinanceOverview>>('/taxi-park/finance/overview', { params })
  return response.data.data
}

export async function getTaxiParkFinanceOrders(params?: FinanceListParams) {
  const response = await http.get<ApiResponse<{ orders: OrderFinance[] }>>('/taxi-park/finance/orders', { params })
  return response.data.data.orders
}

export async function getTaxiParkDriverFinanceBalance(driverId: string) {
  const response = await http.get<ApiResponse<DriverBalance>>(`/taxi-park/finance/drivers/${driverId}/balance`)
  return normalizeDriverBalance(response.data.data)
}

export async function getTaxiParkDriverPayouts(driverId: string, params?: FinanceListParams) {
  const response = await http.get<ApiResponse<{ payouts: DriverPayout[] }>>(
    `/taxi-park/finance/drivers/${driverId}/payouts`,
    { params },
  )
  return response.data.data.payouts
}

export async function createTaxiParkDriverPayout(driverId: string, payload: CreateDriverPayoutPayload) {
  const response = await http.post<ApiResponse<DriverPayout>>(
    `/taxi-park/finance/drivers/${driverId}/payouts`,
    payload,
  )
  return response.data.data
}

export async function approveTaxiParkDriverPayout(payoutId: string) {
  const response = await http.post<ApiResponse<DriverPayout>>(`/taxi-park/finance/payouts/${payoutId}/approve`)
  return response.data.data
}

export async function markTaxiParkDriverPayoutPaid(payoutId: string) {
  const response = await http.post<ApiResponse<DriverPayout>>(`/taxi-park/finance/payouts/${payoutId}/mark-paid`)
  return response.data.data
}

export async function getTaxiParkPlatformFeeDebt() {
  const response = await http.get<ApiResponse<PlatformFeeDebt>>('/taxi-park/finance/platform-fee-debt')
  return response.data.data
}

export async function getTaxiParkPlatformFeeAccruals(params?: FinanceListParams) {
  const response = await http.get<ApiResponse<{ orders: OrderFinance[] }>>(
    '/taxi-park/finance/platform-fee-accruals',
    { params },
  )
  return response.data.data.orders
}

export async function getTaxiParkPlatformInvoices(params?: FinanceListParams) {
  const response = await http.get<ApiResponse<{ invoices: PlatformInvoice[] }>>(
    '/taxi-park/finance/platform-invoices',
    { params },
  )
  return response.data.data.invoices
}

export async function createTaxiParkPlatformInvoice(payload: CreatePlatformInvoicePayload) {
  const response = await http.post<ApiResponse<PlatformInvoice>>('/taxi-park/finance/platform-invoices', payload)
  return response.data.data
}

export async function getTaxiParkFinanceDocuments(params?: FinanceListParams) {
  const response = await http.get<ApiResponse<{ documents: FinanceDocument[] }>>('/taxi-park/finance/documents', {
    params,
  })
  return response.data.data.documents
}

export async function getDriverFinanceBalance() {
  const response = await http.get<ApiResponse<DriverBalance>>('/driver/finance/balance')
  return normalizeDriverBalance(response.data.data)
}

export async function getDriverFinanceOrders(params?: FinanceListParams) {
  const response = await http.get<ApiResponse<{ orders: OrderFinance[] }>>('/driver/finance/orders', { params })
  return response.data.data.orders
}

export async function getDriverFinancePayouts(params?: FinanceListParams) {
  const response = await http.get<ApiResponse<{ payouts: DriverPayout[] }>>('/driver/finance/payouts', { params })
  return response.data.data.payouts
}

export async function getDriverFinanceDocuments(params?: FinanceListParams) {
  const response = await http.get<ApiResponse<{ documents: FinanceDocument[] }>>('/driver/finance/documents', {
    params,
  })
  return response.data.data.documents
}

export async function getAdminPlatformFinanceOverview(params?: FinanceListParams) {
  const response = await http.get<ApiResponse<AdminPlatformFinanceOverview>>('/admin/finance/platform-overview', { params })
  return response.data.data
}

export async function getAdminTaxiParkFinanceOverview(taxiParkId: string, params?: FinanceListParams) {
  const response = await http.get<ApiResponse<TaxiParkFinanceOverview>>(
    `/admin/finance/taxi-parks/${taxiParkId}/overview`,
    { params },
  )
  return response.data.data
}

export async function getAdminTaxiParkPlatformFeeDebt(taxiParkId: string) {
  const response = await http.get<ApiResponse<PlatformFeeDebt>>(
    `/admin/finance/taxi-parks/${taxiParkId}/platform-fee-debt`,
  )
  return response.data.data
}

export async function getAdminPlatformInvoices(params?: FinanceListParams) {
  const response = await http.get<ApiResponse<{ invoices: PlatformInvoice[] }>>(
    '/admin/finance/platform-invoices',
    { params },
  )
  return response.data.data.invoices
}

export async function markAdminPlatformInvoicePaid(invoiceId: string) {
  const response = await http.post<ApiResponse<PlatformInvoice>>(
    `/admin/finance/platform-invoices/${invoiceId}/mark-paid`,
  )
  return response.data.data
}

export async function getAdminFinanceDocuments(params?: FinanceListParams) {
  const response = await http.get<ApiResponse<{ documents: FinanceDocument[] }>>('/admin/finance/documents', {
    params,
  })
  return response.data.data.documents
}
