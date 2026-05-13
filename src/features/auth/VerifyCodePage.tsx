import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { useAuthStore } from '../../shared/auth/auth-store'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { verifyCode } from './api'

const schema = z.object({
  code: z.string().min(4, 'Введите код'),
})

type FormValues = z.infer<typeof schema>

export function VerifyCodePage() {
  const navigate = useNavigate()
  const pendingLogin = useAuthStore((state) => state.pendingLogin)
  const setSession = useAuthStore((state) => state.setSession)
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const mutation = useMutation({
    mutationFn: verifyCode,
    onSuccess: (data) => {
      setSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
      })
      navigate('/dashboard')
    },
  })

  if (!pendingLogin) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6">
          <div className="text-2xl font-bold text-slate-950">Подтверждение кода</div>
          <p className="mt-2 text-sm text-slate-500">{pendingLogin.email}</p>
        </div>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(({ code }) => mutation.mutate({ ...pendingLogin, code }))}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Код</span>
            <Input {...register('code')} autoFocus inputMode="numeric" />
            {formState.errors.code ? (
              <span className="mt-1 block text-xs text-red-600">
                {formState.errors.code.message}
              </span>
            ) : null}
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
      </Card>
    </div>
  )
}
