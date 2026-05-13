import type { MoneyCentsResponse, UserRole } from '../shared/api/types'

export type EntityStatus = 'active' | 'inactive' | 'blocked' | 'pending'
export type OrderStatus =
  | 'new'
  | 'assigned'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
export type DriverStatus = 'offline' | 'online' | 'busy' | 'paused' | 'blocked'
export type ModerationStatus = 'pending' | 'approved' | 'rejected'

export type City = {
  id: string
  name: string
  timezone: string
  status: EntityStatus
}

export type Order = {
  id: string
  city_id: string
  city_name: string
  status: OrderStatus
  passenger_name: string
  passenger_phone: string
  pickup_address: string
  destination_address: string
  driver_id?: string
  driver_name?: string
  tariff_id: string
  tariff_name: string
  price: MoneyCentsResponse
  platform_commission: MoneyCentsResponse
  created_at: string
  completed_at?: string
}

export type DriverDocument = {
  id: string
  type: 'passport' | 'license' | 'vehicle_registration' | 'selfie'
  status: ModerationStatus
  url: string
  comment?: string
}

export type Driver = {
  id: string
  user_id: string
  taxi_park_id?: string
  full_name: string
  phone: string
  rating: number
  status: DriverStatus
  balance: MoneyCentsResponse
  documents: DriverDocument[]
  created_at: string
}

export type Car = {
  id: string
  taxi_park_id?: string
  driver_id?: string
  brand: string
  model: string
  plate_number: string
  color: string
  year: number
  status: EntityStatus
}

export type Passenger = {
  id: string
  full_name: string
  phone: string
  orders_count: number
  status: EntityStatus
  created_at: string
}

export type TaxiPark = {
  id: string
  name: string
  legal_name: string
  city_name: string
  drivers_count: number
  balance: MoneyCentsResponse
  status: EntityStatus
}

export type Tariff = {
  id: string
  city_id?: string
  name: string
  description?: string
  base_price_cents: number
  price_per_km_cents: number
  price_per_minute_cents: number
  minimum_price_cents: number
  is_active: boolean
}

export type CommissionScope = 'global' | 'city' | 'tariff' | 'taxi_park' | 'driver'

export type CommissionRule = {
  id: string
  scope: CommissionScope
  city_id?: string
  tariff_id?: string
  taxi_park_id?: string
  driver_id?: string
  basis_points: number
  priority: 1 | 2 | 3 | 4 | 5
  is_active: boolean
  created_at: string
}

export type FinancialOperation = {
  id: string
  type: 'order_payment' | 'commission' | 'refund' | 'manual_adjustment'
  subject_type: 'driver' | 'taxi_park' | 'platform' | 'passenger'
  subject_name: string
  amount: MoneyCentsResponse
  status: 'pending' | 'completed' | 'failed'
  created_at: string
}

export type Payout = {
  id: string
  recipient_type: 'driver' | 'taxi_park'
  recipient_name: string
  amount: MoneyCentsResponse
  status: 'created' | 'processing' | 'paid' | 'failed'
  created_at: string
}

export type Zone = {
  id: string
  city_name: string
  name: string
  type: 'service' | 'surge' | 'restricted'
  status: EntityStatus
}

export type SupportTicket = {
  id: string
  subject: string
  requester_name: string
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
}

export type Permission = {
  id: string
  code: string
  description: string
}

export type Role = {
  id: string
  name: UserRole
  permissions: string[]
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: UserRole
  status: EntityStatus
  created_at: string
}

export type AuditLog = {
  id: string
  admin_user_name: string
  action: string
  entity_type: string
  entity_id: string
  created_at: string
  ip_address: string
}
