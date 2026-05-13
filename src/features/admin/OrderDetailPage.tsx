import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useParams } from 'react-router-dom'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card, StatCard } from '../../shared/ui/Card'
import { Loader } from '../../shared/ui/Loader'
import { Select } from '../../shared/ui/Select'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents } from '../../shared/utils/format-money'
import { adminApi } from './api'

export function OrderDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()
  const order = useQuery({ queryKey: ['admin-order', id], queryFn: () => adminApi.order(id) })
  const drivers = useQuery({ queryKey: ['admin-drivers'], queryFn: adminApi.drivers })
  const mutation = useMutation({
    mutationFn: (driverId: string) => adminApi.assignDriver(id, driverId),
    onSuccess: () => {
      toast.success('Водитель назначен')
      void queryClient.invalidateQueries({ queryKey: ['admin-order', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (order.isLoading) return <Loader />
  if (order.isError) return <Card className="text-red-700">{getApiErrorMessage(order.error)}</Card>
  if (!order.data) return null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Статус" value={order.data.status} />
        <StatCard title="Сумма" value={formatMoneyCents(order.data.price)} />
        <StatCard title="Комиссия" value={formatMoneyCents(order.data.platform_commission)} />
        <StatCard title="Создан" value={formatDate(order.data.created_at)} />
      </div>
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2 text-sm">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">Заказ {order.data.id}</h2>
            <p><b>Пассажир:</b> {order.data.passenger_name}, {order.data.passenger_phone}</p>
            <p><b>Маршрут:</b> {order.data.pickup_address} → {order.data.destination_address}</p>
            <p><b>Город:</b> {order.data.city_name}</p>
            <p><b>Тариф:</b> {order.data.tariff_name}</p>
            <p><b>Водитель:</b> {order.data.driver_name ?? 'не назначен'}</p>
            <Badge variant={statusVariant(order.data.status)}>{order.data.status}</Badge>
          </div>
          <form
            className="flex min-w-72 gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              mutation.mutate(String(form.get('driver_id')))
            }}
          >
            <Select name="driver_id" disabled={drivers.isLoading}>
              {(drivers.data ?? []).map((driver) => (
                <option key={driver.id} value={driver.id}>{driver.full_name}</option>
              ))}
            </Select>
            <Button type="submit" disabled={mutation.isPending}>Назначить</Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
