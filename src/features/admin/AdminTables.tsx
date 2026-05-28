import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

import type {
  AuditLog,
  Car,
  Driver,
  FinancialOperation,
  Order,
  Passenger,
  Payout,
  Role,
  SupportTicket,
  TaxiPark,
} from '../../entities/types'
import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card, StatCard } from '../../shared/ui/Card'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { DataTable, type DataTableColumn } from '../../shared/ui/DataTable'
import { Loader } from '../../shared/ui/Loader'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents } from '../../shared/utils/format-money'
import { adminApi } from './api'
import { CommissionPage } from './CommissionPage'
import { TariffsAdminPage } from './TariffsAdminPage'

function QueryTable<T extends { id: string }>({
  queryKey,
  queryFn,
  title,
  columns,
  getSearchText,
  getStatus,
  statusOptions,
  actions,
}: {
  queryKey: string
  queryFn: () => Promise<T[]>
  title: string
  columns: DataTableColumn<T>[]
  getSearchText: (row: T) => string
  getStatus?: (row: T) => string
  statusOptions?: string[]
  actions?: React.ReactNode
}) {
  const query = useQuery({ queryKey: [queryKey], queryFn })

  if (query.isLoading) return <Loader />
  if (query.isError) return <Card className="text-red-700">{getApiErrorMessage(query.error)}</Card>

  return (
    <DataTable
      title={title}
      rows={query.data ?? []}
      columns={columns}
      getSearchText={getSearchText}
      getStatus={getStatus}
      statusOptions={statusOptions}
      actions={actions}
    />
  )
}

export function AdminDashboardPage() {
  const orders = useQuery({ queryKey: ['admin-orders'], queryFn: adminApi.orders })
  const drivers = useQuery({ queryKey: ['admin-drivers'], queryFn: adminApi.drivers })
  const finance = useQuery({ queryKey: ['admin-financial-operations'], queryFn: adminApi.financialOperations })

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard title="Заказы" value={orders.data?.length ?? 0} />
      <StatCard title="Водители" value={drivers.data?.length ?? 0} />
      <StatCard
        title="Оборот"
        value={formatMoneyCents((finance.data ?? []).reduce((sum, item) => sum + item.amount.amount_cents, 0))}
        description="По mock финансовым операциям"
      />
    </div>
  )
}

export function OrdersPage() {
  return (
    <QueryTable<Order>
      queryKey="admin-orders"
      queryFn={adminApi.orders}
      title="Заказы"
      getSearchText={(row) => `${row.id} ${row.passenger_name} ${row.pickup_address} ${row.destination_address}`}
      getStatus={(row) => row.status}
      statusOptions={['new', 'assigned', 'driver_arrived', 'in_progress', 'completed', 'cancelled']}
      actions={
        <Link to="/orders/new">
          <Button type="button">Создать</Button>
        </Link>
      }
      columns={[
        { key: 'id', title: 'ID', sortable: true, render: (row) => <Link className="font-mono text-[#F59E0B]" to={`/orders/${row.id}`}>{row.id}</Link> },
        { key: 'status', title: 'Статус', render: (row) => <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge> },
        { key: 'passenger_name', title: 'Пассажир', sortable: true },
        { key: 'driver_name', title: 'Водитель', render: (row) => row.driver_name ?? '—' },
        { key: 'price', title: 'Сумма', render: (row) => formatMoneyCents(row.price) },
        { key: 'created_at', title: 'Создан', sortable: true, render: (row) => formatDate(row.created_at) },
      ]}
    />
  )
}

export function DriversPage() {
  return (
    <QueryTable<Driver>
      queryKey="admin-drivers"
      queryFn={adminApi.drivers}
      title="Водители"
      getSearchText={(row) => `${row.full_name} ${row.phone} ${row.user_id}`}
      getStatus={(row) => row.status}
      statusOptions={['offline', 'online', 'busy', 'paused', 'blocked']}
      columns={[
        { key: 'full_name', title: 'ФИО', sortable: true, render: (row) => <Link className="text-[#F59E0B]" to={`/drivers/${row.id}`}>{row.full_name}</Link> },
        { key: 'phone', title: 'Телефон' },
        { key: 'rating', title: 'Рейтинг', sortable: true },
        { key: 'status', title: 'Статус', render: (row) => <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge> },
        { key: 'balance', title: 'Баланс', render: (row) => formatMoneyCents(row.balance) },
      ]}
    />
  )
}

export function CarsPage() {
  return (
    <QueryTable<Car>
      queryKey="admin-cars"
      queryFn={adminApi.cars}
      title="Автомобили"
      getSearchText={(row) => `${row.brand} ${row.model} ${row.plate_number}`}
      getStatus={(row) => row.status}
      statusOptions={['active', 'inactive', 'pending', 'blocked']}
      columns={[
        { key: 'brand', title: 'Марка', sortable: true },
        { key: 'model', title: 'Модель', sortable: true },
        { key: 'plate_number', title: 'Госномер' },
        { key: 'color', title: 'Цвет' },
        { key: 'year', title: 'Год', sortable: true },
        { key: 'status', title: 'Статус', render: (row) => <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge> },
      ]}
    />
  )
}

export function PassengersPage() {
  return (
    <QueryTable<Passenger>
      queryKey="admin-passengers"
      queryFn={adminApi.passengers}
      title="Пассажиры"
      getSearchText={(row) => `${row.full_name} ${row.phone}`}
      getStatus={(row) => row.status}
      statusOptions={['active', 'inactive', 'blocked']}
      columns={[
        { key: 'full_name', title: 'ФИО', sortable: true },
        { key: 'phone', title: 'Телефон' },
        { key: 'orders_count', title: 'Заказы', sortable: true },
        { key: 'status', title: 'Статус', render: (row) => <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge> },
        { key: 'created_at', title: 'Создан', render: (row) => formatDate(row.created_at) },
      ]}
    />
  )
}

export function TaxiParksPage() {
  return (
    <QueryTable<TaxiPark>
      queryKey="admin-taxi-parks"
      queryFn={adminApi.taxiParks}
      title="Таксопарки"
      getSearchText={(row) => `${row.name} ${row.legal_name} ${row.city_name}`}
      getStatus={(row) => row.status}
      statusOptions={['active', 'inactive', 'blocked', 'pending']}
      columns={[
        { key: 'name', title: 'Название', sortable: true },
        { key: 'legal_name', title: 'Юр. лицо' },
        { key: 'city_name', title: 'Город', sortable: true },
        { key: 'drivers_count', title: 'Водители', sortable: true },
        { key: 'balance', title: 'Баланс', render: (row) => formatMoneyCents(row.balance) },
        { key: 'status', title: 'Статус', render: (row) => <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge> },
      ]}
    />
  )
}

export function FinancePage() {
  return (
    <QueryTable<FinancialOperation>
      queryKey="admin-financial-operations"
      queryFn={adminApi.financialOperations}
      title="Финансовые операции"
      getSearchText={(row) => `${row.type} ${row.subject_name}`}
      getStatus={(row) => row.status}
      statusOptions={['pending', 'completed', 'failed']}
      columns={[
        { key: 'type', title: 'Тип', sortable: true },
        { key: 'subject_name', title: 'Субъект' },
        { key: 'amount', title: 'Сумма', render: (row) => formatMoneyCents(row.amount) },
        { key: 'status', title: 'Статус', render: (row) => <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge> },
        { key: 'created_at', title: 'Дата', render: (row) => formatDate(row.created_at) },
      ]}
    />
  )
}

export function PayoutsPage() {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  return (
    <>
      <QueryTable<Payout>
        queryKey="admin-payouts"
        queryFn={adminApi.payouts}
        title="Выплаты"
        getSearchText={(row) => `${row.recipient_name} ${row.recipient_type}`}
        getStatus={(row) => row.status}
        statusOptions={['created', 'processing', 'paid', 'failed']}
        columns={[
          { key: 'recipient_name', title: 'Получатель', sortable: true },
          { key: 'recipient_type', title: 'Тип' },
          { key: 'amount', title: 'Сумма', render: (row) => formatMoneyCents(row.amount) },
          { key: 'status', title: 'Статус', render: (row) => <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge> },
          { key: 'id', title: '', render: (row) => <Button type="button" variant="secondary" onClick={() => setConfirmId(row.id)}>Выплатить</Button> },
        ]}
      />
      <ConfirmModal
        open={Boolean(confirmId)}
        title="Подтвердить выплату"
        description="Операция изменит финансовое состояние получателя. Продолжить?"
        confirmText="Выплатить"
        onCancel={() => setConfirmId(null)}
        onConfirm={() => {
          toast.success('Выплата отправлена в обработку')
          setConfirmId(null)
        }}
      />
    </>
  )
}

export function ZonesPage() {
  return <SimplePage title="Зоны" queryKey="admin-zones" queryFn={adminApi.zones} />
}

export function SupportPage() {
  return (
    <QueryTable<SupportTicket>
      queryKey="admin-support"
      queryFn={adminApi.supportTickets}
      title="Support"
      getSearchText={(row) => `${row.subject} ${row.requester_name}`}
      getStatus={(row) => row.status}
      statusOptions={['open', 'in_progress', 'resolved']}
      columns={[
        { key: 'subject', title: 'Тема', sortable: true },
        { key: 'requester_name', title: 'Заявитель' },
        { key: 'status', title: 'Статус', render: (row) => <Badge variant={statusVariant(row.status)}>{statusLabel(row.status)}</Badge> },
        { key: 'created_at', title: 'Создан', render: (row) => formatDate(row.created_at) },
      ]}
    />
  )
}

export function AdminUsersPage() {
  return <SimplePage title="Администраторы" queryKey="admin-users" queryFn={adminApi.adminUsers} />
}

export function RolesPage() {
  return <SimplePage<Role> title="Роли" queryKey="admin-roles" queryFn={adminApi.roles} />
}

export function AuditLogsPage() {
  return (
    <QueryTable<AuditLog>
      queryKey="admin-audit-logs"
      queryFn={adminApi.auditLogs}
      title="Аудит действий"
      getSearchText={(row) => `${row.admin_user_name} ${row.action} ${row.entity_type}`}
      columns={[
        { key: 'admin_user_name', title: 'Администратор', sortable: true },
        { key: 'action', title: 'Действие', sortable: true },
        { key: 'entity_type', title: 'Сущность' },
        { key: 'entity_id', title: 'ID' },
        { key: 'ip_address', title: 'IP' },
        { key: 'created_at', title: 'Дата', render: (row) => formatDate(row.created_at) },
      ]}
    />
  )
}

export function MapPage() {
  return <PlaceholderPage title="Карта" description="Здесь будет карта заказов, водителей и зон PostGIS." />
}

export function AnalyticsPage() {
  return <PlaceholderPage title="Аналитика" description="Метрики заказов, выручки, SLA и активности водителей." />
}

export function PromocodesPage() {
  return <PlaceholderPage title="Промокоды" description="Таблица промокодов с фильтрами и лимитами будет подключена к API." />
}

export function SettingsPage() {
  return <PlaceholderPage title="Настройки" description="Глобальные настройки платформы и интеграций." />
}

export { CommissionPage, TariffsAdminPage }

function SimplePage<T extends { id: string }>({
  title,
  queryKey,
  queryFn,
}: {
  title: string
  queryKey: string
  queryFn: () => Promise<T[]>
}) {
  return (
    <QueryTable<T>
      queryKey={queryKey}
      queryFn={queryFn}
      title={title}
      getSearchText={(row) => JSON.stringify(row)}
      getStatus={(row) => ('status' in row ? String(row.status) : '')}
      statusOptions={['active', 'inactive', 'blocked', 'pending']}
      columns={[
        { key: 'id', title: 'ID', sortable: true },
        { key: 'name', title: 'Название', sortable: true },
        { key: 'status', title: 'Статус', render: (row) => ('status' in row ? <Badge variant={statusVariant(String(row.status))}>{statusLabel(String(row.status))}</Badge> : '—') },
      ]}
    />
  )
}

function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <h2 className="text-lg font-bold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </Card>
  )
}
