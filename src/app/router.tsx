import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AdminFinancePage } from '../features/admin-finance/AdminFinancePage'
import { LoginPage } from '../features/auth/LoginPage'
import { DriverRegistrationPage } from '../features/auth/DriverRegistrationPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { DriverFinancePage } from '../features/driver-finance/DriverFinancePage'
import { TaxiParkFinancePage } from '../features/finance/TaxiParkFinancePage'
import { LegalDocumentsPage } from '../features/legal/LegalDocumentsPage'
import { PublicLegalDocumentPage } from '../features/legal/PublicLegalDocumentPage'
import { PassengerOrdersPage } from '../features/passenger/PassengerOrdersPage'
import { PassengerProfilePage } from '../features/passenger/PassengerProfilePage'
import { PassengerSupportPage } from '../features/passenger/PassengerSupportPage'
import { TaxiParkCarsPage } from '../features/taxi-park-cars/TaxiParkCarsPage'
import { TaxiParkDispatchersPage } from '../features/taxi-park-dispatchers/TaxiParkDispatchersPage'
import { TaxiParkDriversPage } from '../features/taxi-park-drivers/TaxiParkDriversPage'
import { TaxiParkOrderDetailsPage } from '../features/taxi-park-orders/TaxiParkOrderDetailsPage'
import { TaxiParkOrdersPage } from '../features/taxi-park-orders/TaxiParkOrdersPage'
import { TaxiParkSettingsPage } from '../features/taxi-park-settings/TaxiParkSettingsPage'
import { TaxiParkTariffsPage } from '../features/taxi-park-tariffs/TaxiParkTariffsPage'
import { AuthGuard, RoleGuard } from '../shared/auth/guards'
import { DashboardLayout } from '../shared/layout/DashboardLayout'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register/driver', element: <DriverRegistrationPage /> },
  { path: '/legal/:kind', element: <PublicLegalDocumentPage /> },
  {
    element: <AuthGuard />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
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
              { path: '/taxi-park/cars', element: <TaxiParkCarsPage /> },
              { path: '/taxi-park/orders', element: <TaxiParkOrdersPage /> },
              { path: '/taxi-park/orders/:orderId', element: <TaxiParkOrderDetailsPage /> },
            ],
          },
          {
            element: <RoleGuard roles={['taxi_park']} />,
            children: [
              { path: '/taxi-park/dispatchers', element: <TaxiParkDispatchersPage /> },
              { path: '/taxi-park/settings', element: <TaxiParkSettingsPage /> },
              { path: '/taxi-park/tariffs', element: <TaxiParkTariffsPage /> },
              { path: '/taxi-park/finance', element: <TaxiParkFinancePage /> },
            ],
          },
          {
            element: <RoleGuard roles={['driver']} />,
            children: [{ path: '/driver/finance', element: <DriverFinancePage /> }],
          },
          {
            element: <RoleGuard roles={['passenger']} />,
            children: [
              { path: '/passenger/orders', element: <PassengerOrdersPage /> },
              { path: '/passenger/profile', element: <PassengerProfilePage /> },
              { path: '/passenger/support', element: <PassengerSupportPage /> },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
])
