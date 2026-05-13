import { appConfig } from '../../app/config'
import type {
  AdminUser,
  AuditLog,
  Car,
  CommissionRule,
  Driver,
  DriverDocument,
  FinancialOperation,
  Order,
  Passenger,
  Payout,
  Role,
  SupportTicket,
  Tariff,
  TaxiPark,
  Zone,
} from '../../entities/types'
import type { TariffPayload } from '../taxi-park-tariffs/api'
import { http } from '../../shared/api/http'
import { mockApi, mockCollections } from '../../shared/api/mock-api'
import type { ApiResponse } from '../../shared/api/types'

async function getList<T>(url: string, mockItems: T[]) {
  if (appConfig.useMockApi) return mockApi.list(mockItems)
  const response = await http.get<ApiResponse<T[]>>(url)
  return response.data.data
}

export const adminApi = {
  orders: () => getList<Order>('/admin/orders', mockCollections.orders),
  order: (id: string) =>
    appConfig.useMockApi
      ? mockApi.getOrder(id)
      : http.get<ApiResponse<Order>>(`/admin/orders/${id}`).then((response) => response.data.data),
  createOrder: (payload: Partial<Order>) =>
    appConfig.useMockApi
      ? mockApi.createOrder(payload)
      : http.post<ApiResponse<Order>>('/admin/orders', payload).then((response) => response.data.data),
  assignDriver: (orderId: string, driverId: string) =>
    appConfig.useMockApi
      ? mockApi.assignDriver(orderId, driverId)
      : http.post<ApiResponse<unknown>>(`/admin/orders/${orderId}/assign-driver`, { driver_id: driverId }).then((response) => response.data.data),

  drivers: () => getList<Driver>('/admin/drivers', mockCollections.drivers),
  driver: (id: string) =>
    appConfig.useMockApi
      ? mockApi.getDriver(id)
      : http.get<ApiResponse<Driver>>(`/admin/drivers/${id}`).then((response) => response.data.data),
  moderateDriverDocument: (documentId: string, status: DriverDocument['status'], comment?: string) =>
    appConfig.useMockApi
      ? mockApi.moderateDriverDocument(documentId, status, comment)
      : http.post<ApiResponse<unknown>>(`/admin/driver-documents/${documentId}/moderate`, { status, comment }).then((response) => response.data.data),

  cars: () => getList<Car>('/admin/cars', mockCollections.cars),
  passengers: () => getList<Passenger>('/admin/passengers', mockCollections.passengers),
  taxiParks: () => getList<TaxiPark>('/admin/taxi-parks', mockCollections.taxiParks),
  tariffs: () => getList<Tariff>('/admin/tariffs', mockCollections.tariffs),
  createTariff: (payload: TariffPayload) =>
    appConfig.useMockApi
      ? mockApi.createTariff(payload)
      : http.post<ApiResponse<Tariff>>('/admin/tariffs', payload).then((response) => response.data.data),
  commissions: () => getList<CommissionRule>('/admin/commissions', mockCollections.commissionRules),
  saveCommission: (payload: Omit<CommissionRule, 'id' | 'priority' | 'created_at'>) =>
    appConfig.useMockApi
      ? mockApi.upsertCommissionRule(payload)
      : http.post<ApiResponse<CommissionRule>>('/admin/commissions', payload).then((response) => response.data.data),
  financialOperations: () => getList<FinancialOperation>('/admin/finance/operations', mockCollections.financialOperations),
  payouts: () => getList<Payout>('/admin/payouts', mockCollections.payouts),
  zones: () => getList<Zone>('/admin/zones', mockCollections.zones),
  supportTickets: () => getList<SupportTicket>('/admin/support/tickets', mockCollections.supportTickets),
  adminUsers: () => getList<AdminUser>('/admin/users', mockCollections.adminUsers),
  roles: () => getList<Role>('/admin/roles', mockCollections.roles),
  auditLogs: () => getList<AuditLog>('/admin/audit-logs', mockCollections.auditLogs),
}
