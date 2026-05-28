import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { Textarea } from '../../shared/ui/Textarea'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents, rublesToCents } from '../../shared/utils/format-money'
import {
  cancelTaxiParkOrder,
  completeTaxiParkOrder,
  getTaxiParkOrder,
  type TaxiParkOrder,
  updateTaxiParkOrder,
} from './api'
import { TaxiParkOrderDriverChat } from './TaxiParkOrderDriverChat'

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

export function TaxiParkOrderDetailsModal({
  orderId,
  open,
  onClose,
}: {
  orderId?: string
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const order = useQuery({
    queryKey: ['taxi-park-order', orderId],
    queryFn: () => getTaxiParkOrder(orderId!),
    enabled: open && Boolean(orderId),
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
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

  const data = order.data

  return (
    <Modal title={`Заказ ${orderId ?? ''}`} open={open} onClose={onClose}>
      {order.isLoading ? <Card>Загрузка...</Card> : null}
      {order.isError ? <Card className="text-red-700">{getApiErrorMessage(order.error)}</Card> : null}
      {data ? (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <Info label="Статус" value={<Badge variant={statusVariant(data.status)}>{statusLabel(data.status)}</Badge>} />
            <Info label="Водитель" value={data.driver_name ?? data.driver_id ?? '-'} />
            <Info label="Телефон пассажира" value={data.passenger_phone ?? '-'} />
            <Info label="Цена" value={formatMoneyCents(data.gross_amount ?? data.total_price ?? data.price)} />
            <Info label="Создан" value={formatDate(data.created_at)} />
            <Info label="Завершен" value={formatDate(data.completed_at)} />
          </div>

          <form className="space-y-3" onSubmit={editForm.handleSubmit((values) => updateMutation.mutate(values))}>
            <h3 className="text-sm font-bold uppercase text-slate-500">Изменить конечную точку</h3>
            <Input {...editForm.register('destination_address')} placeholder="Ленина 50" />
            <div className="grid gap-3 md:grid-cols-2">
              <Input {...editForm.register('destination_latitude')} type="number" step="0.000001" placeholder="56.832216" />
              <Input {...editForm.register('destination_longitude')} type="number" step="0.000001" placeholder="60.614491" />
            </div>
            <Textarea {...editForm.register('comment')} placeholder="Комментарий диспетчера" />
            <Button type="submit" disabled={updateMutation.isPending}>
              Сохранить изменения
            </Button>
          </form>

          <div className="grid gap-4 md:grid-cols-2">
            <form className="space-y-3" onSubmit={cancelForm.handleSubmit((values) => cancelMutation.mutate(values))}>
              <h3 className="text-sm font-bold uppercase text-slate-500">Отмена</h3>
              <Textarea {...cancelForm.register('reason')} />
              <Button type="submit" variant="danger" disabled={cancelMutation.isPending}>
                Отменить заказ
              </Button>
            </form>

            <form className="space-y-3" onSubmit={completeForm.handleSubmit((values) => completeMutation.mutate(values))}>
              <h3 className="text-sm font-bold uppercase text-slate-500">Закрытие</h3>
              <Input {...completeForm.register('final_price_rubles')} type="number" min={0} step="0.01" />
              <Button type="submit" disabled={completeMutation.isPending}>
                Закрыть заказ
              </Button>
            </form>
          </div>

          <TaxiParkOrderDriverChat orderId={data.id} />
        </div>
      ) : null}
    </Modal>
  )
}

function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
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
