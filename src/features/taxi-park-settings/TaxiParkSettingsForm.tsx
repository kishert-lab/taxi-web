import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import {
  basisPointsToPercent,
  centsToRubles,
  percentToBasisPoints,
  rublesToCents,
} from '../../shared/utils/format-money'
import type { TaxiParkSettings } from './api'

const hexColor = /^#[0-9A-Fa-f]{6}$/

const schema = z.object({
  display_name: z.string().min(1),
  short_name: z.string().min(1),
  legal_name: z.string().min(1),
  inn: z.string().regex(/^(\d{10}|\d{12})$/, 'ИНН должен содержать 10 или 12 цифр'),
  ogrn: z.string().regex(/^(\d{13}|\d{15})$/, 'ОГРН должен содержать 13 или 15 цифр'),
  legal_address: z.string().min(1),
  support_phone: z.string().min(6),
  support_email: z.string().email(),
  website: z.string().url().optional().or(z.literal('')),
  logo_url: z.string().url().optional().or(z.literal('')),
  primary_color: z.string().regex(hexColor, 'HEX цвет'),
  secondary_color: z.string().regex(hexColor, 'HEX цвет'),
  allow_cash_payment: z.boolean(),
  allow_card_payment: z.boolean(),
  allow_transfer_payment: z.boolean(),
  minimum_order_price_rub: z.coerce.number().min(0),
  commission_percent: z.coerce.number().min(0).max(100),
  cancellation_timeout_sec: z.coerce.number().int().min(1),
  driver_arrival_timeout_sec: z.coerce.number().int().min(1),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>
type FormInputValues = z.input<typeof schema>

function toFormValues(settings: TaxiParkSettings): FormValues {
  return {
    ...settings,
    minimum_order_price_rub: centsToRubles(settings.minimum_order_price_cents),
    commission_percent: basisPointsToPercent(settings.commission_basis_points),
  }
}

function toPayload(values: FormValues): TaxiParkSettings {
  return {
    display_name: values.display_name,
    short_name: values.short_name,
    legal_name: values.legal_name,
    inn: values.inn,
    ogrn: values.ogrn,
    legal_address: values.legal_address,
    support_phone: values.support_phone,
    support_email: values.support_email,
    website: values.website,
    logo_url: values.logo_url,
    primary_color: values.primary_color,
    secondary_color: values.secondary_color,
    allow_cash_payment: values.allow_cash_payment,
    allow_card_payment: values.allow_card_payment,
    allow_transfer_payment: values.allow_transfer_payment,
    minimum_order_price_cents: rublesToCents(values.minimum_order_price_rub),
    commission_basis_points: percentToBasisPoints(values.commission_percent),
    cancellation_timeout_sec: values.cancellation_timeout_sec,
    driver_arrival_timeout_sec: values.driver_arrival_timeout_sec,
    is_active: values.is_active,
  }
}

export function TaxiParkSettingsForm({
  settings,
  onSubmit,
  isSaving,
}: {
  settings: TaxiParkSettings
  onSubmit: (payload: TaxiParkSettings) => void
  isSaving: boolean
}) {
  const { register, handleSubmit, formState } = useForm<
    FormInputValues,
    unknown,
    FormValues
  >({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(settings),
  })

  const errorText = Object.values(formState.errors)[0]?.message

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
          ['primary_color', 'Основной цвет'],
          ['secondary_color', 'Дополнительный цвет'],
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
          <span className="mb-1 block text-sm font-medium text-slate-700">Активен</span>
          <Select {...register('is_active', { setValueAs: (value) => value === 'true' })}>
            <option value="true">Да</option>
            <option value="false">Нет</option>
          </Select>
        </label>
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
      {errorText ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{String(errorText)}</div> : null}
      <Button type="submit" disabled={isSaving}>
        Сохранить
      </Button>
    </form>
  )
}
