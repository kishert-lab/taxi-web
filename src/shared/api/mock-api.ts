import type { TariffPayload } from '../../features/taxi-park-tariffs/api'
import type { CommissionRule, DriverDocument, Order } from '../../entities/types'
import type { AuthUser } from './types'
import {
  mockAdminUsers,
  mockAuditLogs,
  mockCars,
  mockCities,
  mockCommissionRules,
  mockDrivers,
  mockFinancialOperations,
  mockOrders,
  mockPassengers,
  mockPayouts,
  mockRoles,
  mockSupportTickets,
  mockTariffs,
  mockTaxiParks,
  mockUser,
  mockZones,
} from './mock-data'

const wait = async () => new Promise((resolve) => setTimeout(resolve, 250))

export const mockApi = {
  async login(role?: AuthUser['role'], phone?: string) {
    await wait()
    return {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'Bearer',
      expires_in: 900,
      user: { ...mockUser, id: phone ?? mockUser.id, phone, role: role ?? 'admin' },
    }
  },

  async list<T>(items: T[]) {
    await wait()
    return items
  },

  async getOrder(id: string) {
    await wait()
    return mockOrders.find((order) => order.id === id) ?? mockOrders[0]
  },

  async createOrder(payload: Partial<Order>) {
    await wait()
    return {
      ...mockOrders[0],
      ...payload,
      id: `ord-${Date.now()}`,
      status: 'new' as const,
      created_at: new Date().toISOString(),
    }
  },

  async assignDriver(orderId: string, driverId: string) {
    await wait()
    const driver = mockDrivers.find((item) => item.id === driverId)
    return { orderId, driverId, driver_name: driver?.full_name ?? 'Водитель' }
  },

  async getDriver(id: string) {
    await wait()
    return mockDrivers.find((driver) => driver.id === id) ?? mockDrivers[0]
  },

  async moderateDriverDocument(documentId: string, status: DriverDocument['status'], comment?: string) {
    await wait()
    return { documentId, status, comment }
  },

  async createTariff(payload: TariffPayload) {
    await wait()
    return { ...payload, id: `tariff-${Date.now()}` }
  },

  async updateTariff(id: string, payload: Partial<TariffPayload>) {
    await wait()
    return { ...mockTariffs[0], ...payload, id }
  },

  async upsertCommissionRule(payload: Omit<CommissionRule, 'id' | 'priority' | 'created_at'>) {
    await wait()
    const priorityByScope = { driver: 1, taxi_park: 2, tariff: 3, city: 4, global: 5 } as const
    return {
      ...payload,
      id: `commission-${Date.now()}`,
      priority: priorityByScope[payload.scope],
      created_at: new Date().toISOString(),
    }
  },
}

export const mockCollections = {
  cities: mockCities,
  orders: mockOrders,
  drivers: mockDrivers,
  cars: mockCars,
  passengers: mockPassengers,
  taxiParks: mockTaxiParks,
  tariffs: mockTariffs,
  commissionRules: mockCommissionRules,
  financialOperations: mockFinancialOperations,
  payouts: mockPayouts,
  zones: mockZones,
  supportTickets: mockSupportTickets,
  adminUsers: mockAdminUsers,
  roles: mockRoles,
  auditLogs: mockAuditLogs,
}
