import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Skeleton } from '../../shared/ui/Loader'
import { Select } from '../../shared/ui/Select'
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents } from '../../shared/utils/format-money'
import { createTaxiParkOrder, getTaxiParkOrders } from './api'
import { getDriverDisplayName, getOrderRouteLabel } from './order-display'
import { TaxiParkOrderCreateModal } from './TaxiParkOrderCreateModal'

export function TaxiParkOrdersPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(50)
  const [createOpen, setCreateOpen] = useState(false)
  const orders = useQuery({
    queryKey: ['taxi-park-orders', status, limit],
    queryFn: () => getTaxiParkOrders({ status: status || undefined, limit }),
  })
  const createMutation = useMutation({
    mutationFn: createTaxiParkOrder,
    onSuccess: () => {
      toast.success('Заказ создан')
      setCreateOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-orders'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 md:grid-cols-[1fr_220px_140px_auto] md:items-end">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Заказы</h2>
          <p className="text-sm text-slate-500">Фильтрация по статусу и лимиту</p>
        </div>
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Все статусы</option>
          <option value="created">{statusLabel('created')}</option>
          <option value="assigned">{statusLabel('assigned')}</option>
          <option value="driver_arriving">{statusLabel('driver_arriving')}</option>
          <option value="driver_waiting">{statusLabel('driver_waiting')}</option>
          <option value="trip_started">{statusLabel('trip_started')}</option>
          <option value="completed">{statusLabel('completed')}</option>
          <option value="cancelled">{statusLabel('cancelled')}</option>
        </Select>
        <Input
          type="number"
          min={1}
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value))}
        />
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Создать заказ
        </Button>
      </Card>

      {orders.isLoading ? <Skeleton className="h-64" /> : null}
      {orders.isError ? <Card className="text-red-700">{getApiErrorMessage(orders.error)}</Card> : null}
      {orders.data?.length === 0 ? <EmptyState title="Заказы не найдены" /> : null}

      {orders.data?.length ? (
        <Card>
          <Table>
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 p-3">Заказ</th>
                <th className="border-b border-slate-200 p-3">Статус</th>
                <th className="border-b border-slate-200 p-3">Водитель</th>
                <th className="border-b border-slate-200 p-3">Сумма</th>
                <th className="border-b border-slate-200 p-3">Создан</th>
                <th className="border-b border-slate-200 p-3">Завершен</th>
              </tr>
            </thead>
            <tbody>
              {orders.data.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => navigate(`/taxi-park/orders/${order.id}`)}
                >
                  <td className="border-b border-slate-100 p-3">
                    <div className="font-semibold text-slate-900">{getOrderRouteLabel(order)}</div>
                    <div className="text-xs text-slate-500">{order.passenger_phone ?? 'пассажир не указан'}</div>
                  </td>
                  <td className="border-b border-slate-100 p-3">
                    <Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
                  </td>
                  <td className="border-b border-slate-100 p-3">{getDriverDisplayName(order)}</td>
                  <td className="border-b border-slate-100 p-3">
                    {formatMoneyCents(order.gross_amount ?? order.total_price ?? order.price)}
                  </td>
                  <td className="border-b border-slate-100 p-3">{formatDate(order.created_at)}</td>
                  <td className="border-b border-slate-100 p-3">{formatDate(order.completed_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      <TaxiParkOrderCreateModal
        open={createOpen}
        isSaving={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />
    </div>
  )
}
