import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AdminFinancePage } from '../features/admin-finance/AdminFinancePage'
import {
  AdminUsersPage,
  AnalyticsPage,
  AuditLogsPage,
  CarsPage,
  CommissionPage,
  DriversPage,
  MapPage,
  OrdersPage,
  PassengersPage,
  PayoutsPage,
  PromocodesPage,
  RolesPage,
  SettingsPage,
  SupportPage,
  TariffsAdminPage,
  TaxiParksPage,
  ZonesPage,
} from '../features/admin/AdminTables'
import { CreateOrderPage } from '../features/admin/CreateOrderPage'
import { DriverDetailPage } from '../features/admin/DriverDetailPage'
import { OrderDetailPage } from '../features/admin/OrderDetailPage'
import { LoginPage } from '../features/auth/LoginPage'
import { DriverRegistrationPage } from '../features/auth/DriverRegistrationPage'
import { VerifyCodePage } from '../features/auth/VerifyCodePage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { DriverFinancePage } from '../features/driver-finance/DriverFinancePage'
import { LegalDocumentsPage } from '../features/legal/LegalDocumentsPage'
import { PublicLegalDocumentPage } from '../features/legal/PublicLegalDocumentPage'
import { TaxiParkDriversPage } from '../features/taxi-park-drivers/TaxiParkDriversPage'
import { TaxiParkOrdersPage } from '../features/taxi-park-orders/TaxiParkOrdersPage'
import { TaxiParkSettingsPage } from '../features/taxi-park-settings/TaxiParkSettingsPage'
import { TaxiParkTariffsPage } from '../features/taxi-park-tariffs/TaxiParkTariffsPage'
import { AuthGuard, PermissionGuard, RoleGuard } from '../shared/auth/guards'
import { DashboardLayout } from '../shared/layout/DashboardLayout'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register/driver', element: <DriverRegistrationPage /> },
  { path: '/verify-code', element: <VerifyCodePage /> },
  { path: '/legal/:kind', element: <PublicLegalDocumentPage /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          {
            element: <PermissionGuard permission="orders.view" />,
            children: [
              { path: '/orders', element: <OrdersPage /> },
              { path: '/orders/:id', element: <OrderDetailPage /> },
            ],
          },
          {
            element: <PermissionGuard permission="orders.create" />,
            children: [{ path: '/orders/new', element: <CreateOrderPage /> }],
          },
          { element: <PermissionGuard permission="map.view" />, children: [{ path: '/map', element: <MapPage /> }] },
          {
            element: <PermissionGuard permission="drivers.view" />,
            children: [
              { path: '/drivers', element: <DriversPage /> },
              { path: '/drivers/:id', element: <DriverDetailPage /> },
            ],
          },
          { element: <PermissionGuard permission="cars.view" />, children: [{ path: '/cars', element: <CarsPage /> }] },
          { element: <PermissionGuard permission="passengers.view" />, children: [{ path: '/passengers', element: <PassengersPage /> }] },
          { element: <PermissionGuard permission="taxi_parks.view" />, children: [{ path: '/taxi-parks', element: <TaxiParksPage /> }] },
          { element: <PermissionGuard permission="tariffs.manage" />, children: [{ path: '/tariffs', element: <TariffsAdminPage /> }] },
          { element: <PermissionGuard permission="commissions.manage" />, children: [{ path: '/commissions', element: <CommissionPage /> }] },
          { element: <PermissionGuard permission="finance.view" />, children: [{ path: '/finance', element: <AdminFinancePage /> }] },
          { element: <PermissionGuard permission="payouts.manage" />, children: [{ path: '/payouts', element: <PayoutsPage /> }] },
          { element: <PermissionGuard permission="zones.view" />, children: [{ path: '/zones', element: <ZonesPage /> }] },
          { element: <PermissionGuard permission="promocodes.view" />, children: [{ path: '/promocodes', element: <PromocodesPage /> }] },
          { element: <PermissionGuard permission="support.view" />, children: [{ path: '/support', element: <SupportPage /> }] },
          { element: <PermissionGuard permission="analytics.view" />, children: [{ path: '/analytics', element: <AnalyticsPage /> }] },
          { element: <PermissionGuard permission="admin_users.manage" />, children: [{ path: '/admin-users', element: <AdminUsersPage /> }] },
          { element: <PermissionGuard permission="roles.manage" />, children: [{ path: '/roles', element: <RolesPage /> }] },
          { element: <PermissionGuard permission="settings.manage" />, children: [{ path: '/settings', element: <SettingsPage /> }] },
          { element: <PermissionGuard permission="audit_logs.view" />, children: [{ path: '/audit-logs', element: <AuditLogsPage /> }] },
          { path: '/legacy-dashboard', element: <DashboardPage /> },
          {
            element: <RoleGuard roles={['admin']} />,
            children: [
              { path: '/admin/finance', element: <AdminFinancePage /> },
              { path: '/admin/legal', element: <LegalDocumentsPage /> },
            ],
          },
          {
            element: <RoleGuard roles={['taxi_park', 'dispatcher']} />,
            children: [
              { path: '/taxi-park/drivers', element: <TaxiParkDriversPage /> },
              { path: '/taxi-park/orders', element: <TaxiParkOrdersPage /> },
            ],
          },
          {
            element: <RoleGuard roles={['taxi_park']} />,
            children: [
              { path: '/taxi-park/settings', element: <TaxiParkSettingsPage /> },
              { path: '/taxi-park/tariffs', element: <TaxiParkTariffsPage /> },
            ],
          },
          {
            element: <RoleGuard roles={['driver']} />,
            children: [{ path: '/driver/finance', element: <DriverFinancePage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
