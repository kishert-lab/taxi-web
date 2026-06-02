import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { Select } from '../../shared/ui/Select'
import { Textarea } from '../../shared/ui/Textarea'
import { AddressSearchInput } from '../geocoder/AddressSearchInput'
import { getTaxiParkSettings } from '../taxi-park-settings/api'
import { getTariffs } from '../taxi-park-tariffs/api'
import type { TaxiParkCreateOrderPayload } from './api'
import { OrderLocationMap } from './OrderLocationMap'

const schema = z.object({
  passenger_phone: z.string().optional(),
  tariff_id: z.string().min(1, 'Выберите тариф'),
  pickup_address: z.string().min(3, 'Укажите адрес подачи'),
  pickup_latitude: z.coerce.number().min(-90).max(90),
  pickup_longitude: z.coerce.number().min(-180).max(180),
  destination_address: z.string().min(3, 'Укажите адрес назначения'),
  destination_latitude: z.coerce.number().min(-90).max(90),
  destination_longitude: z.coerce.number().min(-180).max(180),
  payment_type: z.enum(['cash', 'card', 'corporate']),
  comment: z.string().optional(),
})

type FormInput = z.input<typeof schema>
type FormValues = z.output<typeof schema>

type TaxiParkOrderCreateModalProps = {
  open: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (payload: TaxiParkCreateOrderPayload) => void
}

export function TaxiParkOrderCreateModal({
  open,
  isSaving,
  onClose,
  onSubmit,
}: TaxiParkOrderCreateModalProps) {
  const tariffs = useQuery({
    queryKey: ['taxi-park-tariffs'],
    queryFn: getTariffs,
    enabled: open,
  })
  const settings = useQuery({
    queryKey: ['taxi-park-settings'],
    queryFn: getTaxiParkSettings,
    enabled: open,
  })

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      payment_type: 'cash',
      tariff_id: '',
    },
  })
  const [pickupAddress, destinationAddress, pickupLatitude, pickupLongitude, destinationLatitude, destinationLongitude] = useWatch({
    control,
    name: [
      'pickup_address',
      'destination_address',
      'pickup_latitude',
      'pickup_longitude',
      'destination_latitude',
      'destination_longitude',
    ],
  })

  function submit(values: FormValues) {
    onSubmit({
      city_id: settings.data?.city_id,
      tariff_id: values.tariff_id,
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
    })
  }

  const firstError = Object.values(errors)[0]?.message

  return (
    <Modal title="Создание заказа" open={open} onClose={onClose}>
      <form className="space-y-5" onSubmit={handleSubmit(submit)}>
        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Телефон пассажира">
            <Input {...register('passenger_phone')} placeholder="+79990000000" />
          </Field>
          <Field label="Тариф" error={errors.tariff_id?.message}>
            <Select {...register('tariff_id')} disabled={tariffs.isLoading}>
              <option value="">Выберите тариф</option>
              {(tariffs.data ?? [])
                .map((tariff) => (
                  <option key={tariff.id} value={tariff.id}>
                    {tariff.name}
                  </option>
                ))}
            </Select>
          </Field>
          <Field label="Оплата">
            <Select {...register('payment_type')}>
              <option value="cash">Наличные</option>
              <option value="card">Карта</option>
              <option value="corporate">Корпоративная</option>
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
            setValue('pickup_latitude', point.latitude, { shouldDirty: true, shouldValidate: true })
            setValue('pickup_longitude', point.longitude, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }}
          onDestinationChange={(point) => {
            setValue('destination_latitude', point.latitude, {
              shouldDirty: true,
              shouldValidate: true,
            })
            setValue('destination_longitude', point.longitude, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }}
          defaultCenter={settings.data?.city?.center}
        />

        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Адрес подачи" error={errors.pickup_address?.message}>
            <AddressSearchInput
              value={pickupAddress ?? ''}
              cityId={settings.data?.city_id}
              placeholder="Ленина 1"
              error={coordinateError(errors.pickup_latitude?.message, errors.pickup_longitude?.message)}
              onAddressChange={(value) => {
                setValue('pickup_address', value, { shouldDirty: true, shouldValidate: true })
                setValue('pickup_latitude', undefined, { shouldDirty: true })
                setValue('pickup_longitude', undefined, { shouldDirty: true })
              }}
              onSelectPoint={(point) => {
                setValue('pickup_address', point.address, { shouldDirty: true, shouldValidate: true })
                setValue('pickup_latitude', point.location.latitude, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
                setValue('pickup_longitude', point.location.longitude, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
            />
          </Field>
          <Field label="Адрес назначения" error={errors.destination_address?.message}>
            <AddressSearchInput
              value={destinationAddress ?? ''}
              cityId={settings.data?.city_id}
              placeholder="Мира 10"
              error={coordinateError(
                errors.destination_latitude?.message,
                errors.destination_longitude?.message,
              )}
              onAddressChange={(value) => {
                setValue('destination_address', value, { shouldDirty: true, shouldValidate: true })
                setValue('destination_latitude', undefined, { shouldDirty: true })
                setValue('destination_longitude', undefined, { shouldDirty: true })
              }}
              onSelectPoint={(point) => {
                setValue('destination_address', point.address, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
                setValue('destination_latitude', point.location.latitude, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
                setValue('destination_longitude', point.location.longitude, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }}
            />
          </Field>
        </section>

        <Field label="Комментарий">
          <Textarea {...register('comment')} placeholder="Подъезд, ориентир, пожелания пассажира" />
        </Field>

        {firstError ? <p className="text-sm font-medium text-red-600">{String(firstError)}</p> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Создание...' : 'Создать заказ'}
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

function normalizeString(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function coordinateError(latitudeError?: string, longitudeError?: string) {
  return latitudeError || longitudeError ? 'Выберите адрес из подсказки' : undefined
}

function getNumericCoordinate(value: unknown) {
  if (value === '' || value === undefined || value === null) return undefined
  const coordinate = Number(value)
  return Number.isFinite(coordinate) ? coordinate : undefined
}
