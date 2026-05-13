import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusVariant } from '../../shared/ui/badge-utils'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { EmptyState, Table } from '../../shared/ui/Table'
import { Skeleton } from '../../shared/ui/Loader'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents } from '../../shared/utils/format-money'
import { getTaxiParkOrders } from './api'

export function TaxiParkOrdersPage() {
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(50)
  const orders = useQuery({
    queryKey: ['taxi-park-orders', status, limit],
    queryFn: () => getTaxiParkOrders({ status: status || undefined, limit }),
  })

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 md:grid-cols-[1fr_220px_140px] md:items-end">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Заказы</h2>
          <p className="text-sm text-slate-500">Фильтрация по статусу и лимиту</p>
        </div>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Все статусы</option>
          <option value="created">created</option>
          <option value="assigned">assigned</option>
          <option value="completed">completed</option>
          <option value="cancelled">cancelled</option>
        </Select>
        <Input
          type="number"
          min={1}
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value))}
        />
      </Card>
      {orders.isLoading ? <Skeleton className="h-64" /> : null}
      {orders.isError ? <Card className="text-red-700">{getApiErrorMessage(orders.error)}</Card> : null}
      {orders.data?.length === 0 ? <EmptyState title="Заказы не найдены" /> : null}
      {orders.data?.length ? (
        <Card>
          <Table>
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 p-3">Статус</th>
                <th className="border-b border-slate-200 p-3">Водитель</th>
                <th className="border-b border-slate-200 p-3">Сумма</th>
                <th className="border-b border-slate-200 p-3">Создан</th>
                <th className="border-b border-slate-200 p-3">Завершен</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 p-3">
                    <Badge variant={statusVariant(order.status)}>{order.status}</Badge>
                  </td>
                  <td className="border-b border-slate-100 p-3">{order.driver_name ?? order.driver_id ?? '—'}</td>
                  <td className="border-b border-slate-100 p-3">{formatMoneyCents(order.total_price ?? order.price)}</td>
                  <td className="border-b border-slate-100 p-3">{formatDate(order.created_at)}</td>
                  <td className="border-b border-slate-100 p-3">{formatDate(order.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}
    </div>
  )
}
