import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { ColorPicker } from '../../shared/ui/ColorPicker'
import { brandColorOptions } from '../../shared/ui/color-options'
import { Input } from '../../shared/ui/Input'
import {
  basisPointsToPercent,
  centsToRubles,
  percentToBasisPoints,
  rublesToCents,
} from '../../shared/utils/format-money'
import type { TaxiParkSettings, TaxiParkSettingsPayload } from './api'

const hexColor = /^#[0-9A-Fa-f]{6}$/
const phonePattern = /^\+7\d{10}$/

const defaultDispatchSettings = {
  initial_radius_meters: 100000,
  max_radius_meters: 100000,
  radius_step_meters: 1000,
  radius_attempts_meters: [10000, 30000, 50000, 100000],
  max_drivers_per_offer: 5,
  driver_location_max_age_sec: 120,
  offer_ttl_sec: 60,
  accept_lock_ttl_sec: 90,
  worker_poll_timeout_sec: 30,
  recovery_interval_sec: 30,
}

const schema = z
  .object({
    display_name: z.string().trim().min(1, 'Название таксопарка обязательно'),
    short_name: optionalText(),
    legal_name: optionalText(),
    inn: optionalText().refine((value) => !value || /^(\d{10}|\d{12})$/.test(value), {
      message: 'ИНН должен содержать 10 или 12 цифр',
    }),
    ogrn: optionalText().refine((value) => !value || /^(\d{13}|\d{15})$/.test(value), {
      message: 'ОГРН должен содержать 13 или 15 цифр',
    }),
    legal_address: optionalText(),
    support_phone: optionalText().refine((value) => !value || phonePattern.test(value), {
      message: 'Телефон должен быть в формате +79990000000',
    }),
    support_email: optionalText().refine(
      (value) => !value || z.string().email().safeParse(value).success,
      { message: 'Введите корректный email' },
    ),
    website: optionalText().refine(
      (value) => !value || z.string().url().safeParse(value).success,
      { message: 'Введите корректный URL сайта' },
    ),
    logo_url: optionalText().refine(
      (value) => !value || z.string().url().safeParse(value).success,
      { message: 'Введите корректный URL логотипа' },
    ),
    primary_color: optionalText().refine((value) => !value || hexColor.test(value), {
      message: 'Цвет должен быть в HEX формате',
    }),
    secondary_color: optionalText().refine((value) => !value || hexColor.test(value), {
      message: 'Цвет должен быть в HEX формате',
    }),
    allow_cash_payment: z.boolean(),
    allow_card_payment: z.boolean(),
    allow_transfer_payment: z.boolean(),
    minimum_order_price_rub: z.coerce.number().min(0),
    commission_percent: z.coerce.number().min(0).max(100),
    cancellation_timeout_sec: z.coerce.number().int().min(1),
    driver_arrival_timeout_sec: z.coerce.number().int().min(1),
    dispatch: z.object({
      initial_radius_meters: z.coerce.number().int().min(1),
      max_radius_meters: z.coerce.number().int().min(1),
      radius_step_meters: z.coerce.number().int().min(1),
      radius_attempts_meters_text: z
        .string()
        .min(1)
        .transform((value, context) => {
          const rawAttempts = value.split(',').map((item) => item.trim())
          const attempts = rawAttempts.map(Number)

          if (
            attempts.length === 0 ||
            rawAttempts.some((item) => item.length === 0) ||
            attempts.some((item) => !Number.isFinite(item) || item < 1)
          ) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Укажите радиусы через запятую, например 10000, 30000, 50000',
            })
            return z.NEVER
          }

          return attempts
        }),
      max_drivers_per_offer: z.coerce.number().int().min(1),
      driver_location_max_age_sec: z.coerce.number().int().min(1),
      offer_ttl_sec: z.coerce.number().int().min(1),
      accept_lock_ttl_sec: z.coerce.number().int().min(1),
      worker_poll_timeout_sec: z.coerce.number().int().min(1),
      recovery_interval_sec: z.coerce.number().int().min(1),
    }),
  })
  .superRefine((values, context) => {
    if (values.dispatch.max_radius_meters < values.dispatch.initial_radius_meters) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dispatch', 'max_radius_meters'],
        message: 'Максимальный радиус не может быть меньше начального',
      })
    }

    const attempts = values.dispatch.radius_attempts_meters_text
    for (let index = 1; index < attempts.length; index += 1) {
      if (attempts[index] <= attempts[index - 1]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['dispatch', 'radius_attempts_meters_text'],
          message: 'Радиусы должны идти по возрастанию',
        })
        break
      }
    }
  })

type FormValues = z.infer<typeof schema>
type FormInputValues = z.input<typeof schema>

function optionalText() {
  return z.string().trim()
}

function toFormValues(settings: TaxiParkSettings): FormInputValues {
  const dispatch = normalizeDispatchSettings(settings.dispatch)

  return {
    display_name: stringOrEmpty(settings.display_name),
    short_name: stringOrEmpty(settings.short_name),
    legal_name: stringOrEmpty(settings.legal_name),
    inn: stringOrEmpty(settings.inn),
    ogrn: stringOrEmpty(settings.ogrn),
    legal_address: stringOrEmpty(settings.legal_address),
    support_phone: stringOrEmpty(settings.support_phone),
    support_email: stringOrEmpty(settings.support_email),
    website: stringOrEmpty(settings.website),
    logo_url: stringOrEmpty(settings.logo_url),
    primary_color: stringOrEmpty(settings.primary_color) || '#F59E0B',
    secondary_color: stringOrEmpty(settings.secondary_color) || '#0F172A',
    allow_cash_payment: Boolean(settings.allow_cash_payment),
    allow_card_payment: Boolean(settings.allow_card_payment),
    allow_transfer_payment: Boolean(settings.allow_transfer_payment),
    minimum_order_price_rub: centsToRubles(settings.minimum_order_price_cents ?? 0),
    commission_percent: basisPointsToPercent(settings.commission_basis_points ?? 100),
    cancellation_timeout_sec: settings.cancellation_timeout_sec ?? 300,
    driver_arrival_timeout_sec: settings.driver_arrival_timeout_sec ?? 900,
    dispatch: {
      ...dispatch,
      radius_attempts_meters_text: dispatch.radius_attempts_meters.join(', '),
    },
  }
}

function normalizeDispatchSettings(dispatch: TaxiParkSettings['dispatch']) {
  return {
    initial_radius_meters:
      dispatch?.initial_radius_meters ?? defaultDispatchSettings.initial_radius_meters,
    max_radius_meters: dispatch?.max_radius_meters ?? defaultDispatchSettings.max_radius_meters,
    radius_step_meters:
      dispatch?.radius_step_meters ?? defaultDispatchSettings.radius_step_meters,
    radius_attempts_meters:
      dispatch?.radius_attempts_meters?.length
        ? dispatch.radius_attempts_meters
        : defaultDispatchSettings.radius_attempts_meters,
    max_drivers_per_offer:
      dispatch?.max_drivers_per_offer ?? defaultDispatchSettings.max_drivers_per_offer,
    driver_location_max_age_sec:
      dispatch?.driver_location_max_age_sec ??
      defaultDispatchSettings.driver_location_max_age_sec,
    offer_ttl_sec: dispatch?.offer_ttl_sec ?? defaultDispatchSettings.offer_ttl_sec,
    accept_lock_ttl_sec:
      dispatch?.accept_lock_ttl_sec ?? defaultDispatchSettings.accept_lock_ttl_sec,
    worker_poll_timeout_sec:
      dispatch?.worker_poll_timeout_sec ?? defaultDispatchSettings.worker_poll_timeout_sec,
    recovery_interval_sec:
      dispatch?.recovery_interval_sec ?? defaultDispatchSettings.recovery_interval_sec,
  }
}

function stringOrEmpty(value: string | null | undefined) {
  return value ?? ''
}

function toPayload(values: FormValues): TaxiParkSettingsPayload {
  return removeUndefined({
    display_name: values.display_name.trim(),
    short_name: cleanOptionalString(values.short_name),
    legal_name: cleanOptionalString(values.legal_name),
    inn: cleanOptionalString(values.inn),
    ogrn: cleanOptionalString(values.ogrn),
    legal_address: cleanOptionalString(values.legal_address),
    support_phone: cleanOptionalString(values.support_phone),
    support_email: cleanOptionalString(values.support_email),
    website: cleanOptionalString(values.website),
    logo_url: cleanOptionalString(values.logo_url),
    primary_color: cleanOptionalString(values.primary_color),
    secondary_color: cleanOptionalString(values.secondary_color),
    allow_cash_payment: values.allow_cash_payment,
    allow_card_payment: values.allow_card_payment,
    allow_transfer_payment: values.allow_transfer_payment,
    minimum_order_price_cents: Number(rublesToCents(values.minimum_order_price_rub) ?? 0),
    commission_basis_points: Number(percentToBasisPoints(values.commission_percent) ?? 0),
    cancellation_timeout_sec: Number(values.cancellation_timeout_sec ?? 300),
    driver_arrival_timeout_sec: Number(values.driver_arrival_timeout_sec ?? 900),
    dispatch: {
      initial_radius_meters: Number(values.dispatch.initial_radius_meters),
      max_radius_meters: Number(values.dispatch.max_radius_meters),
      radius_step_meters: Number(values.dispatch.radius_step_meters),
      radius_attempts_meters: values.dispatch.radius_attempts_meters_text.map(Number),
      max_drivers_per_offer: Number(values.dispatch.max_drivers_per_offer),
      driver_location_max_age_sec: Number(values.dispatch.driver_location_max_age_sec),
      offer_ttl_sec: Number(values.dispatch.offer_ttl_sec),
      accept_lock_ttl_sec: Number(values.dispatch.accept_lock_ttl_sec),
      worker_poll_timeout_sec: Number(values.dispatch.worker_poll_timeout_sec),
      recovery_interval_sec: Number(values.dispatch.recovery_interval_sec),
    },
  })
}

function cleanOptionalString(value?: string) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as T
}

export function TaxiParkSettingsForm({
  settings,
  onSubmit,
  isSaving,
}: {
  settings: TaxiParkSettings
  onSubmit: (payload: TaxiParkSettingsPayload) => void
  isSaving: boolean
}) {
  const { control, register, handleSubmit, formState } = useForm<
    FormInputValues,
    unknown,
    FormValues
  >({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(settings),
  })

  const errorText = getFirstFormError(formState.errors)

  return (
    <form className="space-y-5" onSubmit={handleSubmit((values) => onSubmit(toPayload(values)))}>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ['display_name', 'Название'],
          ['short_name', 'Короткое название'],
          ['legal_name', 'Юридическое название'],
          ['inn', 'ИНН'],
          ['ogrn', 'ОГРН'],
          ['legal_address', 'Юридический адрес'],
          ['support_phone', 'Телефон поддержки'],
          ['support_email', 'Email поддержки'],
          ['website', 'Сайт'],
          ['logo_url', 'Логотип URL'],
          ['minimum_order_price_rub', 'Минимальная цена, ₽'],
          ['commission_percent', 'Комиссия, %'],
          ['cancellation_timeout_sec', 'Таймаут отмены, сек'],
          ['driver_arrival_timeout_sec', 'Таймаут прибытия, сек'],
        ].map(([name, label]) => (
          <label key={name} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
            <Input {...register(name as keyof FormValues)} />
          </label>
        ))}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Основной цвет</span>
          <Controller
            control={control}
            name="primary_color"
            render={({ field }) => (
              <ColorPicker
                value={field.value}
                onChange={field.onChange}
                options={brandColorOptions}
                type="hex"
              />
            )}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Дополнительный цвет</span>
          <Controller
            control={control}
            name="secondary_color"
            render={({ field }) => (
              <ColorPicker
                value={field.value}
                onChange={field.onChange}
                options={brandColorOptions}
                type="hex"
              />
            )}
          />
        </label>
        <div className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Активен</span>
          <div className="flex h-10 items-center rounded-xl border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-600">
            {settings.is_active ? 'Да' : 'Нет'}
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ['allow_cash_payment', 'Наличные'],
          ['allow_card_payment', 'Карта'],
          ['allow_transfer_payment', 'Перевод'],
        ].map(([name, label]) => (
          <label key={name} className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4" {...register(name as keyof FormValues)} />
            {label}
          </label>
        ))}
      </div>
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4">
          <h3 className="text-base font-bold text-slate-950">Dispatch</h3>
          <p className="text-sm text-slate-500">
            Настройки поиска и предложения заказа водителям этого таксопарка.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ['dispatch.initial_radius_meters', 'Начальный радиус, м'],
            ['dispatch.max_radius_meters', 'Максимальный радиус, м'],
            ['dispatch.radius_step_meters', 'Шаг расширения радиуса, м'],
            ['dispatch.max_drivers_per_offer', 'Водителей в одном предложении'],
            ['dispatch.driver_location_max_age_sec', 'Актуальность геопозиции, сек'],
            ['dispatch.offer_ttl_sec', 'TTL предложения, сек'],
            ['dispatch.accept_lock_ttl_sec', 'TTL блокировки принятия, сек'],
            ['dispatch.worker_poll_timeout_sec', 'Таймаут worker poll, сек'],
            ['dispatch.recovery_interval_sec', 'Интервал recovery, сек'],
          ].map(([name, label]) => (
            <label key={name} className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
              <Input {...register(name as keyof FormValues)} type="number" min={1} />
            </label>
          ))}
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              Попытки радиуса, м
            </span>
            <Input
              {...register('dispatch.radius_attempts_meters_text' as keyof FormValues)}
              placeholder="10000, 30000, 50000, 100000"
            />
          </label>
        </div>
      </section>
      {errorText ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{errorText}</div> : null}
      <Button type="submit" disabled={isSaving}>
        Сохранить
      </Button>
    </form>
  )
}

function getFirstFormError(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  if ('message' in error && typeof error.message === 'string') return error.message

  for (const value of Object.values(error)) {
    const nested = getFirstFormError(value)
    if (nested) return nested
  }

  return undefined
}
