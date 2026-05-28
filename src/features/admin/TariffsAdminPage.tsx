import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

import type { Tariff } from '../../entities/types'
import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { DataTable } from '../../shared/ui/DataTable'
import { Input } from '../../shared/ui/Input'
import { Loader } from '../../shared/ui/Loader'
import { Modal } from '../../shared/ui/Modal'
import { Textarea } from '../../shared/ui/Textarea'
import { formatMoneyCents, rublesToCents } from '../../shared/utils/format-money'
import { adminApi } from './api'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  base_price_rub: z.coerce.number().min(0),
  minimum_price_rub: z.coerce.number().min(0),
  price_per_km_rub: z.coerce.number().min(0),
  price_per_minute_rub: z.coerce.number().min(0),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>
type FormInputValues = z.input<typeof schema>

export function TariffsAdminPage() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const tariffs = useQuery({ queryKey: ['admin-tariffs'], queryFn: adminApi.tariffs })
  const saveTariff = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        description: values.description,
        base_price_cents: rublesToCents(values.base_price_rub),
        minimum_price_cents: rublesToCents(values.minimum_price_rub),
        price_per_km_cents: rublesToCents(values.price_per_km_rub),
        price_per_minute_cents: rublesToCents(values.price_per_minute_rub),
        fixed_routes: [] as string[],
        is_active: values.is_active,
      }
      return adminApi.createTariff(payload)
    },
    onSuccess: () => {
      toast.success('Тариф сохранен')
      setOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['admin-tariffs'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (tariffs.isLoading) return <Loader />
  if (tariffs.isError) return <Card className="text-red-700">{getApiErrorMessage(tariffs.error)}</Card>

  return (
    <>
      <DataTable<Tariff>
        title="Тарифы"
        rows={tariffs.data ?? []}
        getSearchText={(row) => `${row.name} ${row.description ?? ''}`}
        getStatus={(row) => (row.is_active ? 'active' : 'inactive')}
        statusOptions={['active', 'inactive']}
        actions={<Button type="button" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Создать</Button>}
        columns={[
          { key: 'name', title: 'Название', sortable: true },
          { key: 'base_price_cents', title: 'База', render: (row) => formatMoneyCents(row.base_price_cents) },
          { key: 'minimum_price_cents', title: 'Минимум', render: (row) => formatMoneyCents(row.minimum_price_cents) },
          { key: 'price_per_km_cents', title: 'Км', render: (row) => formatMoneyCents(row.price_per_km_cents) },
          { key: 'price_per_minute_cents', title: 'Минута', render: (row) => formatMoneyCents(row.price_per_minute_cents) },
          { key: 'is_active', title: 'Статус', render: (row) => <Badge variant={row.is_active ? 'success' : 'muted'}>{row.is_active ? statusLabel('active') : statusLabel('inactive')}</Badge> },
        ]}
      />
      <Modal title="Форма тарифа" open={open} onClose={() => setOpen(false)}>
        <TariffAdminForm isSaving={saveTariff.isPending} onSubmit={(values) => saveTariff.mutate(values)} />
      </Modal>
    </>
  )
}

function TariffAdminForm({ onSubmit, isSaving }: { onSubmit: (values: FormValues) => void; isSaving: boolean }) {
  const { register, handleSubmit, formState } = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      base_price_rub: 0,
      minimum_price_rub: 0,
      price_per_km_rub: 0,
      price_per_minute_rub: 0,
      is_active: true,
    },
  })

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 md:grid-cols-2">
        <Input placeholder="Название" {...register('name')} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('is_active')} /> Активен</label>
        <Input type="number" step="0.01" placeholder="База, ₽" {...register('base_price_rub')} />
        <Input type="number" step="0.01" placeholder="Минимум, ₽" {...register('minimum_price_rub')} />
        <Input type="number" step="0.01" placeholder="Км, ₽" {...register('price_per_km_rub')} />
        <Input type="number" step="0.01" placeholder="Минута, ₽" {...register('price_per_minute_rub')} />
      </div>
      <Textarea placeholder="Описание" {...register('description')} />
      {Object.values(formState.errors)[0]?.message ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{String(Object.values(formState.errors)[0]?.message)}</div> : null}
      <Button type="submit" disabled={isSaving}>Сохранить</Button>
    </form>
  )
}
