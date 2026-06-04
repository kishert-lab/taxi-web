import { useQueries, useQuery } from '@tanstack/react-query'
import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { getApiErrorMessage } from '../../shared/api/errors'
import { useAuthStore } from '../../shared/auth/auth-store'
import { Card, StatCard } from '../../shared/ui/Card'
import { Skeleton } from '../../shared/ui/Loader'
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents } from '../../shared/utils/format-money'
import { statusLabel } from '../../shared/ui/badge-utils'
import { useNotificationStore } from '../notifications/notification-store'
import {
  getAdminFinanceOverview,
  getDriverBalance,
  getDriverOrderHistory,
  getDriverTransactions,
  getTaxiParkBalance,
  getTaxiParkDrivers,
  getTaxiParkOrders,
  getTaxiParkTransactions,
} from './api'
import { TaxiParkFleetMap } from './TaxiParkFleetMap'

export function DashboardPage() {
  const user = useAuthStore((state) => state.user)

  if (user?.role === 'admin') return <AdminDashboard />
  if (user?.role === 'driver') return <DriverDashboard />
  if (user?.role === 'taxi_park' || user?.role === 'dispatcher') return <TaxiParkDashboard />

  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-950">Dashboard</h2>
      <p className="mt-2 text-sm text-slate-500">Раздел для роли {user?.role} будет расширен после появления API.</p>
    </Card>
  )
}

function AdminDashboard() {
  const overview = useQuery({
    queryKey: ['admin-finance-overview'],
    queryFn: getAdminFinanceOverview,
  })

  if (overview.isLoading) return <Skeleton className="h-72" />
  if (overview.isError) return <Card className="text-red-700">{getApiErrorMessage(overview.error)}</Card>

  const data = overview.data
  if (!data) return null
  const chartData = [
    { name: 'Выручка', value: data.completed_orders_revenue.amount_cents / 100 },
    { name: 'Комиссия', value: data.total_commissions.amount_cents / 100 },
    { name: 'Выплаты', value: data.driver_payouts.amount_cents / 100 },
    { name: 'Парки', value: data.taxi_park_revenue.amount_cents / 100 },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Общая выручка" value={formatMoneyCents(data.completed_orders_revenue)} />
        <StatCard title="Комиссии" value={formatMoneyCents(data.total_commissions)} />
        <StatCard title="Заказы" value={data.completed_orders_count} />
        <StatCard title="Выплаты" value={formatMoneyCents(data.driver_payouts)} />
        <StatCard title="Доход парков" value={formatMoneyCents(data.taxi_park_revenue)} />
      </div>
      <Card className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#F59E0B" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  )
}

function TaxiParkDashboard() {
  const [balance, orders, drivers, transactions] = useQueries({
    queries: [
      { queryKey: ['taxi-park-balance'], queryFn: getTaxiParkBalance },
      { queryKey: ['taxi-park-orders', '', 10], queryFn: () => getTaxiParkOrders({ limit: 10 }) },
      { queryKey: ['taxi-park-drivers', ''], queryFn: () => getTaxiParkDrivers() },
      { queryKey: ['taxi-park-transactions'], queryFn: getTaxiParkTransactions },
    ],
  })

  if ([balance, orders, drivers, transactions].some((query) => query.isLoading)) {
    return <Skeleton className="h-80" />
  }

  const firstError = [balance, orders, drivers, transactions].find((query) => query.isError)
  if (firstError?.error) return <Card className="text-red-700">{getApiErrorMessage(firstError.error)}</Card>

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Баланс" value={formatMoneyCents(balance.data?.available)} />
        <StatCard title="Последние заказы" value={orders.data?.length ?? 0} />
        <StatCard title="Водители" value={drivers.data?.length ?? 0} />
        <StatCard title="Транзакции" value={transactions.data?.length ?? 0} />
      </div>
      <TaxiParkFleetMap drivers={drivers.data ?? []} />
      <ChatNotificationsCard />
      <Card>
        <h2 className="mb-4 text-lg font-bold text-slate-950">Последние заказы</h2>
        {orders.data?.length ? (
          <Table>
            <tbody>
              {orders.data.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 p-3">{statusLabel(order.status)}</td>
                  <td className="border-b border-slate-100 p-3">{formatMoneyCents(order.gross_amount ?? order.total_price ?? order.price)}</td>
                  <td className="border-b border-slate-100 p-3">{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="Заказы не найдены" />
        )}
      </Card>
    </div>
  )
}

function ChatNotificationsCard() {
  const chatNotifications = useNotificationStore((state) => state.chatNotifications)
  const clearChatNotifications = useNotificationStore((state) => state.clearChatNotifications)

  return (
    <Card>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
            <MessageCircle className="h-5 w-5 text-amber-600" />
            Сообщения водителей
          </h2>
          <p className="text-sm text-slate-500">
            История входящих сообщений с переходом в чат заказа.
          </p>
        </div>
        {chatNotifications.length ? (
          <button
            type="button"
            className="text-sm font-semibold text-slate-500 hover:text-slate-800"
            onClick={clearChatNotifications}
          >
            Очистить
          </button>
        ) : null}
      </div>

      {chatNotifications.length ? (
        <div className="space-y-2">
          {chatNotifications.slice(0, 8).map((notification) => (
            <Link
              key={notification.id}
              className="block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-white"
              to={`/taxi-park/orders/${notification.orderId}#driver-chat`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Заказ {notification.orderId}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {notification.body}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-400">
                  {formatDate(notification.createdAt)}
                </span>
              </div>
              {notification.senderName || notification.senderRole ? (
                <p className="mt-2 text-xs text-slate-500">
                  {notification.senderName ?? notification.senderRole}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Новых сообщений нет" />
      )}
    </Card>
  )
}

function DriverDashboard() {
  const [balance, transactions, orders] = useQueries({
    queries: [
      { queryKey: ['driver-balance'], queryFn: getDriverBalance },
      { queryKey: ['driver-transactions'], queryFn: getDriverTransactions },
      { queryKey: ['driver-orders-history'], queryFn: getDriverOrderHistory },
    ],
  })

  if ([balance, transactions, orders].some((query) => query.isLoading)) return <Skeleton className="h-80" />
  const firstError = [balance, transactions, orders].find((query) => query.isError)
  if (firstError?.error) return <Card className="text-red-700">{getApiErrorMessage(firstError.error)}</Card>

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard title="Баланс" value={formatMoneyCents(balance.data?.available)} />
      <StatCard title="Транзакции" value={transactions.data?.length ?? 0} />
      <StatCard title="История заказов" value={orders.data?.length ?? 0} />
    </div>
  )
}
