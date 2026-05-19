import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { useAuthStore } from '../../shared/auth/auth-store'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { login } from './api'

const schema = z.object({
  phone: z.string().min(6, 'Введите телефон'),
  password: z.string().min(1, 'Введите пароль'),
  role: z.enum(['admin', 'taxi_park', 'dispatcher', 'driver', 'passenger']),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'admin' },
  })

  const mutation = useMutation({
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-2xl font-bold text-slate-950">Taxi Platform</div>
          <p className="mt-2 text-sm text-slate-500">Вход в панель управления</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Телефон</span>
            <Input {...register('phone')} placeholder="+79990000000" autoComplete="tel" />
            {errors.phone ? (
              <span className="mt-1 block text-xs text-red-600">{errors.phone.message}</span>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Пароль</span>
            <Input
              {...register('password')}
              type="password"
              placeholder="Введите пароль"
              autoComplete="current-password"
            />
            {errors.password ? (
              <span className="mt-1 block text-xs text-red-600">
                {errors.password.message}
              </span>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Роль</span>
            <Select {...register('role')}>
              <option value="admin">admin</option>
              <option value="taxi_park">taxi_park</option>
              <option value="dispatcher">dispatcher</option>
              <option value="driver">driver</option>
              <option value="passenger">passenger</option>
            </Select>
          </label>
          {mutation.isError ? (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {getApiErrorMessage(mutation.error)}
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            Войти
          </Button>
        </form>
        <div className="mt-5 text-sm text-slate-500">
          Нет аккаунта водителя?{' '}
          <Link className="font-semibold text-[#F59E0B]" to="/register/driver">
            Зарегистрироваться
          </Link>
        </div>
      </Card>
    </div>
  )
}
