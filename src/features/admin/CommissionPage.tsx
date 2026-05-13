import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import type { CommissionRule } from '../../entities/types'
import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { DataTable } from '../../shared/ui/DataTable'
import { Input } from '../../shared/ui/Input'
import { Loader } from '../../shared/ui/Loader'
import { Select } from '../../shared/ui/Select'
import { basisPointsToPercent, percentToBasisPoints } from '../../shared/utils/format-money'
import { adminApi } from './api'

const schema = z.object({
  scope: z.enum(['global', 'city', 'tariff', 'taxi_park', 'driver']),
  target_id: z.string().optional(),
  percent: z.coerce.number().min(0).max(100),
  is_active: z.boolean(),
})

type FormValues = z.infer<typeof schema>
type FormInputValues = z.input<typeof schema>

const priorityText = 'Приоритет комиссии: водитель → таксопарк → тариф → город → глобальная. Глобальная комиссия по умолчанию: 1%.'

export function CommissionPage() {
  const queryClient = useQueryClient()
  const rules = useQuery({ queryKey: ['admin-commissions'], queryFn: adminApi.commissions })
  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      adminApi.saveCommission({
        scope: values.scope,
        basis_points: percentToBasisPoints(values.percent),
        is_active: values.is_active,
        city_id: values.scope === 'city' ? values.target_id : undefined,
        tariff_id: values.scope === 'tariff' ? values.target_id : undefined,
        taxi_park_id: values.scope === 'taxi_park' ? values.target_id : undefined,
        driver_id: values.scope === 'driver' ? values.target_id : undefined,
      }),
    onSuccess: () => {
      toast.success('Комиссия сохранена')
      void queryClient.invalidateQueries({ queryKey: ['admin-commissions'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (rules.isLoading) return <Loader />
  if (rules.isError) return <Card className="text-red-700">{getApiErrorMessage(rules.error)}</Card>

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">Настройка комиссии платформы</h2>
        <p className="mt-2 text-sm text-slate-500">{priorityText}</p>
        <CommissionForm isSaving={mutation.isPending} onSubmit={(values) => mutation.mutate(values)} />
      </Card>
      <DataTable<CommissionRule>
        title="Правила комиссий"
        rows={rules.data ?? []}
        getSearchText={(row) => `${row.scope} ${row.city_id ?? ''} ${row.tariff_id ?? ''} ${row.taxi_park_id ?? ''} ${row.driver_id ?? ''}`}
        getStatus={(row) => (row.is_active ? 'active' : 'inactive')}
        statusOptions={['active', 'inactive']}
        columns={[
          { key: 'scope', title: 'Уровень', sortable: true },
          { key: 'priority', title: 'Приоритет', sortable: true },
          { key: 'basis_points', title: 'Комиссия', render: (row) => `${basisPointsToPercent(row.basis_points)}%` },
          { key: 'is_active', title: 'Статус', render: (row) => <Badge variant={row.is_active ? 'success' : 'muted'}>{row.is_active ? 'active' : 'inactive'}</Badge> },
        ]}
      />
    </div>
  )
}

function CommissionForm({ onSubmit, isSaving }: { onSubmit: (values: FormValues) => void; isSaving: boolean }) {
  const { register, handleSubmit, formState } = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { scope: 'global', percent: 1, is_active: true },
  })

  return (
    <form className="mt-5 grid gap-3 md:grid-cols-[180px_1fr_160px_120px_auto]" onSubmit={handleSubmit(onSubmit)}>
      <Select {...register('scope')}>
        <option value="global">global</option>
        <option value="city">city</option>
        <option value="tariff">tariff</option>
        <option value="taxi_park">taxi_park</option>
        <option value="driver">driver</option>
      </Select>
      <Input placeholder="target_id для city/tariff/taxi_park/driver" {...register('target_id')} />
      <Input type="number" step="0.01" placeholder="%" {...register('percent')} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...register('is_active')} /> active</label>
      <Button type="submit" disabled={isSaving}>Сохранить</Button>
      {Object.values(formState.errors)[0]?.message ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-5">{String(Object.values(formState.errors)[0]?.message)}</div> : null}
    </form>
  )
}
