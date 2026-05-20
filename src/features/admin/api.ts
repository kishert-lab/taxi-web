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
import { mockApi, mockCollections } from '../../shared/api/mock-api'

async function getMockList<T>(mockItems: T[]) {
  return mockApi.list(mockItems)
}

export const adminApi = {
  orders: () => getMockList<Order>(mockCollections.orders),
  order: (id: string) => mockApi.getOrder(id),
  createOrder: (payload: Partial<Order>) => mockApi.createOrder(payload),
  assignDriver: (orderId: string, driverId: string) => mockApi.assignDriver(orderId, driverId),

  drivers: () => getMockList<Driver>(mockCollections.drivers),
  driver: (id: string) => mockApi.getDriver(id),
  moderateDriverDocument: (documentId: string, status: DriverDocument['status'], comment?: string) =>
    mockApi.moderateDriverDocument(documentId, status, comment),

  cars: () => getMockList<Car>(mockCollections.cars),
  passengers: () => getMockList<Passenger>(mockCollections.passengers),
  taxiParks: () => getMockList<TaxiPark>(mockCollections.taxiParks),
  tariffs: () => getMockList<Tariff>(mockCollections.tariffs),
  createTariff: (payload: TariffPayload) => mockApi.createTariff(payload),
  commissions: () => getMockList<CommissionRule>(mockCollections.commissionRules),
  saveCommission: (payload: Omit<CommissionRule, 'id' | 'priority' | 'created_at'>) =>
    mockApi.upsertCommissionRule(payload),
  financialOperations: () => getMockList<FinancialOperation>(mockCollections.financialOperations),
  payouts: () => getMockList<Payout>(mockCollections.payouts),
  zones: () => getMockList<Zone>(mockCollections.zones),
  supportTickets: () => getMockList<SupportTicket>(mockCollections.supportTickets),
  adminUsers: () => getMockList<AdminUser>(mockCollections.adminUsers),
  roles: () => getMockList<Role>(mockCollections.roles),
  auditLogs: () => getMockList<AuditLog>(mockCollections.auditLogs),
}
