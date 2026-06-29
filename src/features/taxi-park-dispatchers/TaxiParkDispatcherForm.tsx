import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import type {
  TaxiParkCreateDispatcherPayload,
  TaxiParkDispatcher,
  TaxiParkUpdateDispatcherPayload,
} from './api'

const createSchema = z.object({
  phone: z.string().trim().min(1, 'Введите телефон'),
  password: z.string().trim().min(8, 'Пароль должен быть не короче 8 символов'),
  email: z.email('Введите корректный email').or(z.literal('')).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
})

const updateSchema = z.object({
  email: z.email('Введите корректный email').or(z.literal('')).optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
})

type CreateValues = z.infer<typeof createSchema>
type UpdateValues = z.infer<typeof updateSchema>

export function TaxiParkDispatcherForm({
  dispatcher,
  isSaving,
  onCreate,
  onUpdate,
}: {
  dispatcher?: TaxiParkDispatcher
  isSaving: boolean
  onCreate: (payload: TaxiParkCreateDispatcherPayload) => void
  onUpdate: (payload: TaxiParkUpdateDispatcherPayload) => void
}) {
  const createForm = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      phone: '',
      password: '',
      email: '',
      first_name: '',
      last_name: '',
    },
  })

  const updateForm = useForm<UpdateValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      email: dispatcher?.email ?? '',
      first_name: dispatcher?.first_name ?? '',
      last_name: dispatcher?.last_name ?? '',
    },
  })

  if (dispatcher) {
    return (
      <form className="space-y-4" onSubmit={updateForm.handleSubmit((values) => onUpdate(values))}>
        <Field label="Телефон">
          <Input value={dispatcher.phone} disabled />
        </Field>
        <Field label="Email" error={updateForm.formState.errors.email?.message}>
          <Input {...updateForm.register('email')} placeholder="dispatcher@example.com" />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Имя">
            <Input {...updateForm.register('first_name')} placeholder="Иван" />
          </Field>
          <Field label="Фамилия">
            <Input {...updateForm.register('last_name')} placeholder="Петров" />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form className="space-y-4" onSubmit={createForm.handleSubmit((values) => onCreate(values))}>
      <Field label="Телефон" error={createForm.formState.errors.phone?.message}>
        <Input {...createForm.register('phone')} placeholder="+79990000000" />
      </Field>
      <Field label="Пароль" error={createForm.formState.errors.password?.message}>
        <Input {...createForm.register('password')} type="password" placeholder="strong-password" />
      </Field>
      <Field label="Email" error={createForm.formState.errors.email?.message}>
        <Input {...createForm.register('email')} placeholder="dispatcher@example.com" />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Имя">
          <Input {...createForm.register('first_name')} placeholder="Иван" />
        </Field>
        <Field label="Фамилия">
          <Input {...createForm.register('last_name')} placeholder="Петров" />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Создание...' : 'Создать диспетчера'}
        </Button>
      </div>
    </form>
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
