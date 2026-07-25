import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, X } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { DataTable } from '../../shared/ui/DataTable'
import { Input } from '../../shared/ui/Input'
import { Loader } from '../../shared/ui/Loader'
import { Modal } from '../../shared/ui/Modal'
import { Select } from '../../shared/ui/Select'
import { formatDate } from '../../shared/utils/format-date'
import {
  approveAdminLocalPoint,
  createAdminLocalPoint,
  getAdminLocalPoints,
  rejectAdminLocalPoint,
  type AdminLocalPoint,
  type CreateAdminLocalPointPayload,
} from './api'

const createPointSchema = z.object({
  city_id: z.string().uuid('Укажите UUID города'),
  name: z.string().trim().min(2, 'Укажите название точки'),
  address: z.string().trim().min(3, 'Укажите адрес'),
  latitude: z.coerce.number().gte(-90).lte(90),
  longitude: z.coerce.number().gte(-180).lte(180),
  trust_level: z.enum(['confirmed', 'trusted', 'rejected']),
})

type CreatePointForm = z.infer<typeof createPointSchema>
type CreatePointFormInput = z.input<typeof createPointSchema>

const localPointsQueryKey = ['admin-geocoder-local-points']

export function AdminGeocoderPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const points = useQuery({ queryKey: localPointsQueryKey, queryFn: () => getAdminLocalPoints() })
  const invalidatePoints = () => queryClient.invalidateQueries({ queryKey: localPointsQueryKey })

  const createPoint = useMutation({
    mutationFn: createAdminLocalPoint,
    onSuccess: () => {
      toast.success('Геоточка создана')
      setIsCreateOpen(false)
      void invalidatePoints()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const approvePoint = useMutation({
    mutationFn: approveAdminLocalPoint,
    onSuccess: () => {
      toast.success('Геоточка подтверждена')
      void invalidatePoints()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const rejectPoint = useMutation({
    mutationFn: rejectAdminLocalPoint,
    onSuccess: () => {
      toast.success('Геоточка отклонена')
      void invalidatePoints()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (points.isLoading) return <Loader />
  if (points.isError) return <Card className="text-red-700">{getApiErrorMessage(points.error)}</Card>

  return (
    <>
      <DataTable<AdminLocalPoint>
        title="Доверенные геоточки"
        rows={points.data ?? []}
        getSearchText={(point) => `${point.name} ${point.address} ${point.city_id}`}
        getStatus={(point) => point.trust_level}
        statusOptions={['confirmed', 'trusted', 'rejected']}
        actions={
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Создать точку
          </Button>
        }
        columns={[
          { key: 'name', title: 'Точка', sortable: true },
          { key: 'address', title: 'Адрес', sortable: true },
          {
            key: 'trust_level',
            title: 'Доверие',
            render: (point) => <TrustLevelBadge trustLevel={point.trust_level} />,
          },
          {
            key: 'confirmation_count',
            title: 'Подтверждения',
            sortable: true,
            render: (point) => `${point.confirmation_count} / ${point.reject_count}`,
          },
          {
            key: 'coordinates',
            title: 'Координаты',
            render: (point) => `${point.coordinates.latitude.toFixed(5)}, ${point.coordinates.longitude.toFixed(5)}`,
          },
          { key: 'updated_at', title: 'Обновлено', sortable: true, render: (point) => formatDate(point.updated_at) },
          {
            key: 'actions',
            title: '',
            render: (point) => (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-8 px-2"
                  disabled={point.trust_level === 'trusted' || approvePoint.isPending}
                  onClick={() => approvePoint.mutate(point.id)}
                  title="Подтвердить"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="h-8 px-2"
                  disabled={point.trust_level === 'rejected' || rejectPoint.isPending}
                  onClick={() => rejectPoint.mutate(point.id)}
                  title="Отклонить"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ),
          },
        ]}
      />
      <CreateLocalPointModal
        open={isCreateOpen}
        isSaving={createPoint.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={(values) => createPoint.mutate(values)}
      />
    </>
  )
}

function TrustLevelBadge({ trustLevel }: { trustLevel: AdminLocalPoint['trust_level'] }) {
  const variant = trustLevel === 'trusted' ? 'success' : trustLevel === 'rejected' ? 'danger' : 'warning'
  const label = trustLevel === 'trusted' ? 'Доверенная' : trustLevel === 'rejected' ? 'Отклонена' : 'На проверке'

  return <Badge variant={variant}>{label}</Badge>
}

function CreateLocalPointModal({
  open,
  isSaving,
  onClose,
  onSubmit,
}: {
  open: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (payload: CreateAdminLocalPointPayload) => void
}) {
  const form = useForm<CreatePointFormInput, unknown, CreatePointForm>({
    resolver: zodResolver(createPointSchema),
    defaultValues: { city_id: '', name: '', address: '', latitude: 0, longitude: 0, trust_level: 'trusted' },
  })

  const submit = (values: CreatePointForm) => {
    onSubmit({
      city_id: values.city_id,
      name: values.name,
      address: values.address,
      coordinates: { latitude: values.latitude, longitude: values.longitude },
      trust_level: values.trust_level,
    })
  }

  return (
    <Modal title="Новая доверенная геоточка" open={open} onClose={onClose}>
      <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
        <Field label="UUID города" error={form.formState.errors.city_id?.message}>
          <Input {...form.register('city_id')} placeholder="00000000-0000-0000-0000-000000000000" />
        </Field>
        <Field label="Название" error={form.formState.errors.name?.message}>
          <Input {...form.register('name')} placeholder="Бизнес-центр" />
        </Field>
        <Field label="Адрес" error={form.formState.errors.address?.message}>
          <Input {...form.register('address')} placeholder="Екатеринбург, улица Мира, 19" />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Широта" error={form.formState.errors.latitude?.message}>
            <Input type="number" step="any" {...form.register('latitude')} />
          </Field>
          <Field label="Долгота" error={form.formState.errors.longitude?.message}>
            <Input type="number" step="any" {...form.register('longitude')} />
          </Field>
        </div>
        <Field label="Начальный статус" error={form.formState.errors.trust_level?.message}>
          <Select {...form.register('trust_level')}>
            <option value="trusted">Доверенная</option>
            <option value="confirmed">На проверке</option>
            <option value="rejected">Отклонена</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={isSaving}>Создать</Button>
        </div>
      </form>
    </Modal>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  )
}
