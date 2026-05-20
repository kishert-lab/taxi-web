import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { Textarea } from '../../shared/ui/Textarea'
import type { TaxiParkDriver, TaxiParkDriverPayload } from './api'
import type { TaxiParkCar } from '../taxi-park-cars/api'

const statusOptions = [
  'draft',
  'pending_verification',
  'verified',
  'rejected',
  'blocked',
  'archived',
] as const

const schema = z.object({
  phone: z.string().min(6, 'Введите телефон'),
  email: z.string().email('Введите корректный email').optional().or(z.literal('')),
  password: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  birth_date: z.string().optional(),
  license_series: z.string().optional(),
  license_number: z.string().optional(),
  license_issued_at: z.string().optional(),
  license_expires_at: z.string().optional(),
  driving_experience_from: z.string().optional(),
  verification_status: z.enum(statusOptions).optional(),
  attached_car_id: z.string().uuid('Введите UUID автомобиля').optional().or(z.literal('')),
  taxi_park_comment: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function splitName(fullName?: string) {
  const [firstName = '', ...rest] = (fullName ?? '').split(' ')
  return { firstName, lastName: rest.join(' ') }
}

export function TaxiParkDriverForm({
  driver,
  isSaving,
  onSubmit,
  cars = [],
}: {
  driver?: TaxiParkDriver
  isSaving: boolean
  onSubmit: (payload: TaxiParkDriverPayload) => void
  cars?: TaxiParkCar[]
}) {
  const name = splitName(driver?.full_name)
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      phone: driver?.phone ?? '',
      email: driver?.email ?? '',
      password: '',
      first_name: name.firstName,
      last_name: name.lastName,
      birth_date: dateOnly(driver?.birth_date),
      license_series: driver?.license_series ?? '',
      license_number: driver?.license_number ?? '',
      license_issued_at: dateOnly(driver?.license_issued_at),
      license_expires_at: dateOnly(driver?.license_expires_at),
      driving_experience_from: dateOnly(driver?.driving_experience_from),
      verification_status: driver?.verification_status ?? 'pending_verification',
      taxi_park_comment: driver?.taxi_park_comment ?? '',
      attached_car_id: '',
    },
  })

  const errorText = Object.values(formState.errors)[0]?.message

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Телефон">
          <Input {...register('phone')} disabled={Boolean(driver)} placeholder="+79990000000" />
        </Field>
        <Field label="Email">
          <Input {...register('email')} disabled={Boolean(driver)} type="email" />
        </Field>
        {!driver ? (
          <Field label="Пароль или временный пароль">
            <Input {...register('password')} type="password" placeholder="Оставьте пустым для генерации" />
          </Field>
        ) : null}
        <Field label="Имя">
          <Input {...register('first_name')} />
        </Field>
        <Field label="Фамилия">
          <Input {...register('last_name')} />
        </Field>
        <Field label="Дата рождения">
          <Input {...register('birth_date')} type="date" />
        </Field>
        <Field label="Серия водительского удостоверения">
          <Input {...register('license_series')} placeholder="77 01" />
        </Field>
        <Field label="Номер водительского удостоверения">
          <Input {...register('license_number')} />
        </Field>
        <Field label="Дата выдачи ВУ">
          <Input {...register('license_issued_at')} type="date" />
        </Field>
        <Field label="Срок действия ВУ">
          <Input {...register('license_expires_at')} type="date" />
        </Field>
        <Field label="Стаж с">
          <Input {...register('driving_experience_from')} type="date" />
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
        <Field label="Прикрепленный автомобиль">
          <Select {...register('attached_car_id')}>
            <option value="">Не выбран</option>
            {cars.map((car) => (
              <option key={car.id} value={car.id}>
                {car.brand} {car.model} · {car.plate_number}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Комментарий администратора таксопарка">
        <Textarea {...register('taxi_park_comment')} />
      </Field>
      {errorText ? (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {String(errorText)}
        </div>
      ) : null}
      <Button type="submit" disabled={isSaving}>
        {driver ? 'Сохранить водителя' : 'Создать водителя'}
      </Button>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
