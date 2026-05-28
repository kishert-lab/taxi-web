import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, FileText, KeyRound, Link2, Lock, ShieldCheck, Trash2, Unlink } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { Input } from '../../shared/ui/Input'
import { Skeleton } from '../../shared/ui/Loader'
import { Modal } from '../../shared/ui/Modal'
import { Select } from '../../shared/ui/Select'
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import { getTaxiParkCars, type TaxiParkCar } from '../taxi-park-cars/api'
import {
  archiveTaxiParkDriver,
  assignTaxiParkDriverCar,
  blockTaxiParkDriver,
  createTaxiParkDriver,
  detachTaxiParkDriverCar,
  getTaxiParkDriverDocuments,
  getTaxiParkDrivers,
  setTaxiParkDriverPassword,
  type TaxiParkDriver,
  type TaxiParkDriverDocument,
  type TaxiParkDriverPayload,
  unblockTaxiParkDriver,
  updateTaxiParkDriver,
  verifyTaxiParkDriverForLine,
} from './api'
import { TaxiParkDriverForm } from './TaxiParkDriverForm'

export function TaxiParkDriversPage() {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDriver, setEditingDriver] = useState<TaxiParkDriver | undefined>()
  const [documentsDriver, setDocumentsDriver] = useState<TaxiParkDriver | null>(null)
  const [carManageDriver, setCarManageDriver] = useState<TaxiParkDriver | null>(null)
  const [selectedCarId, setSelectedCarId] = useState('')
  const [blockingDriver, setBlockingDriver] = useState<TaxiParkDriver | null>(null)
  const [archivingDriver, setArchivingDriver] = useState<TaxiParkDriver | null>(null)
  const [passwordDriver, setPasswordDriver] = useState<TaxiParkDriver | null>(null)
  const [newDriverPassword, setNewDriverPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const drivers = useQuery({
    queryKey: ['taxi-park-drivers', status],
    queryFn: () => getTaxiParkDrivers(status || undefined),
  })
  const cars = useQuery({
    queryKey: ['taxi-park-cars'],
    queryFn: getTaxiParkCars,
  })
  const documents = useQuery({
    queryKey: ['taxi-park-driver-documents', documentsDriver?.id],
    queryFn: () => getTaxiParkDriverDocuments(documentsDriver!.id),
    enabled: Boolean(documentsDriver),
  })

  const attachedCarIds = useMemo(
    () => getAttachedCarIds(carManageDriver, cars.data ?? []),
    [carManageDriver, cars.data],
  )

  const invalidateDrivers = () =>
    queryClient.invalidateQueries({ queryKey: ['taxi-park-drivers'] })
  const invalidateFleet = () => {
    void queryClient.invalidateQueries({ queryKey: ['taxi-park-drivers'] })
    void queryClient.invalidateQueries({ queryKey: ['taxi-park-cars'] })
  }

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

  const assignMutation = useMutation({
    mutationFn: ({ driverId, carId }: { driverId: string; carId: string }) =>
      assignTaxiParkDriverCar(driverId, carId),
    onSuccess: () => {
      toast.success('Автомобиль привязан')
      setSelectedCarId('')
      invalidateFleet()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const detachMutation = useMutation({
    mutationFn: ({ driverId, carId }: { driverId: string; carId: string }) =>
      detachTaxiParkDriverCar(driverId, carId),
    onSuccess: () => {
      toast.success('Автомобиль отвязан')
      invalidateFleet()
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

  const unblockMutation = useMutation({
    mutationFn: unblockTaxiParkDriver,
    onSuccess: () => {
      toast.success('Водитель разблокирован')
      void invalidateDrivers()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const passwordMutation = useMutation({
    mutationFn: ({ driverId, password }: { driverId: string; password: string }) =>
      setTaxiParkDriverPassword(driverId, password),
    onSuccess: () => {
      toast.success('Пароль водителя изменен')
      closePasswordModal()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const verifyForLineMutation = useMutation({
    mutationFn: verifyTaxiParkDriverForLine,
    onSuccess: () => {
      toast.success('Водитель допущен к линии')
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

  function toggleDriverBlock(driver: TaxiParkDriver) {
    if (driver.status === 'blocked' || driver.verification_status === 'blocked') {
      unblockMutation.mutate(driver.id)
      return
    }
    setBlockingDriver(driver)
  }

  function openPasswordModal(driver: TaxiParkDriver) {
    setPasswordDriver(driver)
    setNewDriverPassword('')
    setPasswordError('')
  }

  function closePasswordModal() {
    setPasswordDriver(null)
    setNewDriverPassword('')
    setPasswordError('')
  }

  function submitPassword() {
    const password = newDriverPassword.trim()

    if (password.length < 6) {
      setPasswordError('Пароль должен быть не короче 6 символов')
      return
    }

    if (passwordDriver) {
      passwordMutation.mutate({ driverId: passwordDriver.id, password })
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Водители</h2>
          <p className="text-sm text-slate-500">
            Учетные записи, документы и привязка автомобилей
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <Select className="md:w-56" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Все статусы</option>
            <option value="offline">{statusLabel('offline')}</option>
            <option value="online">{statusLabel('online')}</option>
            <option value="busy">{statusLabel('busy')}</option>
            <option value="paused">{statusLabel('paused')}</option>
            <option value="blocked">{statusLabel('blocked')}</option>
          </Select>
          <Button
            type="button"
            onClick={() => {
              setEditingDriver(undefined)
              setModalOpen(true)
            }}
          >
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
                    <Badge variant={statusVariant(driver.status)}>{statusLabel(driver.status)}</Badge>
                  </td>
                  <td className="border-b border-slate-100 p-3">
                    <Badge variant={statusVariant(driver.verification_status)}>
                      {statusLabel(driver.verification_status)}
                    </Badge>
                  </td>
                  <td className="border-b border-slate-100 p-3">{formatDate(driver.created_at)}</td>
                  <td className="border-b border-slate-100 p-3 font-mono text-xs">{driver.user_id}</td>
                  <td className="border-b border-slate-100 p-3">
                    <div className="flex justify-end gap-2">
                      <IconButton title="Документы" onClick={() => setDocumentsDriver(driver)}>
                        <FileText className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        title="Автомобили"
                        onClick={() => {
                          setCarManageDriver(driver)
                          setSelectedCarId('')
                        }}
                      >
                        <Link2 className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        title="Редактировать"
                        onClick={() => {
                          setEditingDriver(driver)
                          setModalOpen(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        title="Сменить пароль"
                        onClick={() => openPasswordModal(driver)}
                      >
                        <KeyRound className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        title="Допустить на линию"
                        onClick={() => verifyForLineMutation.mutate(driver.id)}
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        title={
                          driver.status === 'blocked' || driver.verification_status === 'blocked'
                            ? 'Разблокировать'
                            : 'Заблокировать'
                        }
                        onClick={() => toggleDriverBlock(driver)}
                      >
                        <Lock className="h-4 w-4" />
                      </IconButton>
                      <Button
                        type="button"
                        variant="danger"
                        className="h-9 w-9 p-0"
                        title="Удалить"
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

      <Modal
        title={`Документы: ${documentsDriver?.full_name ?? ''}`}
        open={Boolean(documentsDriver)}
        onClose={() => setDocumentsDriver(null)}
      >
        <div className="space-y-4">
          <DriverRequiredDocumentsChecklist />
          <DocumentsView
            documents={documents.data ?? []}
            isLoading={documents.isLoading}
            error={documents.error}
          />
        </div>
      </Modal>

      <Modal
        title={`Автомобили: ${carManageDriver?.full_name ?? ''}`}
        open={Boolean(carManageDriver)}
        onClose={() => setCarManageDriver(null)}
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row">
            <Select value={selectedCarId} onChange={(event) => setSelectedCarId(event.target.value)}>
              <option value="">Выберите автомобиль</option>
              {(cars.data ?? []).map((car) => (
                <option key={car.id} value={car.id}>
                  {car.brand} {car.model} {car.plate_number}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              disabled={!carManageDriver || !selectedCarId || assignMutation.isPending}
              onClick={() =>
                carManageDriver &&
                selectedCarId &&
                assignMutation.mutate({ driverId: carManageDriver.id, carId: selectedCarId })
              }
            >
              <Link2 className="h-4 w-4" />
              Привязать
            </Button>
          </div>
          {attachedCarIds.length === 0 ? (
            <EmptyState title="К водителю не привязаны автомобили" />
          ) : (
            <div className="space-y-2">
              {attachedCarIds.map((carId) => (
                <div
                  key={carId}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                >
                  <AttachedCarInfo cars={cars.data ?? []} carId={carId} />
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!carManageDriver || detachMutation.isPending}
                    onClick={() =>
                      carManageDriver &&
                      detachMutation.mutate({ driverId: carManageDriver.id, carId })
                    }
                  >
                    <Unlink className="h-4 w-4" />
                    Отвязать
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={`Смена пароля: ${passwordDriver?.full_name ?? ''}`}
        open={Boolean(passwordDriver)}
        onClose={closePasswordModal}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            submitPassword()
          }}
        >
          <label className="space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Новый пароль</span>
            <Input
              type="password"
              value={newDriverPassword}
              autoComplete="new-password"
              placeholder="NewPassword123!"
              onChange={(event) => {
                setNewDriverPassword(event.target.value)
                setPasswordError('')
              }}
            />
            {passwordError ? (
              <span className="text-xs font-medium text-red-600">{passwordError}</span>
            ) : null}
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closePasswordModal}>
              Отмена
            </Button>
            <Button type="submit" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? 'Сохранение...' : 'Сменить пароль'}
            </Button>
          </div>
        </form>
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

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="h-9 w-9 p-0"
      title={title}
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
  documents: TaxiParkDriverDocument[]
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

function DriverRequiredDocumentsChecklist() {
  const items = [
    'Водительское удостоверение',
    'Право работы в такси',
    'Медицинский допуск',
    'Предрейсовый контроль',
    'Отсутствие запрета на перевозки',
  ]

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-semibold text-amber-900">Необходимые документы и проверки</p>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="text-sm text-amber-800">
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function AttachedCarInfo({ cars, carId }: { cars: TaxiParkCar[]; carId: string }) {
  const car = cars.find((item) => item.id === carId)

  if (!car) {
    return <span className="text-sm font-medium text-slate-700">{carId}</span>
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-800">
        {car.brand} {car.model} {car.plate_number}
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant={car.verification_status === 'verified' ? 'success' : 'warning'}>
          {statusLabel(car.verification_status ?? 'not_verified')}
        </Badge>
        <Badge variant={car.is_active ? 'success' : 'muted'}>
          {car.is_active ? statusLabel('active') : statusLabel('inactive')}
        </Badge>
        <Badge variant={isValidFutureDate(car.osago_expires_at) ? 'success' : 'danger'}>
          ОСАГО {formatDate(car.osago_expires_at)}
        </Badge>
        <Badge variant={isValidFutureDate(car.permit_expires_at) ? 'success' : 'danger'}>
          Разрешение {formatDate(car.permit_expires_at)}
        </Badge>
      </div>
    </div>
  )
}

function getAttachedCarIds(driver: TaxiParkDriver | null, cars: TaxiParkCar[]) {
  if (!driver) return []
  if (driver.attached_car_ids?.length) return driver.attached_car_ids
  const attachedIds = cars
    .filter((car) => {
      if (car.primary_driver_id === driver.id) return true
      if (car.driver_ids?.includes(driver.id)) return true
      return car.attached_driver_ids?.includes(driver.id) ?? false
    })
    .map((car) => car.id)

  if (attachedIds.length > 0) return attachedIds
  return driver.attached_car_id ? [driver.attached_car_id] : []
}

function isValidFutureDate(value?: string | null) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date >= today
}

