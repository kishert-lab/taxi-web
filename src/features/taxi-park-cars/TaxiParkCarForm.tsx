import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { Textarea } from '../../shared/ui/Textarea'
import type { CarVerificationStatus, TaxiParkCar, TaxiParkCarPayload } from './api'

const createStatusOptions = [
  { value: 'pending_verification', label: 'Ожидает проверки' },
  { value: 'draft', label: 'Черновик' },
] as const

const editStatusOptions = [
  ...createStatusOptions,
  { value: 'rejected', label: 'Отклонен' },
  { value: 'blocked', label: 'Заблокирован' },
  { value: 'archived', label: 'Архив' },
] as const

const carColorOptions = [
  { value: 'Белый', label: 'Белый' },
  { value: 'Черный', label: 'Черный' },
  { value: 'Серый', label: 'Серый' },
  { value: 'Серебристый', label: 'Серебристый' },
  { value: 'Синий', label: 'Синий' },
  { value: 'Красный', label: 'Красный' },
  { value: 'Желтый', label: 'Желтый' },
  { value: 'Зеленый', label: 'Зеленый' },
]

const carClassOptions = [
  { value: 'economy', label: 'Эконом' },
  { value: 'comfort', label: 'Комфорт' },
  { value: 'business', label: 'Бизнес' },
  { value: 'minivan', label: 'Минивэн' },
] as const

const permitRegionOptions = [
  { value: 'Moscow', label: 'Москва' },
  { value: 'Moscow Oblast', label: 'Московская область' },
  { value: 'Saint Petersburg', label: 'Санкт-Петербург' },
  { value: 'Sverdlovsk Oblast', label: 'Свердловская область' },
  { value: 'Tatarstan', label: 'Татарстан' },
  { value: 'Krasnodar Krai', label: 'Краснодарский край' },
] as const

const formStatusValues = editStatusOptions.map((option) => option.value) as [
  'pending_verification',
  'draft',
  'rejected',
  'blocked',
  'archived',
]

const schema = z.object({
  brand: z.string().trim().min(1, 'Укажите марку автомобиля'),
  model: z.string().trim().min(1, 'Укажите модель автомобиля'),
  plate_number: z.string().trim().min(1, 'Укажите госномер'),
  color: z.string().trim().min(1, 'Выберите цвет кузова'),
  year: z.string().optional(),
  vin: z.string().trim().optional(),
  sts: z.string().trim().optional(),
  pts: z.string().trim().optional(),
  car_class: z.enum(['economy', 'comfort', 'business', 'minivan']).optional(),
  verification_status: z.enum(formStatusValues),
  owner_or_legal_basis: z.string().trim().optional(),
  osago_expires_at: z.string().optional(),
  diagnostic_card_expires_at: z.string().optional(),
  taxi_permit_number: z.string().trim().optional(),
  regional_registry_number: z.string().trim().optional(),
  permit_region: z.string().optional(),
  permit_issued_at: z.string().optional(),
  permit_expires_at: z.string().optional(),
  is_active: z.boolean(),
  taxi_permit_verified: z.boolean(),
  regional_registry_verified: z.boolean(),
  regional_requirements_compliant: z.boolean(),
  has_taxi_color_scheme: z.boolean(),
  has_orange_roof_lamp: z.boolean(),
  has_passenger_info: z.boolean(),
  osago_verified: z.boolean(),
  diagnostic_card_verified: z.boolean(),
  technical_state_verified: z.boolean(),
  localization_compliant: z.boolean(),
  legal_use_basis_verified: z.boolean(),
})

type FormValues = z.infer<typeof schema>

function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

function getCreateStatus(status?: TaxiParkCar['verification_status']) {
  return status === 'draft' ? 'draft' : 'pending_verification'
}

export function TaxiParkCarForm({
  car,
  isSaving,
  onSubmit,
}: {
  car?: TaxiParkCar
  isSaving: boolean
  onSubmit: (payload: TaxiParkCarPayload) => void
}) {
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand: car?.brand ?? '',
      model: car?.model ?? '',
      plate_number: car?.plate_number ?? '',
      color: car?.color ?? 'Белый',
      year: car?.year ? String(car.year) : '',
      vin: car?.vin ?? '',
      sts: car?.sts ?? '',
      pts: car?.pts ?? '',
      car_class:
        car?.car_class === 'comfort_plus'
          ? 'comfort'
          : (car?.car_class as FormValues['car_class']) ?? 'economy',
      verification_status: getCreateStatus(car?.verification_status),
      owner_or_legal_basis: car?.owner_or_legal_basis ?? car?.owner_details ?? '',
      osago_expires_at: dateOnly(car?.osago_expires_at),
      diagnostic_card_expires_at: dateOnly(car?.diagnostic_card_expires_at),
      taxi_permit_number: car?.taxi_permit_number ?? '',
      regional_registry_number: car?.regional_registry_number ?? '',
      permit_region: car?.permit_region ?? '',
      permit_issued_at: dateOnly(car?.permit_issued_at),
      permit_expires_at: dateOnly(car?.permit_expires_at),
      is_active: car?.is_active ?? true,
      taxi_permit_verified: car?.taxi_permit_verified ?? false,
      regional_registry_verified: car?.regional_registry_verified ?? false,
      regional_requirements_compliant: car?.regional_requirements_compliant ?? false,
      has_taxi_color_scheme: car?.has_taxi_color_scheme ?? false,
      has_orange_roof_lamp: car?.has_orange_roof_lamp ?? false,
      has_passenger_info: car?.has_passenger_info ?? false,
      osago_verified: car?.osago_verified ?? false,
      diagnostic_card_verified: car?.diagnostic_card_verified ?? false,
      technical_state_verified: car?.technical_state_verified ?? false,
      localization_compliant: car?.localization_compliant ?? false,
      legal_use_basis_verified: car?.legal_use_basis_verified ?? false,
    },
  })

  const errorText = Object.values(formState.errors)[0]?.message
  const statusOptions = car ? editStatusOptions : createStatusOptions

  function submit(values: FormValues) {
    const ownerBasis = values.owner_or_legal_basis?.trim()

    onSubmit({
      brand: values.brand.trim(),
      model: values.model.trim(),
      plate_number: values.plate_number.trim(),
      color: values.color,
      year: values.year ? Number(values.year) : undefined,
      vin: values.vin?.trim(),
      sts: values.sts?.trim(),
      pts: values.pts?.trim(),
      car_class: values.car_class,
      verification_status: values.verification_status as CarVerificationStatus,
      owner_or_legal_basis: ownerBasis,
      owner_details: ownerBasis,
      osago_expires_at: values.osago_expires_at,
      diagnostic_card_expires_at: values.diagnostic_card_expires_at,
      taxi_permit_number: values.taxi_permit_number?.trim(),
      regional_registry_number: values.regional_registry_number?.trim(),
      permit_region: values.permit_region,
      permit_issued_at: values.permit_issued_at,
      permit_expires_at: values.permit_expires_at,
      is_active: values.is_active,
      taxi_permit_verified: values.taxi_permit_verified,
      regional_registry_verified: values.regional_registry_verified,
      regional_requirements_compliant: values.regional_requirements_compliant,
      has_taxi_color_scheme: values.has_taxi_color_scheme,
      has_orange_roof_lamp: values.has_orange_roof_lamp,
      has_passenger_info: values.has_passenger_info,
      osago_verified: values.osago_verified,
      diagnostic_card_verified: values.diagnostic_card_verified,
      technical_state_verified: values.technical_state_verified,
      localization_compliant: values.localization_compliant,
      legal_use_basis_verified: values.legal_use_basis_verified,
    })
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(submit)}>
      <FormSection title="Основные данные">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Марка">
            <Input {...register('brand')} placeholder="Лада" />
          </Field>
          <Field label="Модель">
            <Input {...register('model')} placeholder="Гранта" />
          </Field>
          <Field label="Госномер">
            <Input {...register('plate_number')} placeholder="О777ОО777" />
          </Field>
          <Field label="Цвет кузова">
            <Select {...register('color')}>
              {carColorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Год выпуска">
            <Input {...register('year')} type="number" min={1900} max={2100} placeholder="2025" />
          </Field>
          <Field label="Класс автомобиля">
            <Select {...register('car_class')}>
              {carClassOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Статус проверки">
            <Select {...register('verification_status')}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <label className="flex items-center gap-2 pt-7 text-sm font-medium text-slate-700">
            <input className="h-4 w-4" type="checkbox" {...register('is_active')} />
            Автомобиль активен
          </label>
        </div>
      </FormSection>

      <FormSection title="Документы">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="VIN">
            <Input {...register('vin')} placeholder="VF3MJAHXVHS101044" />
          </Field>
          <Field label="СТС">
            <Input {...register('sts')} placeholder="99АА123465" />
          </Field>
          <Field label="ПТС">
            <Input {...register('pts')} placeholder="88ФФ465781" />
          </Field>
          <Field label="ОСАГО действует до">
            <Input {...register('osago_expires_at')} type="date" />
          </Field>
          <Field label="Диагностическая карта до">
            <Input {...register('diagnostic_card_expires_at')} type="date" />
          </Field>
        </div>
        <Field label="Право владения или законное основание использования">
          <Textarea {...register('owner_or_legal_basis')} placeholder="Аренда" />
        </Field>
      </FormSection>

      <FormSection title="Разрешение такси">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Номер разрешения такси">
            <Input {...register('taxi_permit_number')} placeholder="TAXI-234" />
          </Field>
          <Field label="Номер регионального реестра">
            <Input {...register('regional_registry_number')} placeholder="45-9987" />
          </Field>
          <Field label="Регион разрешения">
            <Select {...register('permit_region')}>
              <option value="">Не выбран</option>
              {permitRegionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Разрешение выдано">
            <Input {...register('permit_issued_at')} type="date" />
          </Field>
          <Field label="Разрешение действует до">
            <Input {...register('permit_expires_at')} type="date" />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Проверки таксопарка">
        <div className="grid gap-3 md:grid-cols-2">
          <Check label="Проверено разрешение такси" name="taxi_permit_verified" register={register} />
          <Check label="Проверена запись в региональном реестре" name="regional_registry_verified" register={register} />
          <Check label="Соответствует региональным требованиям" name="regional_requirements_compliant" register={register} />
          <Check label="Есть цветографическая схема такси" name="has_taxi_color_scheme" register={register} />
          <Check label="Есть оранжевый фонарь" name="has_orange_roof_lamp" register={register} />
          <Check label="Есть информация для пассажира" name="has_passenger_info" register={register} />
          <Check label="ОСАГО проверено" name="osago_verified" register={register} />
          <Check label="Диагностическая карта проверена" name="diagnostic_card_verified" register={register} />
          <Check label="Техническое состояние проверено" name="technical_state_verified" register={register} />
          <Check label="Локализация соблюдена" name="localization_compliant" register={register} />
          <Check label="Законное основание использования проверено" name="legal_use_basis_verified" register={register} />
        </div>
      </FormSection>

      {errorText ? (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {String(errorText)}
        </div>
      ) : null}

      <Button type="submit" disabled={isSaving}>
        {car ? 'Сохранить автомобиль' : 'Добавить автомобиль'}
      </Button>
    </form>
  )
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {children}
    </section>
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

function Check({
  label,
  name,
  register,
}: {
  label: string
  name: keyof FormValues
  register: ReturnType<typeof useForm<FormValues>>['register']
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
      <input className="h-4 w-4" type="checkbox" {...register(name)} />
      {label}
    </label>
  )
}
