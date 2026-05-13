import type {
  AdminUser,
  AuditLog,
  Car,
  City,
  CommissionRule,
  Driver,
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
import type { AuthUser } from './types'

const money = (amount_cents: number) => ({ amount_cents, currency: 'RUB' })

export const mockUser: AuthUser = {
  id: 'admin-1',
  name: 'Super Admin',
  email: 'admin@taxi.local',
  role: 'super_admin',
}

export const mockCities: City[] = [
  { id: 'city-1', name: 'Екатеринбург', timezone: 'Asia/Yekaterinburg', status: 'active' },
  { id: 'city-2', name: 'Москва', timezone: 'Europe/Moscow', status: 'active' },
]

export const mockOrders: Order[] = [
  {
    id: 'ord-1001',
    city_id: 'city-1',
    city_name: 'Екатеринбург',
    status: 'new',
    passenger_name: 'Ирина Смирнова',
    passenger_phone: '+79990000001',
    pickup_address: 'Ленина, 10',
    destination_address: 'Малышева, 50',
    tariff_id: 'tariff-1',
    tariff_name: 'Комфорт',
    price: money(42000),
    platform_commission: money(420),
    created_at: '2026-05-13T08:15:00Z',
  },
  {
    id: 'ord-1002',
    city_id: 'city-1',
    city_name: 'Екатеринбург',
    status: 'completed',
    passenger_name: 'Павел Орлов',
    passenger_phone: '+79990000002',
    pickup_address: 'Вайнера, 1',
    destination_address: 'Аэропорт Кольцово',
    driver_id: 'drv-1',
    driver_name: 'Алексей Иванов',
    tariff_id: 'tariff-2',
    tariff_name: 'Бизнес',
    price: money(125000),
    platform_commission: money(1250),
    created_at: '2026-05-12T18:30:00Z',
    completed_at: '2026-05-12T19:05:00Z',
  },
]

export const mockDrivers: Driver[] = [
  {
    id: 'drv-1',
    user_id: 'usr-1',
    taxi_park_id: 'park-1',
    full_name: 'Алексей Иванов',
    phone: '+79991110000',
    rating: 4.92,
    status: 'online',
    balance: money(185000),
    created_at: '2026-02-01T10:00:00Z',
    documents: [
      { id: 'doc-1', type: 'passport', status: 'pending', url: '#' },
      { id: 'doc-2', type: 'license', status: 'approved', url: '#' },
    ],
  },
  {
    id: 'drv-2',
    user_id: 'usr-2',
    taxi_park_id: 'park-1',
    full_name: 'Денис Кузнецов',
    phone: '+79992220000',
    rating: 4.71,
    status: 'busy',
    balance: money(92000),
    created_at: '2026-03-11T12:00:00Z',
    documents: [{ id: 'doc-3', type: 'license', status: 'rejected', url: '#', comment: 'Не читается номер' }],
  },
]

export const mockCars: Car[] = [
  { id: 'car-1', taxi_park_id: 'park-1', driver_id: 'drv-1', brand: 'Kia', model: 'Rio', plate_number: 'А123ВС196', color: 'Белый', year: 2022, status: 'active' },
  { id: 'car-2', taxi_park_id: 'park-1', brand: 'Skoda', model: 'Octavia', plate_number: 'М777КХ196', color: 'Черный', year: 2021, status: 'pending' },
]

export const mockPassengers: Passenger[] = [
  { id: 'pass-1', full_name: 'Ирина Смирнова', phone: '+79990000001', orders_count: 12, status: 'active', created_at: '2026-01-20T09:00:00Z' },
  { id: 'pass-2', full_name: 'Павел Орлов', phone: '+79990000002', orders_count: 4, status: 'active', created_at: '2026-04-02T09:00:00Z' },
]

export const mockTaxiParks: TaxiPark[] = [
  { id: 'park-1', name: 'Урал Такси', legal_name: 'ООО Урал Такси', city_name: 'Екатеринбург', drivers_count: 32, balance: money(815000), status: 'active' },
  { id: 'park-2', name: 'Сити Мобил Парк', legal_name: 'ООО Сити Парк', city_name: 'Москва', drivers_count: 118, balance: money(2310000), status: 'active' },
]

export const mockTariffs: Tariff[] = [
  { id: 'tariff-1', city_id: 'city-1', name: 'Комфорт', description: 'Основной городской тариф', base_price_cents: 12000, minimum_price_cents: 25000, price_per_km_cents: 2600, price_per_minute_cents: 900, is_active: true },
  { id: 'tariff-2', city_id: 'city-1', name: 'Бизнес', description: 'Повышенный класс', base_price_cents: 25000, minimum_price_cents: 50000, price_per_km_cents: 4500, price_per_minute_cents: 1500, is_active: true },
]

export const mockCommissionRules: CommissionRule[] = [
  { id: 'commission-global', scope: 'global', basis_points: 100, priority: 5, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'commission-city-1', scope: 'city', city_id: 'city-1', basis_points: 150, priority: 4, is_active: true, created_at: '2026-03-01T00:00:00Z' },
]

export const mockFinancialOperations: FinancialOperation[] = [
  { id: 'fin-1', type: 'order_payment', subject_type: 'driver', subject_name: 'Алексей Иванов', amount: money(123750), status: 'completed', created_at: '2026-05-12T19:05:00Z' },
  { id: 'fin-2', type: 'commission', subject_type: 'platform', subject_name: 'Taxi Platform', amount: money(1250), status: 'completed', created_at: '2026-05-12T19:05:00Z' },
]

export const mockPayouts: Payout[] = [
  { id: 'pay-1', recipient_type: 'driver', recipient_name: 'Алексей Иванов', amount: money(50000), status: 'created', created_at: '2026-05-13T07:00:00Z' },
]

export const mockZones: Zone[] = [
  { id: 'zone-1', city_name: 'Екатеринбург', name: 'Центр', type: 'surge', status: 'active' },
]

export const mockSupportTickets: SupportTicket[] = [
  { id: 'ticket-1', subject: 'Пассажир забыл вещи', requester_name: 'Ирина Смирнова', status: 'open', created_at: '2026-05-13T06:00:00Z' },
]

export const mockAdminUsers: AdminUser[] = [
  { id: 'admin-1', name: 'Super Admin', email: 'admin@taxi.local', role: 'super_admin', status: 'active', created_at: '2026-01-01T00:00:00Z' },
  { id: 'admin-2', name: 'Диспетчер', email: 'dispatcher@taxi.local', role: 'dispatcher', status: 'active', created_at: '2026-02-01T00:00:00Z' },
]

export const mockRoles: Role[] = [
  { id: 'role-1', name: 'super_admin', permissions: ['*'] },
  { id: 'role-2', name: 'dispatcher', permissions: ['orders.view', 'orders.create', 'orders.assign_driver'] },
]

export const mockAuditLogs: AuditLog[] = [
  { id: 'audit-1', admin_user_name: 'Super Admin', action: 'commission.update', entity_type: 'CommissionRule', entity_id: 'commission-global', created_at: '2026-05-13T08:00:00Z', ip_address: '192.168.0.10' },
]
