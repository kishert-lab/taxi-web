import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Skeleton } from '../../shared/ui/Loader'
import { Select } from '../../shared/ui/Select'
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents } from '../../shared/utils/format-money'
import { getTaxiParkDrivers } from '../taxi-park-drivers/api'
import { getTaxiParkSettings } from '../taxi-park-settings/api'
import { getTariffs } from '../taxi-park-tariffs/api'
import {
  assignTaxiParkScheduledOrderDriver,
  cancelTaxiParkScheduledOrder,
  createTaxiParkOrder,
  createTaxiParkScheduledOrder,
  getTaxiParkOrders,
  getTaxiParkScheduledOrder,
  getTaxiParkScheduledOrders,
  type TaxiParkCreateOrderPayload,
  type TaxiParkCreateScheduledOrderPayload,
  type TaxiParkScheduledOrderStatus,
  updateTaxiParkScheduledOrder,
} from './api'
import { getDriverDisplayName, getOrderRouteLabel } from './order-display'
import { TaxiParkOrderCreateModal } from './TaxiParkOrderCreateModal'
import { TaxiParkScheduledOrderModal } from './TaxiParkScheduledOrderModal'

type OrdersMode = 'current' | 'scheduled'

const scheduledStatuses: TaxiParkScheduledOrderStatus[] = [
  'scheduled_new',
  'scheduled_confirmed',
  'scheduled_driver_assigned',
  'scheduled_waiting_activation',
  'scheduled_activated',
  'scheduled_cancelled',
  'scheduled_expired',
  'scheduled_failed',
]

export function TaxiParkOrdersPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [mode, setMode] = useState<OrdersMode>('current')
  const [status, setStatus] = useState('')
  const [limit, setLimit] = useState(50)
  const [createCurrentOpen, setCreateCurrentOpen] = useState(false)
  const [createScheduledOpen, setCreateScheduledOpen] = useState(false)
  const [selectedScheduledOrderId, setSelectedScheduledOrderId] = useState<string | null>(null)

  const settings = useQuery({
    queryKey: ['taxi-park-settings'],
    queryFn: getTaxiParkSettings,
  })
  const tariffs = useQuery({
    queryKey: ['taxi-park-tariffs'],
    queryFn: getTariffs,
  })
  const drivers = useQuery({
    queryKey: ['taxi-park-drivers'],
    queryFn: () => getTaxiParkDrivers(),
    enabled: mode === 'scheduled' || createScheduledOpen || Boolean(selectedScheduledOrderId),
  })
  const orders = useQuery({
    queryKey: ['taxi-park-orders', status, limit],
    queryFn: () => getTaxiParkOrders({ status: status || undefined, limit }),
    enabled: mode === 'current',
  })
  const scheduledOrders = useQuery({
    queryKey: ['taxi-park-scheduled-orders'],
    queryFn: getTaxiParkScheduledOrders,
    enabled: mode === 'scheduled',
  })
  const selectedScheduledOrder = useQuery({
    queryKey: ['taxi-park-scheduled-order', selectedScheduledOrderId],
    queryFn: () => getTaxiParkScheduledOrder(selectedScheduledOrderId!),
    enabled: Boolean(selectedScheduledOrderId),
  })

  const filteredScheduledOrders = useMemo(() => {
    const items = scheduledOrders.data ?? []
    if (!status) return items
    return items.filter((order) => order.scheduled_status === status)
  }, [scheduledOrders.data, status])

  const createOrderMutation = useMutation({
    mutationFn: createTaxiParkOrder,
    onSuccess: () => {
      toast.success('Заказ создан')
      setCreateCurrentOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-orders'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const createScheduledMutation = useMutation({
    mutationFn: createTaxiParkScheduledOrder,
    onSuccess: () => {
      toast.success('Предварительный заказ создан')
      setCreateScheduledOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-scheduled-orders'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const updateScheduledMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateTaxiParkScheduledOrder>[1]) =>
      updateTaxiParkScheduledOrder(selectedScheduledOrderId!, payload),
    onSuccess: (data) => {
      toast.success('Предварительный заказ сохранен')
      queryClient.setQueryData(['taxi-park-scheduled-order', data.id], data)
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-scheduled-orders'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const assignScheduledMutation = useMutation({
    mutationFn: (driverId: string) =>
      assignTaxiParkScheduledOrderDriver(selectedScheduledOrderId!, { driver_id: driverId }),
    onSuccess: (data) => {
      toast.success('Водитель назначен')
      queryClient.setQueryData(['taxi-park-scheduled-order', data.id], data)
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-scheduled-orders'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const cancelScheduledMutation = useMutation({
    mutationFn: (reason: string) =>
      cancelTaxiParkScheduledOrder(selectedScheduledOrderId!, { reason }),
    onSuccess: (data) => {
      toast.success('Предварительный заказ отменен')
      queryClient.setQueryData(['taxi-park-scheduled-order', data.id], data)
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-scheduled-orders'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  function switchMode(nextMode: OrdersMode) {
    setMode(nextMode)
    setStatus('')
  }

  function submitCurrentOrder(payload: TaxiParkCreateOrderPayload) {
    createOrderMutation.mutate(payload)
  }

  function submitScheduledOrder(payload: TaxiParkCreateScheduledOrderPayload) {
    createScheduledMutation.mutate(payload)
  }

  const loading = mode === 'current' ? orders.isLoading : scheduledOrders.isLoading
  const error = mode === 'current' ? orders.error : scheduledOrders.error
  const hasError = mode === 'current' ? orders.isError : scheduledOrders.isError

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-950">Заказы</h2>
          <p className="text-sm text-slate-500">
            Текущие и предварительные заказы таксопарка.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:shrink-0">
          <div className="flex rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:min-w-[320px]">
            <Button
              type="button"
              variant={mode === 'current' ? 'primary' : 'ghost'}
              className="flex-1"
              onClick={() => switchMode('current')}
            >
              Текущие
            </Button>
            <Button
              type="button"
              variant={mode === 'scheduled' ? 'primary' : 'ghost'}
              className="flex-1"
              onClick={() => switchMode('scheduled')}
            >
              Предварительные
            </Button>
          </div>

          <Button
            type="button"
            className="sm:whitespace-nowrap"
            onClick={() =>
              mode === 'current' ? setCreateCurrentOpen(true) : setCreateScheduledOpen(true)
            }
          >
            {mode === 'current' ? 'Создать заказ' : 'Создать предварительный'}
          </Button>
        </div>
      </Card>

      <Card
        className={
          mode === 'current'
            ? 'grid gap-3 md:grid-cols-[220px_140px] md:items-end'
            : 'grid gap-3 md:grid-cols-[220px] md:items-end'
        }
      >
        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">
            {mode === 'current' ? 'Все статусы' : 'Все предварительные статусы'}
          </option>
          {mode === 'current' ? (
            <>
              <option value="created">{statusLabel('created')}</option>
              <option value="assigned">{statusLabel('assigned')}</option>
              <option value="driver_arriving">{statusLabel('driver_arriving')}</option>
              <option value="driver_waiting">{statusLabel('driver_waiting')}</option>
              <option value="trip_started">{statusLabel('trip_started')}</option>
              <option value="completed">{statusLabel('completed')}</option>
              <option value="cancelled">{statusLabel('cancelled')}</option>
            </>
          ) : (
            scheduledStatuses.map((scheduledStatus) => (
              <option key={scheduledStatus} value={scheduledStatus}>
                {statusLabel(scheduledStatus)}
              </option>
            ))
          )}
        </Select>

        {mode === 'current' ? (
          <input
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#F59E0B] focus:ring-4 focus:ring-amber-100"
            type="number"
            min={1}
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
          />
        ) : null}
      </Card>

      {loading ? <Skeleton className="h-64" /> : null}
      {hasError ? <Card className="text-red-700">{getApiErrorMessage(error)}</Card> : null}

      {mode === 'current' && orders.data?.length === 0 ? (
        <EmptyState title="Заказы не найдены" />
      ) : null}
      {mode === 'scheduled' && filteredScheduledOrders.length === 0 && !scheduledOrders.isLoading ? (
        <EmptyState title="Предварительные заказы не найдены" />
      ) : null}

      {mode === 'current' && orders.data?.length ? (
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
                    <div className="text-xs text-slate-500">
                      {order.passenger_phone ?? 'пассажир не указан'}
                    </div>
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

      {mode === 'scheduled' && filteredScheduledOrders.length ? (
        <Card>
          <Table>
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 p-3">Маршрут</th>
                <th className="border-b border-slate-200 p-3">Статус</th>
                <th className="border-b border-slate-200 p-3">Пассажир</th>
                <th className="border-b border-slate-200 p-3">Водитель</th>
                <th className="border-b border-slate-200 p-3">Запланирован</th>
                <th className="border-b border-slate-200 p-3">Активация</th>
              </tr>
            </thead>
            <tbody>
              {filteredScheduledOrders.map((order) => {
                const driverName =
                  drivers.data?.find(
                    (driver) =>
                      driver.id === order.driver_id || driver.id === order.preassigned_driver_id,
                  )?.full_name ?? undefined

                return (
                  <tr
                    key={order.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelectedScheduledOrderId(order.id)}
                  >
                    <td className="border-b border-slate-100 p-3">
                      <div className="font-semibold text-slate-900">{getOrderRouteLabel(order)}</div>
                      <div className="text-xs text-slate-500">
                        {order.passenger_name || order.passenger_phone || 'пассажир не указан'}
                      </div>
                    </td>
                    <td className="border-b border-slate-100 p-3">
                      <Badge variant={statusVariant(order.scheduled_status)}>
                        {statusLabel(order.scheduled_status)}
                      </Badge>
                    </td>
                    <td className="border-b border-slate-100 p-3">{order.passenger_phone ?? '-'}</td>
                    <td className="border-b border-slate-100 p-3">
                      {getDriverDisplayName(order, driverName)}
                    </td>
                    <td className="border-b border-slate-100 p-3">{formatDate(order.scheduled_at)}</td>
                    <td className="border-b border-slate-100 p-3">
                      {formatDate(order.activation_at ?? order.activated_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card>
      ) : null}

      <TaxiParkOrderCreateModal
        open={createCurrentOpen}
        isSaving={createOrderMutation.isPending}
        onClose={() => setCreateCurrentOpen(false)}
        onSubmit={submitCurrentOrder}
      />

      <TaxiParkScheduledOrderModal
        open={createScheduledOpen}
        mode="create"
        cityId={settings.data?.city_id}
        cityCenter={settings.data?.city?.center}
        tariffs={tariffs.data ?? []}
        drivers={drivers.data ?? []}
        isSaving={createScheduledMutation.isPending}
        onClose={() => setCreateScheduledOpen(false)}
        onCreate={submitScheduledOrder}
        onUpdate={() => undefined}
        onAssignDriver={() => undefined}
        onCancelOrder={() => undefined}
      />

      <TaxiParkScheduledOrderModal
        open={Boolean(selectedScheduledOrderId)}
        mode="edit"
        order={selectedScheduledOrder.data}
        cityId={settings.data?.city_id}
        cityCenter={settings.data?.city?.center}
        tariffs={tariffs.data ?? []}
        drivers={drivers.data ?? []}
        isSaving={updateScheduledMutation.isPending || selectedScheduledOrder.isLoading}
        isAssigning={assignScheduledMutation.isPending}
        isCancelling={cancelScheduledMutation.isPending}
        onClose={() => setSelectedScheduledOrderId(null)}
        onCreate={() => undefined}
        onUpdate={(payload) => updateScheduledMutation.mutate(payload)}
        onAssignDriver={(driverId) => assignScheduledMutation.mutate(driverId)}
        onCancelOrder={(reason) => cancelScheduledMutation.mutate(reason)}
      />
    </div>
  )
}
