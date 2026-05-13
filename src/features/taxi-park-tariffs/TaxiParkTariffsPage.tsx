import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Plus, Power } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Skeleton } from '../../shared/ui/Loader'
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatMoneyCents } from '../../shared/utils/format-money'
import { createTariff, getTariffs, type Tariff, type TariffPayload, updateTariff } from './api'
import { TariffEditModal } from './TariffEditModal'

export function TaxiParkTariffsPage() {
  const queryClient = useQueryClient()
  const [editingTariff, setEditingTariff] = useState<Tariff | undefined>()
  const [modalOpen, setModalOpen] = useState(false)
  const tariffs = useQuery({ queryKey: ['taxi-park-tariffs'], queryFn: getTariffs })

  const createMutation = useMutation({
    mutationFn: createTariff,
    onSuccess: () => {
      toast.success('Тариф создан')
      setModalOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-tariffs'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TariffPayload> }) =>
      updateTariff(id, payload),
    onSuccess: () => {
      toast.success('Тариф сохранен')
      setModalOpen(false)
      setEditingTariff(undefined)
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-tariffs'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  function submitTariff(payload: TariffPayload) {
    if (editingTariff) {
      updateMutation.mutate({ id: editingTariff.id, payload })
      return
    }
    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Тарифы</h2>
          <p className="text-sm text-slate-500">Стоимость отображается в рублях</p>
        </div>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Создать
        </Button>
      </Card>
      {tariffs.isLoading ? <Skeleton className="h-64" /> : null}
      {tariffs.isError ? <Card className="text-red-700">{getApiErrorMessage(tariffs.error)}</Card> : null}
      {tariffs.data?.length === 0 ? <EmptyState title="Тарифы не найдены" /> : null}
      {tariffs.data?.length ? (
        <Card>
          <Table>
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 p-3">Название</th>
                <th className="border-b border-slate-200 p-3">База</th>
                <th className="border-b border-slate-200 p-3">Минимум</th>
                <th className="border-b border-slate-200 p-3">Км</th>
                <th className="border-b border-slate-200 p-3">Минута</th>
                <th className="border-b border-slate-200 p-3">Статус</th>
                <th className="border-b border-slate-200 p-3" />
              </tr>
            </thead>
            <tbody>
              {tariffs.data.map((tariff) => (
                <tr key={tariff.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 p-3 font-medium">{tariff.name}</td>
                  <td className="border-b border-slate-100 p-3">{formatMoneyCents(tariff.base_price_cents)}</td>
                  <td className="border-b border-slate-100 p-3">{formatMoneyCents(tariff.minimum_price_cents)}</td>
                  <td className="border-b border-slate-100 p-3">{formatMoneyCents(tariff.price_per_km_cents)}</td>
                  <td className="border-b border-slate-100 p-3">{formatMoneyCents(tariff.price_per_minute_cents)}</td>
                  <td className="border-b border-slate-100 p-3">
                    <Badge variant={tariff.is_active ? 'success' : 'muted'}>{tariff.is_active ? 'active' : 'inactive'}</Badge>
                  </td>
                  <td className="border-b border-slate-100 p-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 w-9 p-0"
                        onClick={() => {
                          setEditingTariff(tariff)
                          setModalOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 w-9 p-0"
                        onClick={() =>
                          updateMutation.mutate({
                            id: tariff.id,
                            payload: { is_active: !tariff.is_active },
                          })
                        }
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}
      <TariffEditModal
        open={modalOpen}
        tariff={editingTariff}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setModalOpen(false)
          setEditingTariff(undefined)
        }}
        onSubmit={submitTariff}
      />
    </div>
  )
}
