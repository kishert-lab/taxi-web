import type { UserRole } from '../api/types'

export type PermissionCode =
  | 'dashboard.view'
  | 'orders.view'
  | 'orders.create'
  | 'orders.assign_driver'
  | 'map.view'
  | 'drivers.view'
  | 'drivers.moderate_documents'
  | 'cars.view'
  | 'passengers.view'
  | 'taxi_parks.view'
  | 'tariffs.manage'
  | 'commissions.manage'
  | 'finance.view'
  | 'payouts.manage'
  | 'zones.view'
  | 'promocodes.view'
  | 'support.view'
  | 'analytics.view'
  | 'admin_users.manage'
  | 'roles.manage'
  | 'settings.manage'
  | 'audit_logs.view'

const allPermissions: PermissionCode[] = [
  'dashboard.view',
  'orders.view',
  'orders.create',
  'orders.assign_driver',
  'map.view',
  'drivers.view',
  'drivers.moderate_documents',
  'cars.view',
  'passengers.view',
  'taxi_parks.view',
  'tariffs.manage',
  'commissions.manage',
  'finance.view',
  'payouts.manage',
  'zones.view',
  'promocodes.view',
  'support.view',
  'analytics.view',
  'admin_users.manage',
  'roles.manage',
  'settings.manage',
  'audit_logs.view',
]

export const rolePermissions: Record<UserRole, PermissionCode[]> = {
  super_admin: allPermissions,
  city_admin: [
    'dashboard.view',
    'orders.view',
    'orders.create',
    'orders.assign_driver',
    'map.view',
    'drivers.view',
    'cars.view',
    'passengers.view',
    'taxi_parks.view',
    'tariffs.manage',
    'commissions.manage',
    'zones.view',
    'support.view',
    'analytics.view',
    'audit_logs.view',
  ],
  dispatcher: [
    'dashboard.view',
    'orders.view',
    'orders.create',
    'orders.assign_driver',
    'map.view',
    'drivers.view',
    'passengers.view',
    'support.view',
  ],
  taxi_park_admin: ['dashboard.view', 'orders.view', 'drivers.view', 'cars.view', 'finance.view', 'payouts.manage'],
  finance_manager: ['dashboard.view', 'commissions.manage', 'finance.view', 'payouts.manage', 'analytics.view', 'audit_logs.view'],
  moderator: ['dashboard.view', 'drivers.view', 'drivers.moderate_documents', 'cars.view', 'passengers.view', 'support.view'],
  support: ['dashboard.view', 'orders.view', 'passengers.view', 'drivers.view', 'support.view'],
  admin: allPermissions,
  taxi_park: ['dashboard.view', 'orders.view', 'drivers.view', 'cars.view', 'finance.view'],
  driver: ['dashboard.view'],
  passenger: ['dashboard.view'],
}

export function getPermissionsForRole(role?: UserRole) {
  return role ? rolePermissions[role] : []
}

export function hasPermission(role: UserRole | undefined, permission: PermissionCode) {
  return getPermissionsForRole(role).includes(permission)
}
