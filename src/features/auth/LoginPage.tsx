import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { useAuthStore } from '../../shared/auth/auth-store'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { LegalLinks } from '../legal/LegalLinks'
import { confirmPassengerCode, login, requestPassengerCode } from './api'

const employeeSchema = z.object({
  phone: z.string().min(6, 'Введите телефон'),
  password: z.string().min(1, 'Введите пароль'),
  role: z.enum(['taxi_park', 'dispatcher', 'driver']),
})

const passengerPhoneSchema = z.object({
  phone: z.string().min(6, 'Введите телефон'),
})

const passengerCodeSchema = z.object({
  code: z.string().trim().length(6, 'Код должен содержать 6 цифр'),
})

type EmployeeFormValues = z.infer<typeof employeeSchema>
type PassengerPhoneValues = z.infer<typeof passengerPhoneSchema>
type PassengerCodeValues = z.infer<typeof passengerCodeSchema>
type LoginRole = EmployeeFormValues['role'] | 'passenger'

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const [role, setRole] = useState<LoginRole>('taxi_park')
  const [codeRequested, setCodeRequested] = useState(false)
  const [codeMessage, setCodeMessage] = useState('')
  const [confirmedPhone, setConfirmedPhone] = useState('')

  const employeeForm = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { role: 'taxi_park', phone: '', password: '' },
  })

  const passengerPhoneForm = useForm<PassengerPhoneValues>({
    resolver: zodResolver(passengerPhoneSchema),
    defaultValues: { phone: '' },
  })

  const passengerCodeForm = useForm<PassengerCodeValues>({
    resolver: zodResolver(passengerCodeSchema),
    defaultValues: { code: '' },
  })

  const passengerPhone = useWatch({
    control: passengerPhoneForm.control,
    name: 'phone',
  })

  const employeeLoginMutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
      })
      navigate('/dashboard')
    },
  })

  const requestCodeMutation = useMutation({
    mutationFn: requestPassengerCode,
    onSuccess: (data, variables) => {
      setConfirmedPhone(variables.phone)
      setCodeRequested(true)
      setCodeMessage(data.message)
      passengerCodeForm.reset({ code: '' })
    },
  })

  const confirmCodeMutation = useMutation({
    mutationFn: confirmPassengerCode,
    onSuccess: (data) => {
      setSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
      })
      navigate('/dashboard')
    },
  })

  const isPassenger = role === 'passenger'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-2xl font-bold text-slate-950">Такси Пульт</div>
          <p className="mt-2 text-sm text-slate-500">
            {isPassenger ? 'Вход пассажира по SMS-коду' : 'Вход в панель управления'}
          </p>
        </div>

        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Роль</span>
          <Select
            value={role}
            onChange={(event) => {
              const nextRole = event.target.value as LoginRole
              setRole(nextRole)
              setCodeRequested(false)
              setCodeMessage('')
              setConfirmedPhone('')
              passengerCodeForm.reset({ code: '' })
              employeeForm.setValue('role', nextRole === 'passenger' ? 'taxi_park' : nextRole)
            }}
          >
            <option value="taxi_park">Таксопарк</option>
            <option value="dispatcher">Диспетчер</option>
            <option value="driver">Водитель</option>
            <option value="passenger">Пассажир</option>
          </Select>
        </label>

        {isPassenger ? (
          <div className="space-y-4">
            <form
              className="space-y-4"
              onSubmit={passengerPhoneForm.handleSubmit((values) => requestCodeMutation.mutate(values))}
            >
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Телефон</span>
                <Input
                  {...passengerPhoneForm.register('phone')}
                  placeholder="+79990000000"
                  autoComplete="tel"
                />
                {passengerPhoneForm.formState.errors.phone ? (
                  <span className="mt-1 block text-xs text-red-600">
                    {passengerPhoneForm.formState.errors.phone.message}
                  </span>
                ) : null}
              </label>

              <Button type="submit" className="w-full" disabled={requestCodeMutation.isPending}>
                {requestCodeMutation.isPending ? 'Отправка...' : 'Запросить SMS-код'}
              </Button>
            </form>

            {codeRequested ? (
              <form
                className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                onSubmit={passengerCodeForm.handleSubmit(({ code }) =>
                  confirmCodeMutation.mutate({ phone: confirmedPhone, code }),
                )}
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">Подтверждение входа</div>
                  <p className="mt-1 text-sm text-slate-500">
                    Код отправлен на {confirmedPhone}. {codeMessage}
                  </p>
                </div>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">SMS-код</span>
                  <Input
                    {...passengerCodeForm.register('code')}
                    placeholder="123456"
                    inputMode="numeric"
                    autoFocus
                  />
                  {passengerCodeForm.formState.errors.code ? (
                    <span className="mt-1 block text-xs text-red-600">
                      {passengerCodeForm.formState.errors.code.message}
                    </span>
                  ) : null}
                </label>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() =>
                      passengerPhoneForm.handleSubmit((values) => requestCodeMutation.mutate(values))()
                    }
                    disabled={requestCodeMutation.isPending || !passengerPhone?.trim()}
                  >
                    Отправить снова
                  </Button>
                  <Button type="submit" className="flex-1" disabled={confirmCodeMutation.isPending}>
                    {confirmCodeMutation.isPending ? 'Проверка...' : 'Войти'}
                  </Button>
                </div>
              </form>
            ) : null}

            {requestCodeMutation.isError ? (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {getApiErrorMessage(requestCodeMutation.error)}
              </div>
            ) : null}

            {confirmCodeMutation.isError ? (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {getApiErrorMessage(confirmCodeMutation.error)}
              </div>
            ) : null}
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={employeeForm.handleSubmit((values) => employeeLoginMutation.mutate(values))}
          >
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Телефон</span>
              <Input {...employeeForm.register('phone')} placeholder="+79990000000" autoComplete="tel" />
              {employeeForm.formState.errors.phone ? (
                <span className="mt-1 block text-xs text-red-600">
                  {employeeForm.formState.errors.phone.message}
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Пароль</span>
              <Input
                {...employeeForm.register('password')}
                type="password"
                placeholder="Введите пароль"
                autoComplete="current-password"
              />
              {employeeForm.formState.errors.password ? (
                <span className="mt-1 block text-xs text-red-600">
                  {employeeForm.formState.errors.password.message}
                </span>
              ) : null}
            </label>

            {employeeLoginMutation.isError ? (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {getApiErrorMessage(employeeLoginMutation.error)}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={employeeLoginMutation.isPending}>
              {employeeLoginMutation.isPending ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        )}

        <div className="mt-5 text-sm text-slate-500">
          Нет аккаунта водителя?{' '}
          <Link className="font-semibold text-[#F59E0B]" to="/register/driver">
            Зарегистрироваться
          </Link>
        </div>
        <LegalLinks className="mt-4 border-t border-slate-100 pt-4" />
      </Card>
    </div>
  )
}
