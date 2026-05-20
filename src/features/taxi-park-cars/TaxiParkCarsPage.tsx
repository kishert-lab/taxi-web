import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Plus } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Skeleton } from '../../shared/ui/Loader'
import { Modal } from '../../shared/ui/Modal'
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import { getTaxiParkDrivers } from '../taxi-park-drivers/api'
import {
  createTaxiParkCar,
  getTaxiParkCars,
  type TaxiParkCar,
  type TaxiParkCarPayload,
  updateTaxiParkCar,
} from './api'
import { TaxiParkCarForm } from './TaxiParkCarForm'

export function TaxiParkCarsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCar, setEditingCar] = useState<TaxiParkCar | undefined>()

  const cars = useQuery({
    queryKey: ['taxi-park-cars'],
    queryFn: getTaxiParkCars,
  })
  const drivers = useQuery({
    queryKey: ['taxi-park-drivers', ''],
    queryFn: () => getTaxiParkDrivers(),
  })

  const invalidateCars = () =>
    queryClient.invalidateQueries({ queryKey: ['taxi-park-cars'] })

  const createMutation = useMutation({
    mutationFn: createTaxiParkCar,
    onSuccess: () => {
      toast.success('Автомобиль создан')
      setModalOpen(false)
      void invalidateCars()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({ carId, payload }: { carId: string; payload: TaxiParkCarPayload }) =>
      updateTaxiParkCar(carId, payload),
    onSuccess: () => {
      toast.success('Автомобиль сохранен')
      setModalOpen(false)
      setEditingCar(undefined)
      void invalidateCars()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  function submitCar(payload: TaxiParkCarPayload) {
    if (editingCar) {
      updateMutation.mutate({ carId: editingCar.id, payload })
      return
    }

    createMutation.mutate(payload)
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Автомобили</h2>
          <p className="text-sm text-slate-500">Автомобили, разрешения и привязки водителей</p>
        </div>
        <Button type="button" onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" />
          Создать
        </Button>
      </Card>

      {cars.isLoading ? <Skeleton className="h-64" /> : null}
      {cars.isError ? (
        <Card className="text-red-700">{getApiErrorMessage(cars.error)}</Card>
      ) : null}
      {cars.data?.length === 0 ? <EmptyState title="Автомобили не найдены" /> : null}

      {cars.data?.length ? (
        <Card>
          <Table>
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 p-3">Автомобиль</th>
                <th className="border-b border-slate-200 p-3">Госномер</th>
                <th className="border-b border-slate-200 p-3">Класс</th>
                <th className="border-b border-slate-200 p-3">Проверка</th>
                <th className="border-b border-slate-200 p-3">Разрешение до</th>
                <th className="border-b border-slate-200 p-3">Создан</th>
                <th className="border-b border-slate-200 p-3" />
              </tr>
            </thead>
            <tbody>
              {cars.data.map((car) => (
                <tr key={car.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 p-3 font-medium">
                    {car.brand} {car.model}
                    <div className="text-xs text-slate-500">{car.color}{car.year ? `, ${car.year}` : ''}</div>
                  </td>
                  <td className="border-b border-slate-100 p-3 font-mono text-xs">{car.plate_number}</td>
                  <td className="border-b border-slate-100 p-3">{car.car_class ?? '-'}</td>
                  <td className="border-b border-slate-100 p-3">
                    <Badge variant={statusVariant(car.verification_status)}>
                      {car.verification_status ?? '-'}
                    </Badge>
                  </td>
                  <td className="border-b border-slate-100 p-3">{formatDate(car.permit_expires_at)}</td>
                  <td className="border-b border-slate-100 p-3">{formatDate(car.created_at)}</td>
                  <td className="border-b border-slate-100 p-3">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 w-9 p-0"
                        onClick={() => {
                          setEditingCar(car)
                          setModalOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
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
        title={editingCar ? 'Редактирование автомобиля' : 'Создание автомобиля'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingCar(undefined)
        }}
      >
        <TaxiParkCarForm
          car={editingCar}
          drivers={drivers.data ?? []}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onSubmit={submitCar}
        />
      </Modal>
    </div>
  )
}
