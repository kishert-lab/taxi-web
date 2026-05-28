import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { statusLabel } from '../../shared/ui/badge-utils'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { Textarea } from '../../shared/ui/Textarea'
import type { TaxiParkCar } from '../taxi-park-cars/api'
import type {
  DriverVerificationStatus,
  TaxiParkDriver,
  TaxiParkDriverPayload,
} from './api'

const verificationStatuses: DriverVerificationStatus[] = [
  'draft',
  'pending_verification',
  'verified',
  'rejected',
  'blocked',
  'archived',
]

const licenseCategories = ['B', 'BE', 'C', 'D'] as const

const formSchema = z.object({
  phone: z.string().optional(),
  email: z.union([z.literal(''), z.string().email('Введите корректный email')]).optional(),
  password: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  birth_date: z.string().optional(),
  license_series: z.string().optional(),
  license_number: z.string().optional(),
  license_category: z.enum(licenseCategories).optional(),
  license_issued_at: z.string().optional(),
  license_expires_at: z.string().optional(),
  driving_experience_from: z.string().optional(),
  verification_status: z.enum(verificationStatuses),
  taxi_park_comment: z.string().optional(),
  attached_car_id: z.string().optional(),
  has_no_taxi_work_restrictions: z.boolean(),
  federal_law_580_compliant: z.boolean(),
  regional_requirements_compliant: z.boolean(),
  medical_check_passed: z.boolean(),
  pretrip_control_required: z.boolean(),
  pretrip_control_passed: z.boolean(),
  no_transport_ban: z.boolean(),
})

type FormValues = z.infer<typeof formSchema>

type TaxiParkDriverFormProps = {
  driver?: TaxiParkDriver
  cars: TaxiParkCar[]
  isSaving: boolean
  onSubmit: (payload: TaxiParkDriverPayload) => void
}

export function TaxiParkDriverForm({
  driver,
  cars,
  isSaving,
  onSubmit,
}: TaxiParkDriverFormProps) {
  const isEditing = Boolean(driver)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(driver),
  })

  function submit(values: FormValues) {
    const phone = values.phone?.trim() ?? ''

    if (!isEditing && phone.length < 6) {
      setError('phone', { message: 'Введите телефон' })
      return
    }

    const editablePayload: TaxiParkDriverPayload = {
      first_name: normalizeString(values.first_name),
      last_name: normalizeString(values.last_name),
      birth_date: normalizeString(values.birth_date),
      license_series: normalizeString(values.license_series),
      license_number: normalizeString(values.license_number),
      license_category: values.license_category,
      license_issued_at: normalizeString(values.license_issued_at),
      license_expires_at: normalizeString(values.license_expires_at),
      driving_experience_from: normalizeString(values.driving_experience_from),
      verification_status: values.verification_status,
      taxi_park_comment: normalizeString(values.taxi_park_comment),
      attached_car_id: normalizeString(values.attached_car_id),
      has_no_taxi_work_restrictions: values.has_no_taxi_work_restrictions,
      federal_law_580_compliant: values.federal_law_580_compliant,
      regional_requirements_compliant: values.regional_requirements_compliant,
      medical_check_passed: values.medical_check_passed,
      pretrip_control_required: values.pretrip_control_required,
      pretrip_control_passed: values.pretrip_control_passed,
      no_transport_ban: values.no_transport_ban,
    }

    if (isEditing) {
      onSubmit(buildEditedPayload(editablePayload))
      return
    }

    onSubmit({
      ...editablePayload,
      phone,
      email: normalizeString(values.email),
      password: normalizeString(values.password),
    })
  }

  const firstError = Object.values(errors)[0]?.message

  return (
    <form className="space-y-6" onSubmit={handleSubmit(submit)}>
      <Section title="Основные данные">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Телефон" error={errors.phone?.message}>
            <Input
              {...register('phone')}
              disabled={isEditing}
              placeholder="+79990000000"
            />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <Input
              {...register('email')}
              disabled={isEditing}
              placeholder="driver@example.com"
            />
          </Field>
          <Field label="Временный пароль">
            <Input
              {...register('password')}
              disabled={isEditing}
              type="password"
              placeholder={isEditing ? 'Не меняется при редактировании' : 'Можно оставить пустым'}
            />
          </Field>
          <Field label="Статус проверки">
            <Select {...register('verification_status')} disabled={isEditing}>
              {verificationStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Имя">
            <Input {...register('first_name')} placeholder="Иван" />
          </Field>
          <Field label="Фамилия">
            <Input {...register('last_name')} placeholder="Иванов" />
          </Field>
          <Field label="Дата рождения">
            <Input {...register('birth_date')} type="date" />
          </Field>
          <Field label="Прикрепленный автомобиль">
            <Select {...register('attached_car_id')}>
              <option value="">Не выбран</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.brand} {car.model} {car.plate_number}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Водительское удостоверение">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Серия">
            <Input {...register('license_series')} placeholder="99AA" />
          </Field>
          <Field label="Номер">
            <Input {...register('license_number')} placeholder="123456" />
          </Field>
          <Field label="Категория">
            <Select {...register('license_category')}>
              {licenseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Дата выдачи">
            <Input {...register('license_issued_at')} type="date" />
          </Field>
          <Field label="Действует до">
            <Input {...register('license_expires_at')} type="date" />
          </Field>
          <Field label="Стаж с">
            <Input {...register('driving_experience_from')} type="date" />
          </Field>
        </div>
      </Section>

      <Section title="Проверки таксопарка">
        <div className="grid gap-3 md:grid-cols-2">
          <Check register={register('has_no_taxi_work_restrictions')}>
            Нет ограничений на работу в такси
          </Check>
          <Check register={register('federal_law_580_compliant')}>
            Соответствует 580-ФЗ
          </Check>
          <Check register={register('regional_requirements_compliant')}>
            Соответствует региональным требованиям
          </Check>
          <Check register={register('medical_check_passed')}>Медосмотр пройден</Check>
          <Check register={register('pretrip_control_required')}>
            Предрейсовый контроль требуется
          </Check>
          <Check register={register('pretrip_control_passed')}>
            Предрейсовый контроль пройден
          </Check>
          <Check register={register('no_transport_ban')}>Нет запрета на перевозки</Check>
        </div>
      </Section>

      <Section title="Комментарий">
        <Textarea
          {...register('taxi_park_comment')}
          placeholder="Внутренний комментарий администратора таксопарка"
        />
      </Section>

      {firstError ? <p className="text-sm font-medium text-red-600">{firstError}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Сохранение...' : isEditing ? 'Сохранить' : 'Создать водителя'}
        </Button>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
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

function Check({
  register,
  children,
}: {
  register: UseFormRegisterReturn
  children: ReactNode
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-200"
        {...register}
      />
      <span>{children}</span>
    </label>
  )
}

function getDefaultValues(driver?: TaxiParkDriver): FormValues {
  const names = splitFullName(driver?.full_name)

  return {
    phone: driver?.phone ?? '',
    email: driver?.email ?? '',
    password: '',
    first_name: names.firstName,
    last_name: names.lastName,
    birth_date: dateOnly(driver?.birth_date),
    license_series: driver?.license_series ?? '',
    license_number: driver?.license_number ?? '',
    license_category: getLicenseCategory(driver?.license_category),
    license_issued_at: dateOnly(driver?.license_issued_at),
    license_expires_at: dateOnly(driver?.license_expires_at),
    driving_experience_from: dateOnly(driver?.driving_experience_from),
    verification_status: driver?.verification_status ?? 'pending_verification',
    taxi_park_comment: driver?.taxi_park_comment ?? '',
    attached_car_id: driver?.attached_car_id ?? driver?.attached_car_ids?.[0] ?? '',
    has_no_taxi_work_restrictions: driver?.has_no_taxi_work_restrictions ?? false,
    federal_law_580_compliant: driver?.federal_law_580_compliant ?? false,
    regional_requirements_compliant: driver?.regional_requirements_compliant ?? false,
    medical_check_passed: driver?.medical_check_passed ?? false,
    pretrip_control_required: driver?.pretrip_control_required ?? false,
    pretrip_control_passed: driver?.pretrip_control_passed ?? false,
    no_transport_ban: driver?.no_transport_ban ?? false,
  }
}

function splitFullName(fullName?: string) {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean)

  return {
    lastName: parts[0] ?? '',
    firstName: parts.slice(1).join(' '),
  }
}

function getLicenseCategory(value?: string) {
  return licenseCategories.includes(value as (typeof licenseCategories)[number])
    ? (value as (typeof licenseCategories)[number])
    : 'B'
}

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function normalizeString(value?: string) {
  const normalized = value?.trim()
  return normalized ? normalized : undefined
}

function buildEditedPayload(
  payload: TaxiParkDriverPayload,
) {
  const forbiddenPatchFields = new Set<keyof FormValues>([
    'phone',
    'email',
    'password',
    'verification_status',
  ])

  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => {
      const field = key as keyof FormValues
      return !forbiddenPatchFields.has(field)
    }),
  ) as TaxiParkDriverPayload
}
