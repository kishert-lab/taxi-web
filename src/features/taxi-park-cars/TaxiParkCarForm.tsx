import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { ColorPicker } from '../../shared/ui/ColorPicker'
import { carColorOptions } from '../../shared/ui/color-options'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { Textarea } from '../../shared/ui/Textarea'
import type { TaxiParkDriver } from '../taxi-park-drivers/api'
import type { TaxiParkCar, TaxiParkCarPayload } from './api'

const statusOptions = [
  'draft',
  'pending_verification',
  'verified',
  'rejected',
  'blocked',
  'archived',
] as const

const schema = z.object({
  brand: z.string().min(1, 'Введите марку'),
  model: z.string().min(1, 'Введите модель'),
  plate_number: z.string().min(1, 'Введите госномер'),
  color: z.string().min(1, 'Введите цвет'),
  year: z.string().optional(),
  car_class: z.string().optional(),
  is_active: z.boolean(),
  verification_status: z.enum(statusOptions).optional(),
  primary_driver_id: z.string().uuid('Введите UUID основного водителя').optional().or(z.literal('')),
  attached_driver_ids: z.array(z.string()).optional(),
  vin: z.string().optional(),
  sts: z.string().optional(),
  pts: z.string().optional(),
  taxi_permit_number: z.string().optional(),
  permit_issued_at: z.string().optional(),
  permit_expires_at: z.string().optional(),
  permit_region: z.string().optional(),
  regional_registry_number: z.string().optional(),
  osago_expires_at: z.string().optional(),
  diagnostic_card_expires_at: z.string().optional(),
  owner_details: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

export function TaxiParkCarForm({
  car,
  isSaving,
  onSubmit,
  drivers = [],
}: {
  car?: TaxiParkCar
  isSaving: boolean
  onSubmit: (payload: TaxiParkCarPayload) => void
  drivers?: TaxiParkDriver[]
}) {
  const { control, register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand: car?.brand ?? '',
      model: car?.model ?? '',
      plate_number: car?.plate_number ?? '',
      color: car?.color ?? '',
      year: car?.year ? String(car.year) : '',
      car_class: car?.car_class ?? '',
      is_active: car?.is_active ?? true,
      verification_status: car?.verification_status ?? 'pending_verification',
      primary_driver_id: car?.primary_driver_id ?? '',
      attached_driver_ids: car?.attached_driver_ids ?? [],
      vin: car?.vin ?? '',
      sts: car?.sts ?? '',
      pts: car?.pts ?? '',
      taxi_permit_number: car?.taxi_permit_number ?? '',
      permit_issued_at: dateOnly(car?.permit_issued_at),
      permit_expires_at: dateOnly(car?.permit_expires_at),
      permit_region: car?.permit_region ?? '',
      regional_registry_number: car?.regional_registry_number ?? '',
      osago_expires_at: dateOnly(car?.osago_expires_at),
      diagnostic_card_expires_at: dateOnly(car?.diagnostic_card_expires_at),
      owner_details: car?.owner_details ?? '',
    },
  })

  const errorText = Object.values(formState.errors)[0]?.message

  function submit(values: FormValues) {
    onSubmit({
      ...values,
      year: values.year ? Number(values.year) : undefined,
    })
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Марка">
          <Input {...register('brand')} placeholder="Lada" />
        </Field>
        <Field label="Модель">
          <Input {...register('model')} placeholder="Vesta" />
        </Field>
        <Field label="Госномер">
          <Input {...register('plate_number')} placeholder="A001AA196" />
        </Field>
        <Field label="Цвет">
          <Controller
            control={control}
            name="color"
            render={({ field }) => (
              <ColorPicker
                value={field.value}
                onChange={field.onChange}
                options={carColorOptions}
              />
            )}
          />
        </Field>
        <Field label="Год">
          <Input {...register('year')} type="number" min={1900} max={2100} />
        </Field>
        <Field label="Класс">
          <Input {...register('car_class')} placeholder="economy" />
        </Field>
        <Field label="Статус проверки">
          <Select {...register('verification_status')}>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Основной водитель">
          <Select {...register('primary_driver_id')}>
            <option value="">Не выбран</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Привязанные водители">
          <Select {...register('attached_driver_ids')} multiple className="h-28 py-2">
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="VIN">
          <Input {...register('vin')} />
        </Field>
        <Field label="СТС">
          <Input {...register('sts')} />
        </Field>
        <Field label="ПТС">
          <Input {...register('pts')} />
        </Field>
        <Field label="Номер разрешения такси">
          <Input {...register('taxi_permit_number')} />
        </Field>
        <Field label="Регион разрешения">
          <Input {...register('permit_region')} />
        </Field>
        <Field label="Дата выдачи разрешения">
          <Input {...register('permit_issued_at')} type="date" />
        </Field>
        <Field label="Срок разрешения">
          <Input {...register('permit_expires_at')} type="date" />
        </Field>
        <Field label="Региональный реестр">
          <Input {...register('regional_registry_number')} />
        </Field>
        <Field label="ОСАГО до">
          <Input {...register('osago_expires_at')} type="date" />
        </Field>
        <Field label="Диагностическая карта до">
          <Input {...register('diagnostic_card_expires_at')} type="date" />
        </Field>
        <label className="flex items-center gap-2 pt-7 text-sm font-medium text-slate-700">
          <input className="h-4 w-4" type="checkbox" {...register('is_active')} />
          Активен
        </label>
      </div>
      <Field label="Владелец / основание владения">
        <Textarea {...register('owner_details')} />
      </Field>
      {errorText ? (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {String(errorText)}
        </div>
      ) : null}
      <Button type="submit" disabled={isSaving}>
        {car ? 'Сохранить автомобиль' : 'Создать автомобиль'}
      </Button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
