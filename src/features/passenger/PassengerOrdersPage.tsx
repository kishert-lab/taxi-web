import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Skeleton } from '../../shared/ui/Loader'
import { Modal } from '../../shared/ui/Modal'
import { EmptyState, Table } from '../../shared/ui/Table'
import { Textarea } from '../../shared/ui/Textarea'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyAmount } from '../../shared/utils/format-money'
import { getTariffs } from '../taxi-park-tariffs/api'
import {
  cancelPassengerOrder,
  createPassengerOrder,
  getCurrentPassengerOrder,
  getPassengerDriverChatMessages,
  getPassengerOrderHistory,
  getPassengerProfile,
  ratePassengerOrder,
  sendPassengerDriverChatMessage,
  type PassengerOrder,
} from './api'
import { PassengerOrderCreateModal } from './PassengerOrderCreateModal'

const ratingSchema = z.object({
  score: z.coerce.number().int().min(1, 'Оценка от 1 до 5').max(5, 'Оценка от 1 до 5'),
  comment: z.string().optional(),
})

type RatingFormInput = z.input<typeof ratingSchema>
type RatingFormValues = z.output<typeof ratingSchema>

export function PassengerOrdersPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('Изменились планы')
  const [driverMessage, setDriverMessage] = useState('')
  const [ratingOrder, setRatingOrder] = useState<PassengerOrder | null>(null)

  const profile = useQuery({
    queryKey: ['passenger-profile'],
    queryFn: getPassengerProfile,
  })

  const currentOrder = useQuery({
    queryKey: ['passenger-current-order'],
    queryFn: getCurrentPassengerOrder,
  })

  const history = useQuery({
    queryKey: ['passenger-order-history'],
    queryFn: getPassengerOrderHistory,
  })

  const chat = useQuery({
    queryKey: ['passenger-driver-chat', currentOrder.data?.id],
    queryFn: () => getPassengerDriverChatMessages(currentOrder.data!.id),
    enabled: Boolean(currentOrder.data?.id),
  })

  const tariffs = useQuery({
    queryKey: ['taxi-park-tariffs'],
    queryFn: async () => {
      try {
        return await getTariffs()
      } catch {
        return []
      }
    },
  })

  const ratingForm = useForm<RatingFormInput, unknown, RatingFormValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: {
      score: 5,
      comment: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: createPassengerOrder,
    onSuccess: () => {
      setCreateOpen(false)
      toast.success('Заказ создан')
      void invalidatePassengerQueries(queryClient)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const cancelMutation = useMutation({
    mutationFn: (orderId: string) =>
      cancelPassengerOrder(orderId, { reason: cancelReason.trim() }),
    onSuccess: () => {
      toast.success('Заказ отменен')
      void invalidatePassengerQueries(queryClient)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const sendMessageMutation = useMutation({
    mutationFn: (orderId: string) =>
      sendPassengerDriverChatMessage(orderId, driverMessage.trim()),
    onSuccess: () => {
      setDriverMessage('')
      void queryClient.invalidateQueries({
        queryKey: ['passenger-driver-chat', currentOrder.data?.id],
      })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const rateMutation = useMutation({
    mutationFn: (values: RatingFormValues) =>
      ratePassengerOrder(ratingOrder!.id, values),
    onSuccess: () => {
      setRatingOrder(null)
      ratingForm.reset({ score: 5, comment: '' })
      toast.success('Оценка отправлена')
      void invalidatePassengerQueries(queryClient)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if ([profile, currentOrder, history].some((query) => query.isLoading)) {
    return <Skeleton className="h-80" />
  }

  const firstError = [profile, currentOrder, history].find((query) => query.isError)
  if (firstError?.error) {
    return <Card className="text-red-700">{getApiErrorMessage(firstError.error)}</Card>
  }

  const activeOrder = currentOrder.data

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Мои заказы</h2>
          <p className="text-sm text-slate-500">
            Текущая поездка, создание нового заказа и история поездок.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Создать заказ
        </Button>
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-950">Текущий заказ</h3>
            <p className="text-sm text-slate-500">
              Статус, водитель и чат по активной поездке.
            </p>
          </div>
          {activeOrder ? (
            <Badge variant={statusVariant(activeOrder.status)}>
              {statusLabel(activeOrder.status)}
            </Badge>
          ) : null}
        </div>

        {activeOrder ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Info label="Маршрут" value={getPassengerRoute(activeOrder)} />
              <Info label="Стоимость" value={formatMoneyAmount(activeOrder.price)} />
              <Info
                label="Водитель"
                value={activeOrder.driver?.name ?? 'Еще не назначен'}
              />
              <Info label="Автомобиль" value={formatCar(activeOrder)} />
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Info label="Телефон водителя" value={activeOrder.driver?.phone ?? '—'} />
              <Info label="ETA" value={formatEta(activeOrder.eta_seconds)} />
              <Info label="Версия" value={String(activeOrder.version ?? '—')} />
              <Info
                label="Последнее событие"
                value={formatDate(
                  activeOrder.timeline[activeOrder.timeline.length - 1]?.created_at,
                )}
              />
            </div>

            {activeOrder.allowed_actions.includes('cancel') ? (
              <div className="flex flex-col gap-2 md:flex-row">
                <Input
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Причина отмены"
                />
                <Button
                  type="button"
                  variant="danger"
                  disabled={!cancelReason.trim() || cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate(activeOrder.id)}
                >
                  Отменить заказ
                </Button>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-slate-950">Чат с водителем</h4>
                  <p className="text-sm text-slate-500">
                    Сообщения по текущему заказу.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {chat.isLoading ? <Skeleton className="h-32" /> : null}
                {chat.isError ? (
                  <div className="text-sm text-red-600">
                    {getApiErrorMessage(chat.error)}
                  </div>
                ) : null}
                {!chat.isLoading && !chat.data?.messages.length ? (
                  <EmptyState title="Сообщений пока нет" />
                ) : null}
                {chat.data?.messages.length ? (
                  <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-3">
                    {chat.data.messages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-2xl border border-slate-200 bg-white p-3"
                      >
                        <div className="text-xs font-semibold uppercase text-slate-400">
                          {message.sender_role ?? 'system'}
                        </div>
                        <div className="mt-1 text-sm text-slate-900">{message.body}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-col gap-2 md:flex-row">
                <Input
                  value={driverMessage}
                  onChange={(event) => setDriverMessage(event.target.value)}
                  placeholder="Сообщение водителю"
                />
                <Button
                  type="button"
                  disabled={
                    !driverMessage.trim() ||
                    sendMessageMutation.isPending ||
                    !activeOrder.id
                  }
                  onClick={() => sendMessageMutation.mutate(activeOrder.id)}
                >
                  Отправить
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState title="Активного заказа нет" />
        )}
      </Card>

      <Card>
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-950">История поездок</h3>
          <p className="text-sm text-slate-500">
            Последние завершенные и отмененные заказы.
          </p>
        </div>

        {history.data?.length ? (
          <Table>
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 p-3">Маршрут</th>
                <th className="border-b border-slate-200 p-3">Статус</th>
                <th className="border-b border-slate-200 p-3">Цена</th>
                <th className="border-b border-slate-200 p-3">Дата</th>
                <th className="border-b border-slate-200 p-3">Действие</th>
              </tr>
            </thead>
            <tbody>
              {history.data.map((order) => {
                const lastEvent = order.timeline[order.timeline.length - 1]
                const canRate = order.allowed_actions.includes('rate')

                return (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 p-3 font-medium">
                      {getPassengerRoute(order)}
                    </td>
                    <td className="border-b border-slate-100 p-3">
                      <Badge variant={statusVariant(order.status)}>
                        {statusLabel(order.status)}
                      </Badge>
                    </td>
                    <td className="border-b border-slate-100 p-3">
                      {formatMoneyAmount(order.price)}
                    </td>
                    <td className="border-b border-slate-100 p-3">
                      {formatDate(lastEvent?.created_at)}
                    </td>
                    <td className="border-b border-slate-100 p-3">
                      {canRate ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setRatingOrder(order)}
                        >
                          Оценить
                        </Button>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState title="История заказов пока пуста" />
        )}
      </Card>

      <PassengerOrderCreateModal
        open={createOpen}
        isSaving={createMutation.isPending}
        tariffs={tariffs.data ?? []}
        defaultPhone={profile.data?.phone}
        onClose={() => setCreateOpen(false)}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />

      <Modal
        title="Оценка поездки"
        open={Boolean(ratingOrder)}
        onClose={() => {
          setRatingOrder(null)
          ratingForm.reset({ score: 5, comment: '' })
        }}
      >
        <form
          className="space-y-4"
          onSubmit={ratingForm.handleSubmit((values) => rateMutation.mutate(values))}
        >
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Оценка</span>
            <Input type="number" min={1} max={5} {...ratingForm.register('score')} />
            {ratingForm.formState.errors.score?.message ? (
              <span className="text-xs font-medium text-red-600">
                {ratingForm.formState.errors.score.message}
              </span>
            ) : null}
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Комментарий</span>
            <Textarea
              {...ratingForm.register('comment')}
              placeholder="Что понравилось или что стоит улучшить"
            />
          </label>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setRatingOrder(null)
                ratingForm.reset({ score: 5, comment: '' })
              }}
            >
              Закрыть
            </Button>
            <Button type="submit" disabled={rateMutation.isPending}>
              Отправить оценку
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function getPassengerRoute(order: PassengerOrder) {
  const pickup =
    order.pickup_address ?? order.pickup_point?.address ?? 'Точка подачи'
  const destination =
    order.destination_address ??
    order.destination_point?.address ??
    'Точка назначения'
  return `${pickup} -> ${destination}`
}

function formatEta(value?: number) {
  if (!value) return '—'
  const minutes = Math.max(1, Math.round(value / 60))
  return `${minutes} мин`
}

function formatCar(order: PassengerOrder) {
  const brand = order.car?.brand?.trim()
  const model = order.car?.model?.trim()
  const plate = order.car?.plate_number?.trim()
  const summary = [brand, model].filter(Boolean).join(' ')
  if (summary && plate) return `${summary}, ${plate}`
  if (summary) return summary
  if (plate) return plate
  return 'Еще не назначен'
}

async function invalidatePassengerQueries(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['passenger-current-order'] }),
    queryClient.invalidateQueries({ queryKey: ['passenger-order-history'] }),
    queryClient.invalidateQueries({ queryKey: ['passenger-profile'] }),
    queryClient.invalidateQueries({ queryKey: ['passenger-driver-chat'] }),
  ])
}
