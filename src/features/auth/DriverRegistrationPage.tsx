import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { LegalLinks } from '../legal/LegalLinks'
import { confirmPhone, registerDriver, type RegistrationResponse } from './api'

const registrationSchema = z.object({
  phone: z.string().min(6, 'Введите телефон'),
  email: z.string().email('Введите корректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  first_name: z.string().min(1, 'Введите имя'),
  last_name: z.string().optional(),
  city_id: z.string().uuid('Введите UUID города').optional().or(z.literal('')),
  personal_data_consent: z.literal(true, {
    error: 'Нужно согласие на обработку персональных данных',
  }),
  terms_accepted: z.literal(true, {
    error: 'Нужно принять условия сервиса',
  }),
})

const confirmSchema = z.object({
  code: z.string().length(6, 'Код должен содержать 6 цифр'),
})

type RegistrationFormValues = z.infer<typeof registrationSchema>
type ConfirmFormValues = z.infer<typeof confirmSchema>

export function DriverRegistrationPage() {
  const [registration, setRegistration] = useState<RegistrationResponse | null>(null)
  const [phone, setPhone] = useState('')
  const registrationForm = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      personal_data_consent: true,
      terms_accepted: true,
      city_id: '',
    },
  })
  const confirmForm = useForm<ConfirmFormValues>({
    resolver: zodResolver(confirmSchema),
  })

  const registerMutation = useMutation({
    mutationFn: registerDriver,
    onSuccess: (data, variables) => {
      setRegistration(data)
      setPhone(variables.phone)
      toast.success('Водитель зарегистрирован. Подтвердите телефон')
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const confirmMutation = useMutation({
    mutationFn: confirmPhone,
    onSuccess: () => toast.success('Телефон подтвержден. Теперь можно войти'),
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4">
      <Card className="w-full max-w-2xl">
        <div className="mb-6">
          <div className="text-2xl font-bold text-slate-950">Регистрация водителя</div>
          <p className="mt-2 text-sm text-slate-500">
            После регистрации подтвердите телефон кодом из SMS или debug_code.
          </p>
        </div>

        {!registration ? (
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={registrationForm.handleSubmit((values) =>
              registerMutation.mutate({
                phone: values.phone,
                email: values.email,
                password: values.password,
                first_name: values.first_name,
                last_name: values.last_name,
                city_id: values.city_id || undefined,
                registration_type: 'driver',
                personal_data_consent: values.personal_data_consent,
                terms_accepted: values.terms_accepted,
                privacy_policy_version: '1.0',
                terms_version: '1.0',
              }),
            )}
          >
            <Field label="Телефон" error={registrationForm.formState.errors.phone?.message}>
              <Input {...registrationForm.register('phone')} placeholder="+79990000000" />
            </Field>
            <Field label="Email" error={registrationForm.formState.errors.email?.message}>
              <Input {...registrationForm.register('email')} type="email" />
            </Field>
            <Field label="Пароль" error={registrationForm.formState.errors.password?.message}>
              <Input {...registrationForm.register('password')} type="password" />
            </Field>
            <Field label="Имя" error={registrationForm.formState.errors.first_name?.message}>
              <Input {...registrationForm.register('first_name')} />
            </Field>
            <Field label="Фамилия" error={registrationForm.formState.errors.last_name?.message}>
              <Input {...registrationForm.register('last_name')} />
            </Field>
            <Field label="city_id" error={registrationForm.formState.errors.city_id?.message}>
              <Input {...registrationForm.register('city_id')} placeholder="UUID города, если требуется" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...registrationForm.register('personal_data_consent')} />
              <span>
                Даю{' '}
                <Link className="font-semibold text-[#F59E0B]" to="/legal/consent" target="_blank">
                  согласие на обработку персональных данных
                </Link>
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" {...registrationForm.register('terms_accepted')} />
              <span>
                Принимаю{' '}
                <Link className="font-semibold text-[#F59E0B]" to="/legal/terms" target="_blank">
                  пользовательское соглашение
                </Link>{' '}
                и{' '}
                <Link className="font-semibold text-[#F59E0B]" to="/legal/privacy-policy" target="_blank">
                  политику конфиденциальности
                </Link>
              </span>
            </label>
            <div className="md:col-span-2">
              <Button type="submit" disabled={registerMutation.isPending}>
                Зарегистрировать водителя
              </Button>
            </div>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={confirmForm.handleSubmit(({ code }) =>
              confirmMutation.mutate({
                phone,
                registration_type: 'driver',
                code,
              }),
            )}
          >
            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              Код отправлен на {registration.phone_masked}.
              {registration.debug_code ? ` Debug code: ${registration.debug_code}` : null}
            </div>
            <Field label="Код подтверждения" error={confirmForm.formState.errors.code?.message}>
              <Input {...confirmForm.register('code')} inputMode="numeric" autoFocus />
            </Field>
            <Button type="submit" disabled={confirmMutation.isPending}>
              Подтвердить телефон
            </Button>
          </form>
        )}

        <div className="mt-6 text-sm">
          <Link className="font-semibold text-[#F59E0B]" to="/login">
            Вернуться ко входу
          </Link>
        </div>
        <LegalLinks className="mt-4 border-t border-slate-100 pt-4" />
      </Card>
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
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </label>
  )
}
