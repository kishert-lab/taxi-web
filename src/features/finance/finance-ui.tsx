import type { ReactNode } from 'react'

import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Card, StatCard } from '../../shared/ui/Card'
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents } from '../../shared/utils/format-money'
import type {
  DriverPayout,
  FinanceDocument,
  OrderFinance,
  PlatformInvoice,
  TaxiParkFinanceOverview,
} from './api'

export function FinanceOverviewCards({ overview }: { overview: TaxiParkFinanceOverview }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Заказов" value={overview.orders_count ?? 0} />
      <StatCard title="Сумма заказов" value={formatMoneyCents(overview.order_total_amount)} />
      <StatCard title="Доход водителей" value={formatMoneyCents(overview.driver_income_amount)} />
      <StatCard title="Комиссия таксопарка" value={formatMoneyCents(overview.taxi_park_commission_amount)} />
      <StatCard title="Доход таксопарка" value={formatMoneyCents(overview.taxi_park_income_amount)} />
      <StatCard title="Плата платформе" value={formatMoneyCents(overview.platform_service_fee_amount)} />
      <StatCard title="Долг перед платформой" value={formatMoneyCents(overview.platform_debt_amount)} />
    </div>
  )
}

export function PlatformDebtCard({ amount }: { amount?: { amount_cents: number; currency: string } }) {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <p className="text-sm font-semibold text-amber-900">Долг перед платформой</p>
      <div className="mt-2 text-2xl font-bold text-amber-950">{formatMoneyCents(amount)}</div>
      <p className="mt-2 text-sm text-amber-800">
        Это отдельное обязательство таксопарка. Оно не уменьшает доход таксопарка по заказу.
      </p>
    </Card>
  )
}

export function OrderFinanceTable({ orders }: { orders?: OrderFinance[] }) {
  if (!orders?.length) return <EmptyState title="Финансовые записи по заказам не найдены" />

  return (
    <Card>
      <Table>
        <thead>
          <tr className="text-slate-500">
            <th className="border-b border-slate-200 p-3">Заказ</th>
            <th className="border-b border-slate-200 p-3">Сумма заказа</th>
            <th className="border-b border-slate-200 p-3">Комиссия водителя</th>
            <th className="border-b border-slate-200 p-3">Доход водителя</th>
            <th className="border-b border-slate-200 p-3">Доход таксопарка</th>
            <th className="border-b border-slate-200 p-3">Плата платформе</th>
            <th className="border-b border-slate-200 p-3">Статус</th>
            <th className="border-b border-slate-200 p-3">Дата</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-slate-50">
              <td className="border-b border-slate-100 p-3">
                <div className="font-mono text-xs text-slate-500">{shortId(order.order_id)}</div>
              </td>
              <td className="border-b border-slate-100 p-3">{formatMoneyCents(order.order_total_amount)}</td>
              <td className="border-b border-slate-100 p-3">
                <div>{order.driver_commission_percent}%</div>
                <div className="text-xs text-slate-500">{formatMoneyCents(order.taxi_park_commission_amount)}</div>
              </td>
              <td className="border-b border-slate-100 p-3">{formatMoneyCents(order.driver_income_amount)}</td>
              <td className="border-b border-slate-100 p-3 font-semibold text-emerald-700">
                {formatMoneyCents(order.taxi_park_income_amount)}
              </td>
              <td className="border-b border-slate-100 p-3">
                <div>{order.platform_fee_percent}%</div>
                <div className="text-xs font-semibold text-amber-700">{formatMoneyCents(order.platform_fee_amount)}</div>
              </td>
              <td className="border-b border-slate-100 p-3">
                <Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
              </td>
              <td className="border-b border-slate-100 p-3">{formatDate(order.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}

export function PayoutsTable({
  payouts,
  actions,
}: {
  payouts?: DriverPayout[]
  actions?: (payout: DriverPayout) => ReactNode
}) {
  if (!payouts?.length) return <EmptyState title="Выплаты не найдены" />

  return (
    <Card>
      <Table>
        <thead>
          <tr className="text-slate-500">
            <th className="border-b border-slate-200 p-3">Водитель</th>
            <th className="border-b border-slate-200 p-3">Сумма</th>
            <th className="border-b border-slate-200 p-3">Период</th>
            <th className="border-b border-slate-200 p-3">Статус</th>
            <th className="border-b border-slate-200 p-3">Дата</th>
            {actions ? <th className="border-b border-slate-200 p-3">Действия</th> : null}
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id} className="hover:bg-slate-50">
              <td className="border-b border-slate-100 p-3">{shortId(payout.driver_id)}</td>
              <td className="border-b border-slate-100 p-3">{formatMoneyCents(payout.amount)}</td>
              <td className="border-b border-slate-100 p-3">
                {formatDate(payout.period_from)} - {formatDate(payout.period_to)}
              </td>
              <td className="border-b border-slate-100 p-3">
                <Badge variant={statusVariant(payout.status)}>{statusLabel(payout.status)}</Badge>
              </td>
              <td className="border-b border-slate-100 p-3">{formatDate(payout.created_at)}</td>
              {actions ? <td className="border-b border-slate-100 p-3">{actions(payout)}</td> : null}
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}

export function PlatformInvoicesTable({
  invoices,
  actions,
}: {
  invoices?: PlatformInvoice[]
  actions?: (invoice: PlatformInvoice) => ReactNode
}) {
  if (!invoices?.length) return <EmptyState title="Счета платформы не найдены" />

  return (
    <Card>
      <Table>
        <thead>
          <tr className="text-slate-500">
            <th className="border-b border-slate-200 p-3">Счет</th>
            <th className="border-b border-slate-200 p-3">Сумма платы платформе</th>
            <th className="border-b border-slate-200 p-3">Период</th>
            <th className="border-b border-slate-200 p-3">Статус</th>
            <th className="border-b border-slate-200 p-3">Создан</th>
            {actions ? <th className="border-b border-slate-200 p-3">Действия</th> : null}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-slate-50">
              <td className="border-b border-slate-100 p-3">{invoice.invoice_number ?? shortId(invoice.id)}</td>
              <td className="border-b border-slate-100 p-3 font-semibold text-amber-700">{formatMoneyCents(invoice.amount)}</td>
              <td className="border-b border-slate-100 p-3">
                {formatDate(invoice.period_from)} - {formatDate(invoice.period_to)}
              </td>
              <td className="border-b border-slate-100 p-3">
                <Badge variant={statusVariant(invoice.status)}>{statusLabel(invoice.status)}</Badge>
              </td>
              <td className="border-b border-slate-100 p-3">{formatDate(invoice.created_at)}</td>
              {actions ? <td className="border-b border-slate-100 p-3">{actions(invoice)}</td> : null}
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}

export function FinanceDocumentsTable({ documents }: { documents?: FinanceDocument[] }) {
  if (!documents?.length) return <EmptyState title="Финансовые документы не найдены" />

  return (
    <Card>
      <Table>
        <thead>
          <tr className="text-slate-500">
            <th className="border-b border-slate-200 p-3">Тип</th>
            <th className="border-b border-slate-200 p-3">Номер</th>
            <th className="border-b border-slate-200 p-3">Статус</th>
            <th className="border-b border-slate-200 p-3">Создан</th>
            <th className="border-b border-slate-200 p-3">Файл</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id} className="hover:bg-slate-50">
              <td className="border-b border-slate-100 p-3">{document.type}</td>
              <td className="border-b border-slate-100 p-3">{document.number ?? shortId(document.id)}</td>
              <td className="border-b border-slate-100 p-3">
                <Badge variant={statusVariant(document.status)}>{statusLabel(document.status)}</Badge>
              </td>
              <td className="border-b border-slate-100 p-3">{formatDate(document.created_at)}</td>
              <td className="border-b border-slate-100 p-3">
                {document.file_url ? (
                  <a className="font-semibold text-amber-700" href={document.file_url} target="_blank" rel="noreferrer">
                    Открыть
                  </a>
                ) : (
                  '-'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  )
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      {children}
    </section>
  )
}

function shortId(value?: string) {
  if (!value) return '-'
  return value.length > 8 ? value.slice(0, 8) : value
}
