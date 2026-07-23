import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { useAuthStore } from '../../shared/auth/auth-store'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Skeleton } from '../../shared/ui/Loader'
import { formatDate } from '../../shared/utils/format-date'
import { getPassengerProfile, updatePassengerProfile } from './api'
import { PassengerSupportChatCard } from './PassengerSupportChatCard'

const schema = z.object({
  name: z.string().optional(),
  email: z.string().email('Введите корректный email').or(z.literal('')).optional(),
  avatar_url: z.string().url('Введите корректный URL').or(z.literal('')).optional(),
})

type FormValues = z.infer<typeof schema>

export function PassengerProfilePage() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)

  const profile = useQuery({
    queryKey: ['passenger-profile'],
    queryFn: getPassengerProfile,
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      avatar_url: '',
    },
  })

  useEffect(() => {
    if (!profile.data) return
    form.reset({
      name: profile.data.name ?? '',
      email: profile.data.email ?? '',
      avatar_url: profile.data.avatar_url ?? '',
    })
  }, [form, profile.data])

  const updateMutation = useMutation({
    mutationFn: updatePassengerProfile,
    onSuccess: (data) => {
      toast.success('Профиль обновлен')
      setUser({
        id: data.id,
        phone: data.phone,
        email: data.email,
        name: data.name ?? data.phone,
        role: 'passenger',
      })
      queryClient.setQueryData(['passenger-profile'], data)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (profile.isLoading) return <Skeleton className="h-80" />
  if (profile.isError) return <Card className="text-red-700">{getApiErrorMessage(profile.error)}</Card>
  if (!profile.data) return null

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card>
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-950">Профиль пассажира</h2>
          <p className="text-sm text-slate-500">Личные данные и контактная информация.</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}
        >
          <Field label="Телефон">
            <Input value={profile.data.phone} disabled />
          </Field>
          <Field label="Имя" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} placeholder="Иван" />
          </Field>
          <Field label="Email" error={form.formState.errors.email?.message}>
            <Input {...form.register('email')} placeholder="ivan@example.com" />
          </Field>
          <Field label="Avatar URL" error={form.formState.errors.avatar_url?.message}>
            <Input {...form.register('avatar_url')} placeholder="https://cdn.example.com/avatar.jpg" />
          </Field>
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="Создан" value={formatDate(profile.data.created_at)} />
            <Info label="Обновлен" value={formatDate(profile.data.updated_at)} />
            <Info label="Активен" value={profile.data.is_active ? 'Да' : 'Нет'} />
            <Info label="Телефон подтвержден" value={profile.data.phone_verified ? 'Да' : 'Нет'} />
          </div>

          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </form>
      </Card>

      <PassengerSupportChatCard />
    </div>
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-800">{value}</div>
    </div>
  )
}
