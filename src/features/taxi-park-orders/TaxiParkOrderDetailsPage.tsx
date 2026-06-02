import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link, useParams } from 'react-router-dom'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Skeleton } from '../../shared/ui/Loader'
import { Textarea } from '../../shared/ui/Textarea'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents, rublesToCents } from '../../shared/utils/format-money'
import { AddressSearchInput } from '../geocoder/AddressSearchInput'
import { getTaxiParkSettings } from '../taxi-park-settings/api'
import {
  cancelTaxiParkOrder,
  completeTaxiParkOrder,
  getTaxiParkOrder,
  type TaxiParkOrder,
  updateTaxiParkOrder,
} from './api'
import { TaxiParkOrderDriverChat } from './TaxiParkOrderDriverChat'
import { TaxiParkOrderMap } from './TaxiParkOrderMap'

const editSchema = z.object({
  destination_address: z.string().min(3, 'Укажите конечный адрес'),
  destination_latitude: z.coerce.number().min(-90).max(90),
  destination_longitude: z.coerce.number().min(-180).max(180),
  comment: z.string().optional(),
})

const cancelSchema = z.object({
  reason: z.string().min(3, 'Укажите причину отмены'),
})

const completeSchema = z.object({
  final_price_rubles: z.coerce.number().min(0, 'Цена не может быть отрицательной'),
})

type EditValues = z.input<typeof editSchema>
type EditSubmitValues = z.output<typeof editSchema>
type CancelValues = z.infer<typeof cancelSchema>
type CompleteValues = z.input<typeof completeSchema>
type CompleteSubmitValues = z.output<typeof completeSchema>

export function TaxiParkOrderDetailsPage() {
  const { orderId } = useParams()
  const queryClient = useQueryClient()
  const order = useQuery({
    queryKey: ['taxi-park-order', orderId],
    queryFn: () => getTaxiParkOrder(orderId!),
    enabled: Boolean(orderId),
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
  const settings = useQuery({
    queryKey: ['taxi-park-settings'],
    queryFn: getTaxiParkSettings,
  })
  const editForm = useForm<EditValues, unknown, EditSubmitValues>({
    resolver: zodResolver(editSchema),
  })
  const cancelForm = useForm<CancelValues>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { reason: 'Отменено диспетчером' },
  })
  const completeForm = useForm<CompleteValues, unknown, CompleteSubmitValues>({
    resolver: zodResolver(completeSchema),
  })
  const destinationAddress = useWatch({
    control: editForm.control,
    name: 'destination_address',
  })

  useEffect(() => {
    if (!order.data) return
    const destination = order.data.destination_location ?? order.data.destination_point
    editForm.reset({
      destination_address: order.data.destination_address ?? '',
      destination_latitude: destination?.latitude ?? '',
      destination_longitude: destination?.longitude ?? '',
      comment: order.data.comment ?? '',
    })
    completeForm.reset({
      final_price_rubles: getOrderPriceCents(order.data) / 100,
    })
  }, [completeForm, editForm, order.data])

  const refreshOrder = (data: TaxiParkOrder) => {
    queryClient.setQueryData(['taxi-park-order', data.id], data)
    void queryClient.invalidateQueries({ queryKey: ['taxi-park-orders'] })
  }

  const updateMutation = useMutation({
    mutationFn: (values: EditSubmitValues) =>
      updateTaxiParkOrder(orderId!, {
        destination_address: values.destination_address,
        destination_location: {
          latitude: values.destination_latitude,
          longitude: values.destination_longitude,
        },
        comment: values.comment,
      }),
    onSuccess: (data) => {
      toast.success('Заказ обновлен')
      refreshOrder(data)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const cancelMutation = useMutation({
    mutationFn: (values: CancelValues) => cancelTaxiParkOrder(orderId!, values),
    onSuccess: (data) => {
      toast.success('Заказ отменен')
      refreshOrder(data)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const completeMutation = useMutation({
    mutationFn: (values: CompleteSubmitValues) =>
      completeTaxiParkOrder(orderId!, {
        final_price: rublesToCents(values.final_price_rubles),
        currency: 'RUB',
      }),
    onSuccess: (data) => {
      toast.success('Заказ закрыт')
      refreshOrder(data)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (order.isLoading) return <Skeleton className="h-96" />
  if (order.isError) return <Card className="text-red-700">{getApiErrorMessage(order.error)}</Card>
  if (!order.data || !orderId) return null

  const data = order.data

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link className="text-sm font-semibold text-amber-700" to="/taxi-park/orders">
            Назад к заказам
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-950">Заказ {data.id}</h1>
        </div>
        <Badge variant={statusVariant(data.status)}>{statusLabel(data.status)}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <TaxiParkOrderMap order={data} />
          <TaxiParkOrderDriverChat orderId={data.id} />
        </div>

        <div className="space-y-4">
          <Card className="space-y-3">
            <h2 className="text-lg font-bold text-slate-950">Информация</h2>
            <Info label="Статус" value={statusLabel(data.status)} />
            <Info label="Водитель" value={data.driver_name ?? data.driver_id ?? '-'} />
            <Info label="Телефон пассажира" value={data.passenger_phone ?? '-'} />
            <Info label="Подача" value={data.pickup_address ?? '-'} />
            <Info label="Куда" value={data.destination_address ?? '-'} />
            <Info label="Цена" value={formatMoneyCents(data.gross_amount ?? data.total_price ?? data.price)} />
            <Info label="Создан" value={formatDate(data.created_at)} />
            <Info label="Завершен" value={formatDate(data.completed_at)} />
          </Card>

          <Card>
            <form className="space-y-3" onSubmit={editForm.handleSubmit((values) => updateMutation.mutate(values))}>
              <h2 className="text-lg font-bold text-slate-950">Изменить конечную точку</h2>
              <AddressSearchInput
                value={destinationAddress ?? ''}
                cityId={settings.data?.city_id}
                placeholder="Ленина 50"
                error={
                  editForm.formState.errors.destination_latitude?.message ||
                  editForm.formState.errors.destination_longitude?.message
                    ? 'Выберите адрес из подсказки'
                    : editForm.formState.errors.destination_address?.message
                }
                onAddressChange={(value) => {
                  editForm.setValue('destination_address', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  editForm.setValue('destination_latitude', undefined, { shouldDirty: true })
                  editForm.setValue('destination_longitude', undefined, { shouldDirty: true })
                }}
                onSelectPoint={(point) => {
                  editForm.setValue('destination_address', point.address, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  editForm.setValue('destination_latitude', point.location.latitude, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  editForm.setValue('destination_longitude', point.location.longitude, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }}
              />
              <Textarea {...editForm.register('comment')} placeholder="Комментарий диспетчера" />
              <Button type="submit" disabled={updateMutation.isPending}>
                Сохранить
              </Button>
            </form>
          </Card>

          <Card className="grid gap-4">
            <form className="space-y-3" onSubmit={cancelForm.handleSubmit((values) => cancelMutation.mutate(values))}>
              <h2 className="text-lg font-bold text-slate-950">Отмена</h2>
              <Textarea {...cancelForm.register('reason')} />
              <Button type="submit" variant="danger" disabled={cancelMutation.isPending}>
                Отменить заказ
              </Button>
            </form>

            <form className="space-y-3" onSubmit={completeForm.handleSubmit((values) => completeMutation.mutate(values))}>
              <h2 className="text-lg font-bold text-slate-950">Закрытие</h2>
              <Input {...completeForm.register('final_price_rubles')} type="number" min={0} step="0.01" />
              <Button type="submit" disabled={completeMutation.isPending}>
                Закрыть заказ
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  )
}

function getOrderPriceCents(order: TaxiParkOrder) {
  return (
    order.gross_amount?.amount_cents ??
    order.total_price?.amount_cents ??
    order.price?.amount_cents ??
    0
  )
}
