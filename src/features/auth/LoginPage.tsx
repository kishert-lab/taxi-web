import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { getApiErrorMessage } from '../../shared/api/errors'
import { useAuthStore } from '../../shared/auth/auth-store'
import { login } from './api'

const schema = z.object({
  phone: z.string().min(6, 'Введите телефон'),
  email: z.string().email('Введите корректный email'),
  role: z.enum([
    'super_admin',
    'city_admin',
    'dispatcher',
    'taxi_park_admin',
    'finance_manager',
    'moderator',
    'support',
  ]),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const setPendingLogin = useAuthStore((state) => state.setPendingLogin)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'super_admin' },
  })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (_data, variables) => {
      setPendingLogin(variables)
      navigate('/verify-code')
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
            <Input {...register('phone')} placeholder="+79990000000" />
            {errors.phone ? (
              <span className="mt-1 block text-xs text-red-600">{errors.phone.message}</span>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <Input {...register('email')} type="email" placeholder="admin@taxi.local" />
            {errors.email ? (
              <span className="mt-1 block text-xs text-red-600">{errors.email.message}</span>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Роль</span>
            <Select {...register('role')}>
              <option value="super_admin">super_admin</option>
              <option value="city_admin">city_admin</option>
              <option value="dispatcher">dispatcher</option>
              <option value="taxi_park_admin">taxi_park_admin</option>
              <option value="finance_manager">finance_manager</option>
              <option value="moderator">moderator</option>
              <option value="support">support</option>
            </Select>
          </label>
          {mutation.isError ? (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {getApiErrorMessage(mutation.error)}
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            Получить код
          </Button>
        </form>
      </Card>
    </div>
  )
}
