import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { Textarea } from '../../shared/ui/Textarea'
import { adminApi } from './api'

const schema = z.object({
  passenger_name: z.string().min(2),
  passenger_phone: z.string().min(6),
  pickup_address: z.string().min(3),
  destination_address: z.string().min(3),
  city_id: z.string().min(1),
  tariff_id: z.string().min(1),
  comment: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export function CreateOrderPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { city_id: 'city-1', tariff_id: 'tariff-1' },
  })
  const mutation = useMutation({
    mutationFn: adminApi.createOrder,
    onSuccess: (order) => {
      toast.success('Заказ создан')
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      navigate(`/orders/${order.id}`)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  return (
    <Card>
      <h2 className="mb-5 text-lg font-bold text-slate-950 dark:text-white">Создание заказа диспетчером</h2>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Пассажир</span>
          <Input {...register('passenger_name')} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Телефон</span>
          <Input {...register('passenger_phone')} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Откуда</span>
          <Input {...register('pickup_address')} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Куда</span>
          <Input {...register('destination_address')} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Город</span>
          <Select {...register('city_id')}>
            <option value="city-1">Екатеринбург</option>
            <option value="city-2">Москва</option>
          </Select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Тариф</span>
          <Select {...register('tariff_id')}>
            <option value="tariff-1">Комфорт</option>
            <option value="tariff-2">Бизнес</option>
          </Select>
        </label>
        <label className="md:col-span-2">
          <span className="mb-1 block text-sm font-medium text-slate-700">Комментарий</span>
          <Textarea {...register('comment')} />
        </label>
        {Object.values(formState.errors)[0]?.message ? (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-2">
            {String(Object.values(formState.errors)[0]?.message)}
          </div>
        ) : null}
        <div className="md:col-span-2">
          <Button type="submit" disabled={mutation.isPending}>
            Создать заказ
          </Button>
        </div>
      </form>
    </Card>
  )
}
