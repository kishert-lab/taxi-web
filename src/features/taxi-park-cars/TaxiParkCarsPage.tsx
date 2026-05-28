import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Edit, FileText, Plus, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { Skeleton } from '../../shared/ui/Loader'
import { Modal } from '../../shared/ui/Modal'
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import {
  archiveTaxiParkCar,
  createTaxiParkCar,
  getTaxiParkCarDocuments,
  getTaxiParkCars,
  type TaxiParkCar,
  type TaxiParkCarDocument,
  type TaxiParkCarPayload,
  updateTaxiParkCar,
  verifyTaxiParkCar,
} from './api'
import { TaxiParkCarForm } from './TaxiParkCarForm'

export function TaxiParkCarsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCar, setEditingCar] = useState<TaxiParkCar | undefined>()
  const [documentsCar, setDocumentsCar] = useState<TaxiParkCar | null>(null)
  const [archivingCar, setArchivingCar] = useState<TaxiParkCar | null>(null)

  const cars = useQuery({
    queryKey: ['taxi-park-cars'],
    queryFn: getTaxiParkCars,
  })
  const documents = useQuery({
    queryKey: ['taxi-park-car-documents', documentsCar?.id],
    queryFn: () => getTaxiParkCarDocuments(documentsCar!.id),
    enabled: Boolean(documentsCar),
  })

  const invalidateCars = () =>
    queryClient.invalidateQueries({ queryKey: ['taxi-park-cars'] })

  const createMutation = useMutation({
    mutationFn: createTaxiParkCar,
    onSuccess: () => {
      toast.success('Автомобиль добавлен')
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

  const verifyMutation = useMutation({
    mutationFn: verifyTaxiParkCar,
    onSuccess: () => {
      toast.success('Автомобиль подтвержден')
      void invalidateCars()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const archiveMutation = useMutation({
    mutationFn: archiveTaxiParkCar,
    onSuccess: () => {
      toast.success('Автомобиль архивирован')
      setArchivingCar(null)
      void invalidateCars()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  function submitCar(payload: TaxiParkCarPayload) {
    if (editingCar) {
      updateMutation.mutate({ carId: editingCar.id, payload })
      return
    }

    createMutation.mutate({
      ...payload,
      verification_status: payload.verification_status ?? 'pending_verification',
    })
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Автомобили</h2>
          <p className="text-sm text-slate-500">
            Автомобили таксопарка, документы, разрешения и проверки
          </p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setEditingCar(undefined)
            setModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4" />
          Добавить автомобиль
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
                    <div className="text-xs text-slate-500">
                      {car.color}
                      {car.year ? `, ${car.year}` : ''}
                    </div>
                  </td>
                  <td className="border-b border-slate-100 p-3 font-mono text-xs">
                    {car.plate_number}
                  </td>
                  <td className="border-b border-slate-100 p-3">{car.car_class ?? '-'}</td>
                  <td className="border-b border-slate-100 p-3">
                    <Badge variant={statusVariant(car.verification_status)}>
                      {statusLabel(car.verification_status)}
                    </Badge>
                  </td>
                  <td className="border-b border-slate-100 p-3">
                    {formatDate(car.permit_expires_at)}
                  </td>
                  <td className="border-b border-slate-100 p-3">
                    {formatDate(car.created_at)}
                  </td>
                  <td className="border-b border-slate-100 p-3">
                    <div className="flex justify-end gap-2">
                      <IconButton title="Документы" onClick={() => setDocumentsCar(car)}>
                        <FileText className="h-4 w-4" />
                      </IconButton>
                      {car.verification_status !== 'verified' ? (
                        <IconButton
                          title="Подтвердить автомобиль"
                          disabled={verifyMutation.isPending}
                          onClick={() => verifyMutation.mutate(car.id)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </IconButton>
                      ) : null}
                      <IconButton
                        title="Редактировать"
                        onClick={() => {
                          setEditingCar(car)
                          setModalOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </IconButton>
                      <Button
                        type="button"
                        variant="danger"
                        className="h-9 w-9 p-0"
                        title="Архивировать"
                        onClick={() => setArchivingCar(car)}
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
        title={editingCar ? 'Редактирование автомобиля' : 'Добавление автомобиля'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingCar(undefined)
        }}
      >
        <TaxiParkCarForm
          car={editingCar}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onSubmit={submitCar}
        />
      </Modal>

      <Modal
        title={`Документы: ${documentsCar ? `${documentsCar.brand} ${documentsCar.model}` : ''}`}
        open={Boolean(documentsCar)}
        onClose={() => setDocumentsCar(null)}
      >
        <DocumentsView
          documents={documents.data ?? []}
          isLoading={documents.isLoading}
          error={documents.error}
        />
      </Modal>

      <ConfirmModal
        open={Boolean(archivingCar)}
        title="Архивировать автомобиль"
        description={`Автомобиль ${archivingCar?.brand ?? ''} ${archivingCar?.model ?? ''} будет скрыт из активной работы.`}
        confirmText="Архивировать"
        isLoading={archiveMutation.isPending}
        onCancel={() => setArchivingCar(null)}
        onConfirm={() => archivingCar && archiveMutation.mutate(archivingCar.id)}
      />
    </div>
  )
}

function IconButton({
  title,
  onClick,
  children,
  disabled,
}: {
  title: string
  onClick: () => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="h-9 w-9 p-0"
      title={title}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function DocumentsView({
  documents,
  isLoading,
  error,
}: {
  documents: TaxiParkCarDocument[]
  isLoading: boolean
  error: unknown
}) {
  if (isLoading) return <Skeleton className="h-32" />
  if (error) return <Card className="text-red-700">{getApiErrorMessage(error)}</Card>
  if (documents.length === 0) return <EmptyState title="Документы не найдены" />

  return (
    <Table>
      <thead>
        <tr className="text-slate-500">
          <th className="border-b border-slate-200 p-3">Тип</th>
          <th className="border-b border-slate-200 p-3">Статус</th>
          <th className="border-b border-slate-200 p-3">Номер</th>
          <th className="border-b border-slate-200 p-3">Действует до</th>
          <th className="border-b border-slate-200 p-3">Файл</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((document) => (
          <tr key={document.id} className="hover:bg-slate-50">
            <td className="border-b border-slate-100 p-3">{document.document_type}</td>
            <td className="border-b border-slate-100 p-3">
              <Badge variant={statusVariant(document.status)}>{statusLabel(document.status)}</Badge>
            </td>
            <td className="border-b border-slate-100 p-3">{document.number ?? '-'}</td>
            <td className="border-b border-slate-100 p-3">{formatDate(document.expires_at)}</td>
            <td className="border-b border-slate-100 p-3">
              {document.file_url ?? document.url ? (
                <a
                  className="text-sm font-semibold text-amber-700 hover:text-amber-800"
                  href={document.file_url ?? document.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  Открыть
                </a>
              ) : (
                '-'
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
