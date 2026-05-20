import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Lock, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { Skeleton } from '../../shared/ui/Loader'
import { Modal } from '../../shared/ui/Modal'
import { Select } from '../../shared/ui/Select'
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import { getTaxiParkCars } from '../taxi-park-cars/api'
import {
  archiveTaxiParkDriver,
  blockTaxiParkDriver,
  createTaxiParkDriver,
  getTaxiParkDrivers,
  type TaxiParkDriver,
  type TaxiParkDriverPayload,
  updateTaxiParkDriver,
} from './api'
import { TaxiParkDriverForm } from './TaxiParkDriverForm'

export function TaxiParkDriversPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<TaxiParkDriver | undefined>()
  const [blockingDriver, setBlockingDriver] = useState<TaxiParkDriver | null>(null)
  const [archivingDriver, setArchivingDriver] = useState<TaxiParkDriver | null>(null)

  const drivers = useQuery({
    queryKey: ['taxi-park-drivers', status],
    queryFn: () => getTaxiParkDrivers(status || undefined),
  })
  const cars = useQuery({
    queryKey: ['taxi-park-cars'],
    queryFn: getTaxiParkCars,
  })

  const invalidateDrivers = () =>
    queryClient.invalidateQueries({ queryKey: ['taxi-park-drivers'] })

  const createMutation = useMutation({
    mutationFn: createTaxiParkDriver,
    onSuccess: (data) => {
      const passwordText = data.generated_password
        ? ` Временный пароль: ${data.generated_password}`
        : ''
      toast.success(`Водитель создан.${passwordText}`)
      setModalOpen(false)
      void invalidateDrivers()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ driverId, payload }: { driverId: string; payload: TaxiParkDriverPayload }) =>
      updateTaxiParkDriver(driverId, payload),
    onSuccess: () => {
      toast.success('Водитель сохранен')
      setModalOpen(false)
      setEditingDriver(undefined)
      void invalidateDrivers()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const blockMutation = useMutation({
    mutationFn: (driverId: string) =>
      blockTaxiParkDriver(driverId, 'Blocked by taxi park administrator'),
    onSuccess: () => {
      toast.success('Водитель заблокирован')
      setBlockingDriver(null)
      void invalidateDrivers()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const archiveMutation = useMutation({
    mutationFn: archiveTaxiParkDriver,
    onSuccess: () => {
      toast.success('Водитель удален из таксопарка')
      setArchivingDriver(null)
      void invalidateDrivers()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  function submitDriver(payload: TaxiParkDriverPayload) {
    if (editingDriver) {
      updateMutation.mutate({ driverId: editingDriver.id, payload })
      return
    }
    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Водители</h2>
          <p className="text-sm text-slate-500">Учетные записи водителей таксопарка</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <Select className="md:w-56" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Все статусы</option>
            <option value="offline">offline</option>
            <option value="online">online</option>
            <option value="busy">busy</option>
            <option value="paused">paused</option>
            <option value="blocked">blocked</option>
          </Select>
          <Button type="button" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Создать
          </Button>
        </div>
      </Card>

      {drivers.isLoading ? <Skeleton className="h-64" /> : null}
      {drivers.isError ? (
        <Card className="text-red-700">{getApiErrorMessage(drivers.error)}</Card>
      ) : null}
      {drivers.data?.length === 0 ? <EmptyState title="Водители не найдены" /> : null}

      {drivers.data?.length ? (
        <Card>
          <Table>
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 p-3">ФИО</th>
                <th className="border-b border-slate-200 p-3">Рейтинг</th>
                <th className="border-b border-slate-200 p-3">Статус</th>
                <th className="border-b border-slate-200 p-3">Проверка</th>
                <th className="border-b border-slate-200 p-3">Добавлен</th>
                <th className="border-b border-slate-200 p-3">user_id</th>
                <th className="border-b border-slate-200 p-3" />
              </tr>
            </thead>
            <tbody>
              {drivers.data.map((driver) => (
                <tr key={driver.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 p-3 font-medium">{driver.full_name}</td>
                  <td className="border-b border-slate-100 p-3">{driver.rating.toFixed(1)}</td>
                  <td className="border-b border-slate-100 p-3">
                    <Badge variant={statusVariant(driver.status)}>{driver.status}</Badge>
                  </td>
                  <td className="border-b border-slate-100 p-3">
                    <Badge variant={statusVariant(driver.verification_status)}>
                      {driver.verification_status ?? '—'}
                    </Badge>
                  </td>
                  <td className="border-b border-slate-100 p-3">{formatDate(driver.created_at)}</td>
                  <td className="border-b border-slate-100 p-3 font-mono text-xs">{driver.user_id}</td>
                  <td className="border-b border-slate-100 p-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 w-9 p-0"
                        onClick={() => {
                          setEditingDriver(driver)
                          setModalOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 w-9 p-0"
                        onClick={() => setBlockingDriver(driver)}
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        className="h-9 w-9 p-0"
                        onClick={() => setArchivingDriver(driver)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}

      <Modal
        title={editingDriver ? 'Редактирование водителя' : 'Создание водителя'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingDriver(undefined)
        }}
      >
        <TaxiParkDriverForm
          driver={editingDriver}
          cars={cars.data ?? []}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onSubmit={submitDriver}
        />
      </Modal>

      <ConfirmModal
        open={Boolean(blockingDriver)}
        title="Заблокировать водителя"
        description={`Водитель ${blockingDriver?.full_name ?? ''} не сможет работать в таксопарке.`}
        confirmText="Заблокировать"
        isLoading={blockMutation.isPending}
        onCancel={() => setBlockingDriver(null)}
        onConfirm={() => blockingDriver && blockMutation.mutate(blockingDriver.id)}
      />
      <ConfirmModal
        open={Boolean(archivingDriver)}
        title="Удалить водителя"
        description={`Водитель ${archivingDriver?.full_name ?? ''} будет архивирован в рамках таксопарка.`}
        confirmText="Удалить"
        isLoading={archiveMutation.isPending}
        onCancel={() => setArchivingDriver(null)}
        onConfirm={() => archivingDriver && archiveMutation.mutate(archivingDriver.id)}
      />
    </div>
  )
}
