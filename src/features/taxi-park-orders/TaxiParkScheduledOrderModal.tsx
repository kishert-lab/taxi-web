import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { Select } from '../../shared/ui/Select'
import { Textarea } from '../../shared/ui/Textarea'
import { formatDate } from '../../shared/utils/format-date'
import { AddressSearchInput } from '../geocoder/AddressSearchInput'
import type { TaxiParkDriver } from '../taxi-park-drivers/api'
import { OrderLocationMap } from './OrderLocationMap'
import type {
  TaxiParkCreateScheduledOrderPayload,
  TaxiParkPaymentType,
  TaxiParkScheduledOrder,
  TaxiParkUpdateScheduledOrderPayload,
} from './api'

const schema = z.object({
  passenger_name: z.string().optional(),
  passenger_phone: z.string().optional(),
  tariff_id: z.string().min(1, 'Выберите тариф'),
  pickup_address: z.string().min(3, 'Укажите адрес подачи'),
  pickup_latitude: z.coerce.number().min(-90).max(90),
  pickup_longitude: z.coerce.number().min(-180).max(180),
  destination_address: z.string().min(3, 'Укажите адрес назначения'),
  destination_latitude: z.coerce.number().min(-90).max(90),
  destination_longitude: z.coerce.number().min(-180).max(180),
  payment_type: z.enum(['cash', 'card', 'corporate']),
  scheduled_at: z.string().min(1, 'Укажите дату и время'),
  preassigned_driver_id: z.string().optional(),
  comment: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

type TariffOption = {
  id: string
  name: string
}

type TaxiParkScheduledOrderModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  order?: TaxiParkScheduledOrder
  cityId?: string
  cityCenter?: { latitude: number; longitude: number }
  tariffs: TariffOption[]
  drivers: TaxiParkDriver[]
  isSaving?: boolean
  isAssigning?: boolean
  isCancelling?: boolean
  onClose: () => void
  onCreate: (payload: TaxiParkCreateScheduledOrderPayload) => void
  onUpdate: (payload: TaxiParkUpdateScheduledOrderPayload) => void
  onAssignDriver: (driverId: string) => void
  onCancelOrder: (reason: string) => void
}

export function TaxiParkScheduledOrderModal({
  open,
  mode,
  order,
  cityId,
  cityCenter,
  tariffs,
  drivers,
  isSaving,
  isAssigning,
  isCancelling,
  onClose,
  onCreate,
  onUpdate,
  onAssignDriver,
  onCancelOrder,
}: TaxiParkScheduledOrderModalProps) {
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(),
  })
  const cancelForm = useForm<{ reason: string }>({
    defaultValues: {
      reason: 'Отменено диспетчером',
    },
  })

  const [
    pickupAddress,
    destinationAddress,
    pickupLatitude,
    pickupLongitude,
    destinationLatitude,
    destinationLongitude,
    selectedDriverId,
  ] = useWatch({
    control: form.control,
    name: [
      'pickup_address',
      'destination_address',
      'pickup_latitude',
      'pickup_longitude',
      'destination_latitude',
      'destination_longitude',
      'preassigned_driver_id',
    ],
  })

  useEffect(() => {
    if (!open) return

    if (mode === 'edit' && order) {
      form.reset(buildDefaultValues(order))
      cancelForm.reset({
        reason: order.scheduled_cancel_reason ?? 'Отменено диспетчером',
      })
      return
    }

    form.reset(buildDefaultValues())
    cancelForm.reset({ reason: 'Отменено диспетчером' })
  }, [cancelForm, form, mode, open, order])

  const firstError = Object.values(form.formState.errors)[0]?.message
  const currentDriverName = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId)?.full_name,
    [drivers, selectedDriverId],
  )
  const cancelReason = useWatch({
    control: cancelForm.control,
    name: 'reason',
  })

  function submit(values: FormValues) {
    const payload = {
      tariff_id: values.tariff_id,
      passenger_name: normalizeString(values.passenger_name),
      passenger_phone: normalizeString(values.passenger_phone),
      pickup_address: values.pickup_address.trim(),
      pickup_location: {
        latitude: values.pickup_latitude,
        longitude: values.pickup_longitude,
      },
      destination_address: values.destination_address.trim(),
      destination_location: {
        latitude: values.destination_latitude,
        longitude: values.destination_longitude,
      },
      payment_type: values.payment_type,
      comment: normalizeString(values.comment),
      scheduled_at: formatDateTimeWithOffset(values.scheduled_at),
      timezone: getCurrentTimezone(),
      preassigned_driver_id: normalizeString(values.preassigned_driver_id),
    }

    if (mode === 'edit') {
      onUpdate(payload)
      return
    }

    onCreate(payload)
  }

  return (
    <Modal
      title={mode === 'edit' ? 'Предварительный заказ' : 'Создание предварительного заказа'}
      open={open}
      onClose={onClose}
    >
      <div className="space-y-5">
        {mode === 'edit' && order ? (
          <Card className="grid gap-3 md:grid-cols-3">
            <Info label="Статус">
              <Badge variant={statusVariant(order.scheduled_status)}>
                {statusLabel(order.scheduled_status)}
              </Badge>
            </Info>
            <Info label="Запланирован">
              {formatDate(order.scheduled_at)}
            </Info>
            <Info label="Активация">
              {formatDate(order.activation_at ?? order.activated_at)}
            </Info>
          </Card>
        ) : null}

        <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
          <section className="grid gap-4 md:grid-cols-2">
            <Field label="Имя пассажира">
              <Input {...form.register('passenger_name')} placeholder="Иван" />
            </Field>
            <Field label="Телефон пассажира">
              <Input {...form.register('passenger_phone')} placeholder="+79990000000" />
            </Field>
            <Field label="Тариф" error={form.formState.errors.tariff_id?.message}>
              <Select {...form.register('tariff_id')}>
                <option value="">Выберите тариф</option>
                {tariffs.map((tariff) => (
                  <option key={tariff.id} value={tariff.id}>
                    {tariff.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Оплата">
              <Select {...form.register('payment_type')}>
                <option value="cash">Наличные</option>
                <option value="card">Карта</option>
                <option value="corporate">Корпоративная</option>
              </Select>
            </Field>
            <Field label="Дата и время" error={form.formState.errors.scheduled_at?.message}>
              <Input {...form.register('scheduled_at')} type="datetime-local" />
            </Field>
            <Field label="Предназначенный водитель">
              <Select {...form.register('preassigned_driver_id')}>
                <option value="">Без водителя</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name} {driver.phone ? `· ${driver.phone}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
          </section>

          <OrderLocationMap
            pickup={{
              latitude: getNumericCoordinate(pickupLatitude),
              longitude: getNumericCoordinate(pickupLongitude),
            }}
            destination={{
              latitude: getNumericCoordinate(destinationLatitude),
              longitude: getNumericCoordinate(destinationLongitude),
            }}
            onPickupChange={(point) => {
              form.setValue('pickup_latitude', point.latitude, {
                shouldDirty: true,
                shouldValidate: true,
              })
              form.setValue('pickup_longitude', point.longitude, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
            onDestinationChange={(point) => {
              form.setValue('destination_latitude', point.latitude, {
                shouldDirty: true,
                shouldValidate: true,
              })
              form.setValue('destination_longitude', point.longitude, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
            defaultCenter={cityCenter}
          />

          <section className="grid gap-4 md:grid-cols-2">
            <Field label="Адрес подачи" error={form.formState.errors.pickup_address?.message}>
              <AddressSearchInput
                value={pickupAddress ?? ''}
                cityId={cityId}
                placeholder="Ленина 1"
                error={coordinateError(
                  form.formState.errors.pickup_latitude?.message,
                  form.formState.errors.pickup_longitude?.message,
                )}
                onAddressChange={(value) => {
                  form.setValue('pickup_address', value, { shouldDirty: true, shouldValidate: true })
                }}
                onSelectPoint={(point) => {
                  form.setValue('pickup_address', point.address, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  form.setValue('pickup_latitude', point.location.latitude, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  form.setValue('pickup_longitude', point.location.longitude, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }}
              />
            </Field>
            <Field
              label="Адрес назначения"
              error={form.formState.errors.destination_address?.message}
            >
              <AddressSearchInput
                value={destinationAddress ?? ''}
                cityId={cityId}
                placeholder="Мира 10"
                error={coordinateError(
                  form.formState.errors.destination_latitude?.message,
                  form.formState.errors.destination_longitude?.message,
                )}
                onAddressChange={(value) => {
                  form.setValue('destination_address', value, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }}
                onSelectPoint={(point) => {
                  form.setValue('destination_address', point.address, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  form.setValue('destination_latitude', point.location.latitude, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                  form.setValue('destination_longitude', point.location.longitude, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }}
              />
            </Field>
          </section>

          <p className="text-xs text-slate-500">
            Адрес можно ввести вручную. Если геокодер найдет адрес, точка поставится на карте
            автоматически. Если не найдет, выберите точку на карте вручную.
          </p>

          <Field label="Комментарий">
            <Textarea
              {...form.register('comment')}
              placeholder="Позвонить заранее, подъезд, ориентир"
            />
          </Field>

          {firstError ? <p className="text-sm font-medium text-red-600">{String(firstError)}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving
                ? mode === 'edit'
                  ? 'Сохранение...'
                  : 'Создание...'
                : mode === 'edit'
                  ? 'Сохранить'
                  : 'Создать предварительный заказ'}
            </Button>
          </div>
        </form>

        {mode === 'edit' && order ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="space-y-3">
              <h3 className="text-base font-bold text-slate-950">Назначение водителя</h3>
              <p className="text-sm text-slate-500">
                {currentDriverName
                  ? `Будет назначен: ${currentDriverName}`
                  : 'Выберите водителя в форме выше и сохраните либо назначьте отдельно.'}
              </p>
              <Button
                type="button"
                variant="secondary"
                disabled={!selectedDriverId || isAssigning}
                onClick={() => selectedDriverId && onAssignDriver(selectedDriverId)}
              >
                {isAssigning ? 'Назначение...' : 'Назначить водителя'}
              </Button>
            </Card>

            <Card className="space-y-3">
              <h3 className="text-base font-bold text-slate-950">Отмена заказа</h3>
              <Textarea {...cancelForm.register('reason')} placeholder="Причина отмены" />
              <Button
                type="button"
                variant="danger"
                disabled={!cancelReason.trim() || isCancelling}
                onClick={() => onCancelOrder(cancelReason.trim())}
              >
                {isCancelling ? 'Отмена...' : 'Отменить заказ'}
              </Button>
            </Card>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  )
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <div className="mt-1 text-sm font-semibold text-slate-800">{children}</div>
    </div>
  )
}

function buildDefaultValues(order?: TaxiParkScheduledOrder): FormInput {
  return {
    passenger_name: order?.passenger_name ?? '',
    passenger_phone: order?.passenger_phone ?? '',
    tariff_id: order?.tariff_id ?? '',
    pickup_address: order?.pickup_address ?? '',
    pickup_latitude: order?.pickup_location?.latitude ?? '',
    pickup_longitude: order?.pickup_location?.longitude ?? '',
    destination_address: order?.destination_address ?? '',
    destination_latitude: order?.destination_location?.latitude ?? '',
    destination_longitude: order?.destination_location?.longitude ?? '',
    payment_type: (order?.payment_type ?? order?.payment_method ?? 'cash') as TaxiParkPaymentType,
    scheduled_at: toDateTimeLocalValue(order?.scheduled_at),
    preassigned_driver_id: order?.preassigned_driver_id ?? '',
    comment: order?.comment ?? '',
  }
}

function normalizeString(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function coordinateError(latitudeError?: string, longitudeError?: string) {
  return latitudeError || longitudeError
    ? 'Укажите точку на карте или выберите найденный адрес'
    : undefined
}

function getNumericCoordinate(value: unknown) {
  if (value === '' || value === undefined || value === null) return undefined
  const coordinate = Number(value)
  return Number.isFinite(coordinate) ? coordinate : undefined
}

function toDateTimeLocalValue(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function formatDateTimeWithOffset(value: string) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = '00'
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absolute = Math.abs(offsetMinutes)
  const offsetHours = pad(Math.floor(absolute / 60))
  const offsetMins = pad(absolute % 60)

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMins}`
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function getCurrentTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}
