import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Textarea } from '../../shared/ui/Textarea'
import { centsToRubles, rublesToCents } from '../../shared/utils/format-money'
import type { Tariff, TariffPayload } from './api'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  base_price_rub: z.coerce.number().min(0),
  minimum_price_rub: z.coerce.number().min(0),
  price_per_km_rub: z.coerce.number().min(0),
  price_per_minute_rub: z.coerce.number().min(0),
  fixed_routes: z.string().optional(),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>
type FormInputValues = z.input<typeof schema>

function defaultValues(tariff?: Tariff): FormValues {
  return {
    name: tariff?.name ?? '',
    description: tariff?.description ?? '',
    base_price_rub: centsToRubles(tariff?.base_price_cents ?? 0),
    minimum_price_rub: centsToRubles(tariff?.minimum_price_cents ?? 0),
    price_per_km_rub: centsToRubles(tariff?.price_per_km_cents ?? 0),
    price_per_minute_rub: centsToRubles(tariff?.price_per_minute_cents ?? 0),
    fixed_routes: tariff?.fixed_routes?.join('\n') ?? '',
    is_active: tariff?.is_active ?? true,
  }
}

function toPayload(values: FormValues): TariffPayload {
  return {
    name: values.name,
    description: values.description,
    base_price_cents: rublesToCents(values.base_price_rub),
    minimum_price_cents: rublesToCents(values.minimum_price_rub),
    price_per_km_cents: rublesToCents(values.price_per_km_rub),
    price_per_minute_cents: rublesToCents(values.price_per_minute_rub),
    fixed_routes: values.fixed_routes?.split('\n').map((route) => route.trim()).filter(Boolean) ?? [],
    is_active: values.is_active,
  }
}

export function TariffForm({
  tariff,
  onSubmit,
  isSaving,
}: {
  tariff?: Tariff
  onSubmit: (payload: TariffPayload) => void
  isSaving: boolean
}) {
  const { register, handleSubmit, formState } = useForm<
    FormInputValues,
    unknown,
    FormValues
  >({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(tariff),
  })

  const errorText = Object.values(formState.errors)[0]?.message

  return (
    <form className="space-y-4" onSubmit={handleSubmit((values) => onSubmit(toPayload(values)))}>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Название</span>
          <Input {...register('name')} />
        </label>
        <label className="flex items-end gap-2 text-sm text-slate-700">
          <input type="checkbox" className="mb-3 h-4 w-4" {...register('is_active')} />
          <span className="mb-2">Активен</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Базовая цена, ₽</span>
          <Input type="number" step="0.01" {...register('base_price_rub')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Минимальная цена, ₽</span>
          <Input type="number" step="0.01" {...register('minimum_price_rub')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Цена за км, ₽</span>
          <Input type="number" step="0.01" {...register('price_per_km_rub')} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Цена за минуту, ₽</span>
          <Input type="number" step="0.01" {...register('price_per_minute_rub')} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Описание</span>
        <Textarea {...register('description')} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Фиксированные маршруты</span>
        <Textarea {...register('fixed_routes')} placeholder="Один маршрут на строку" />
      </label>
      {errorText ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{String(errorText)}</div> : null}
      <Button type="submit" disabled={isSaving}>
        Сохранить тариф
      </Button>
    </form>
  )
}
