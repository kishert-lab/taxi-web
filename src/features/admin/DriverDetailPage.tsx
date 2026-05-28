import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useParams } from 'react-router-dom'

import type { DriverDocument } from '../../entities/types'
import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card, StatCard } from '../../shared/ui/Card'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { Loader } from '../../shared/ui/Loader'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents } from '../../shared/utils/format-money'
import { adminApi } from './api'
import { useState } from 'react'

export function DriverDetailPage() {
  const { id = '' } = useParams()
  const [moderation, setModeration] = useState<{ document: DriverDocument; status: DriverDocument['status'] } | null>(null)
  const queryClient = useQueryClient()
  const driver = useQuery({ queryKey: ['admin-driver', id], queryFn: () => adminApi.driver(id) })
  const mutation = useMutation({
    mutationFn: ({ document, status }: { document: DriverDocument; status: DriverDocument['status'] }) =>
      adminApi.moderateDriverDocument(document.id, status),
    onSuccess: () => {
      toast.success('Статус документа обновлен')
      setModeration(null)
      void queryClient.invalidateQueries({ queryKey: ['admin-driver', id] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (driver.isLoading) return <Loader />
  if (driver.isError) return <Card className="text-red-700">{getApiErrorMessage(driver.error)}</Card>
  if (!driver.data) return null

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Рейтинг" value={driver.data.rating.toFixed(2)} />
        <StatCard title="Статус" value={statusLabel(driver.data.status)} />
        <StatCard title="Баланс" value={formatMoneyCents(driver.data.balance)} />
        <StatCard title="Добавлен" value={formatDate(driver.data.created_at)} />
      </div>
      <Card>
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">{driver.data.full_name}</h2>
        <p className="mt-2 text-sm text-slate-500">{driver.data.phone} · user_id {driver.data.user_id}</p>
      </Card>
      <Card>
        <h3 className="mb-4 font-bold text-slate-950 dark:text-white">Документы</h3>
        <div className="space-y-3">
          {driver.data.documents.map((document) => (
            <div key={document.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">{document.type}</div>
                <Badge variant={statusVariant(document.status)}>{statusLabel(document.status)}</Badge>
                {document.comment ? <p className="mt-1 text-sm text-red-600">{document.comment}</p> : null}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setModeration({ document, status: 'approved' })}>Одобрить</Button>
                <Button type="button" variant="danger" onClick={() => setModeration({ document, status: 'rejected' })}>Отклонить</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <ConfirmModal
        open={Boolean(moderation)}
        title="Модерация документа"
        description={`Изменить статус документа на ${statusLabel(moderation?.status)}?`}
        onCancel={() => setModeration(null)}
        onConfirm={() => moderation && mutation.mutate(moderation)}
      />
    </div>
  )
}
