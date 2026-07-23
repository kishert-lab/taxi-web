import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { Select } from '../../shared/ui/Select'
import { Textarea } from '../../shared/ui/Textarea'
import { formatMoneyAmount } from '../../shared/utils/format-money'
import { OrderLocationMap } from '../taxi-park-orders/OrderLocationMap'
import { getTariffs, type Tariff } from '../taxi-park-tariffs/api'
import {
  estimatePassengerOrder,
  type PassengerAddressPoint,
  type PassengerCreateOrderPayload,
  type PassengerOrderEstimate,
} from './api'
import { PassengerAddressSearchInput } from './PassengerAddressSearchInput'

const schema = z.object({
  tariff_id: z.string().min(1, 'Укажите тариф'),
  city_id: z.string().optional(),
  pickup_address: z.string().trim().min(3, 'Укажите адрес подачи'),
  pickup_latitude: z.coerce.number().min(-90).max(90),
  pickup_longitude: z.coerce.number().min(-180).max(180),
  destination_address: z.string().trim().min(3, 'Укажите адрес назначения'),
  destination_latitude: z.coerce.number().min(-90).max(90),
  destination_longitude: z.coerce.number().min(-180).max(180),
  payment_type: z.enum(['cash', 'card', 'corporate']),
  comment: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

type PassengerOrderCreateModalProps = {
  open: boolean
  isSaving: boolean
  tariffs?: Tariff[]
  defaultPhone?: string
  onClose: () => void
  onSubmit: (payload: PassengerCreateOrderPayload) => void
}

export function PassengerOrderCreateModal({
  open,
  isSaving,
  tariffs: externalTariffs,
  defaultPhone,
  onClose,
  onSubmit,
}: PassengerOrderCreateModalProps) {
  const [pickupPoint, setPickupPoint] = useState<PassengerAddressPoint | null>(null)
  const [destinationPoint, setDestinationPoint] = useState<PassengerAddressPoint | null>(null)
  const [estimate, setEstimate] = useState<PassengerOrderEstimate | null>(null)
  const [estimateError, setEstimateError] = useState<string | null>(null)

  const tariffsQuery = useQuery({
    queryKey: ['taxi-park-tariffs'],
    queryFn: getTariffs,
    enabled: open && !externalTariffs,
  })

  const tariffs = externalTariffs ?? tariffsQuery.data ?? []

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tariff_id: '',
      city_id: '',
      pickup_address: '',
      destination_address: '',
      payment_type: 'cash',
    },
  })

  const [
    tariffId,
    cityId,
    pickupAddress,
    destinationAddress,
    pickupLatitude,
    pickupLongitude,
    destinationLatitude,
    destinationLongitude,
  ] = useWatch({
    control,
    name: [
      'tariff_id',
      'city_id',
      'pickup_address',
      'destination_address',
      'pickup_latitude',
      'pickup_longitude',
      'destination_latitude',
      'destination_longitude',
    ],
  })

  const resolvedCityId = cityId || pickupPoint?.city_id || destinationPoint?.city_id
  const estimateEnabled = useMemo(
    () =>
      Boolean(
        resolvedCityId &&
          tariffId &&
          isFiniteNumber(pickupLatitude) &&
          isFiniteNumber(pickupLongitude) &&
          isFiniteNumber(destinationLatitude) &&
          isFiniteNumber(destinationLongitude),
      ),
    [
      destinationLatitude,
      destinationLongitude,
      pickupLatitude,
      pickupLongitude,
      resolvedCityId,
      tariffId,
    ],
  )

  function handleClose() {
    reset({
      tariff_id: '',
      city_id: '',
      pickup_address: '',
      destination_address: '',
      payment_type: 'cash',
    })
    setPickupPoint(null)
    setDestinationPoint(null)
    setEstimate(null)
    setEstimateError(null)
    onClose()
  }

  async function calculateEstimate() {
    if (!resolvedCityId || !estimateEnabled) return

    try {
      const result = await estimatePassengerOrder({
        city_id: resolvedCityId,
        tariff_id: tariffId,
        pickup_location: {
          latitude: Number(pickupLatitude),
          longitude: Number(pickupLongitude),
        },
        destination_location: {
          latitude: Number(destinationLatitude),
          longitude: Number(destinationLongitude),
        },
      })
      setEstimate(result)
      setEstimateError(null)
    } catch (error) {
      setEstimate(null)
      setEstimateError(error instanceof Error ? error.message : 'Не удалось рассчитать стоимость')
    }
  }

  function submit(values: FormValues) {
    if (!resolvedCityId) {
      setEstimateError('Не удалось определить город. Выберите адрес из подсказки или укажите city_id.')
      return
    }

    onSubmit({
      city_id: resolvedCityId,
      tariff_id: values.tariff_id,
      passenger_phone: defaultPhone,
      pickup_address: values.pickup_address,
      pickup_location: {
        latitude: values.pickup_latitude,
        longitude: values.pickup_longitude,
      },
      destination_address: values.destination_address,
      destination_location: {
        latitude: values.destination_latitude,
        longitude: values.destination_longitude,
      },
      payment_type: values.payment_type,
      comment: normalizeString(values.comment),
    })
  }

  return (
    <Modal title="Новый заказ" open={open} onClose={handleClose}>
      <form className="space-y-5" onSubmit={handleSubmit(submit)}>
        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Телефон для связи">
            <Input value={defaultPhone ?? ''} placeholder="+79990000000" disabled />
          </Field>
          <Field label="Оплата">
            <Select {...register('payment_type')}>
              <option value="cash">Наличные</option>
              <option value="card">Карта</option>
              <option value="corporate">Корпоративная</option>
            </Select>
          </Field>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Тариф" error={errors.tariff_id?.message}>
            {tariffs.length ? (
              <Select {...register('tariff_id')}>
                <option value="">Выберите тариф</option>
                {tariffs.map((tariff) => (
                  <option key={tariff.id} value={tariff.id}>
                    {tariff.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                {...register('tariff_id')}
                placeholder={tariffsQuery.isLoading ? 'Загрузка тарифов...' : 'UUID тарифа'}
              />
            )}
          </Field>

          <Field label="City ID">
            <Input
              {...register('city_id')}
              placeholder="Определится из адреса или укажите вручную"
            />
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
            setValue('pickup_latitude', point.latitude, { shouldDirty: true, shouldValidate: true })
            setValue('pickup_longitude', point.longitude, { shouldDirty: true, shouldValidate: true })
          }}
          onDestinationChange={(point) => {
            setValue('destination_latitude', point.latitude, { shouldDirty: true, shouldValidate: true })
            setValue('destination_longitude', point.longitude, { shouldDirty: true, shouldValidate: true })
          }}
        />

        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Адрес подачи" error={errors.pickup_address?.message}>
            <PassengerAddressSearchInput
              value={pickupAddress ?? ''}
              cityId={resolvedCityId}
              latitude={getNumericCoordinate(pickupLatitude)}
              longitude={getNumericCoordinate(pickupLongitude)}
              placeholder="Ленина 1"
              error={coordinateError(errors.pickup_latitude?.message, errors.pickup_longitude?.message)}
              onAddressChange={(value) => {
                setValue('pickup_address', value, { shouldDirty: true, shouldValidate: true })
              }}
              onSelectPoint={(point) => {
                setPickupPoint(point)
                if (point.city_id) {
                  setValue('city_id', point.city_id, { shouldDirty: true, shouldValidate: true })
                }
                setValue('pickup_address', point.address, { shouldDirty: true, shouldValidate: true })
                setValue('pickup_latitude', point.coordinates.latitude, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
                setValue('pickup_longitude', point.coordinates.longitude, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
            />
          </Field>

          <Field label="Адрес назначения" error={errors.destination_address?.message}>
            <PassengerAddressSearchInput
              value={destinationAddress ?? ''}
              cityId={resolvedCityId}
              latitude={getNumericCoordinate(destinationLatitude)}
              longitude={getNumericCoordinate(destinationLongitude)}
              placeholder="Мира 10"
              error={coordinateError(
                errors.destination_latitude?.message,
                errors.destination_longitude?.message,
              )}
              onAddressChange={(value) => {
                setValue('destination_address', value, { shouldDirty: true, shouldValidate: true })
              }}
              onSelectPoint={(point) => {
                setDestinationPoint(point)
                if (point.city_id && !resolvedCityId) {
                  setValue('city_id', point.city_id, { shouldDirty: true, shouldValidate: true })
                }
                setValue('destination_address', point.address, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
                setValue('destination_latitude', point.coordinates.latitude, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
                setValue('destination_longitude', point.coordinates.longitude, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
            />
          </Field>
        </section>

        <Field label="Комментарий">
          <Textarea {...register('comment')} placeholder="Подъезд, ориентир, пожелания" />
        </Field>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-semibold text-slate-900">
                {estimate
                  ? `Оценка: ${formatMoneyAmount(estimate.price ?? 0)}`
                  : 'Можно рассчитать стоимость до создания заказа'}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {estimate
                  ? `${estimate.tariff_name ?? 'Тариф'} · ${estimate.distance_km ?? 0} км · ${estimate.duration_min ?? 0} мин`
                  : 'Укажите точки на карте, введите адреса и затем нажмите "Рассчитать"'}
              </div>
              {estimateError ? <div className="mt-1 text-sm text-red-600">{estimateError}</div> : null}
            </div>

            <Button
              type="button"
              variant="secondary"
              disabled={!estimateEnabled}
              onClick={() => void calculateEstimate()}
            >
              Рассчитать
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Создание...' : 'Заказать такси'}
          </Button>
        </div>
      </form>
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

function coordinateError(latitudeError?: string, longitudeError?: string) {
  return latitudeError || longitudeError
    ? 'Поставьте точку на карте или выберите адрес из подсказки'
    : undefined
}

function normalizeString(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function getNumericCoordinate(value: unknown) {
  if (value === '' || value === undefined || value === null) return undefined
  const coordinate = Number(value)
  return Number.isFinite(coordinate) ? coordinate : undefined
}

function isFiniteNumber(value: unknown) {
  if (value === '' || value === undefined || value === null) return false
  return Number.isFinite(Number(value))
}
