import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Lock, Unlock, UserPlus } from 'lucide-react'
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
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import {
  blockTaxiParkDispatcher,
  createTaxiParkDispatcher,
  getTaxiParkDispatchers,
  type TaxiParkCreateDispatcherPayload,
  type TaxiParkDispatcher,
  type TaxiParkUpdateDispatcherPayload,
  unblockTaxiParkDispatcher,
  updateTaxiParkDispatcher,
} from './api'
import { TaxiParkDispatcherForm } from './TaxiParkDispatcherForm'

export function TaxiParkDispatchersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingDispatcher, setEditingDispatcher] = useState<TaxiParkDispatcher | undefined>()
  const [blockingDispatcher, setBlockingDispatcher] = useState<TaxiParkDispatcher | null>(null)
  const [unblockingDispatcher, setUnblockingDispatcher] = useState<TaxiParkDispatcher | null>(null)

  const dispatchers = useQuery({
    queryKey: ['taxi-park-dispatchers'],
    queryFn: getTaxiParkDispatchers,
  })

  const filteredDispatchers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    if (!normalizedSearch) return dispatchers.data ?? []

    return (dispatchers.data ?? []).filter((dispatcher) => {
      const haystack = [
        dispatcher.name,
        dispatcher.first_name,
        dispatcher.last_name,
        dispatcher.phone,
        dispatcher.email,
        dispatcher.user_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSearch)
    })
  }, [dispatchers.data, search])

  const invalidateDispatchers = () =>
    queryClient.invalidateQueries({ queryKey: ['taxi-park-dispatchers'] })

  const createMutation = useMutation({
    mutationFn: createTaxiParkDispatcher,
    onSuccess: () => {
      toast.success('Диспетчер создан')
      setModalOpen(false)
      void invalidateDispatchers()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      dispatcherId,
      payload,
    }: {
      dispatcherId: string
      payload: TaxiParkUpdateDispatcherPayload
    }) => updateTaxiParkDispatcher(dispatcherId, payload),
    onSuccess: () => {
      toast.success('Диспетчер сохранен')
      setModalOpen(false)
      setEditingDispatcher(undefined)
      void invalidateDispatchers()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const blockMutation = useMutation({
    mutationFn: blockTaxiParkDispatcher,
    onSuccess: () => {
      toast.success('Диспетчер заблокирован')
      setBlockingDispatcher(null)
      void invalidateDispatchers()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const unblockMutation = useMutation({
    mutationFn: unblockTaxiParkDispatcher,
    onSuccess: () => {
      toast.success('Диспетчер разблокирован')
      setUnblockingDispatcher(null)
      void invalidateDispatchers()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  function openCreateModal() {
    setEditingDispatcher(undefined)
    setModalOpen(true)
  }

  function openEditModal(dispatcher: TaxiParkDispatcher) {
    setEditingDispatcher(dispatcher)
    setModalOpen(true)
  }

  function submitCreate(payload: TaxiParkCreateDispatcherPayload) {
    createMutation.mutate(payload)
  }

  function submitUpdate(payload: TaxiParkUpdateDispatcherPayload) {
    if (!editingDispatcher) return
    updateMutation.mutate({ dispatcherId: editingDispatcher.id, payload })
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Диспетчеры</h2>
          <p className="text-sm text-slate-500">
            Управление учетными записями диспетчеров таксопарка.
          </p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row">
          <Input
            className="md:w-72"
            value={search}
            placeholder="Поиск по имени, телефону, email"
            onChange={(event) => setSearch(event.target.value)}
          />
          <Button type="button" onClick={openCreateModal}>
            <UserPlus className="h-4 w-4" />
            Создать
          </Button>
        </div>
      </Card>

      {dispatchers.isLoading ? <Skeleton className="h-64" /> : null}
      {dispatchers.isError ? (
        <Card className="text-red-700">{getApiErrorMessage(dispatchers.error)}</Card>
      ) : null}
      {dispatchers.data?.length === 0 ? <EmptyState title="Диспетчеры не найдены" /> : null}

      {filteredDispatchers.length ? (
        <Card>
          <Table>
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 p-3">Имя</th>
                <th className="border-b border-slate-200 p-3">Телефон</th>
                <th className="border-b border-slate-200 p-3">Email</th>
                <th className="border-b border-slate-200 p-3">Статус</th>
                <th className="border-b border-slate-200 p-3">Создан</th>
                <th className="border-b border-slate-200 p-3">user_id</th>
                <th className="border-b border-slate-200 p-3" />
              </tr>
            </thead>
            <tbody>
              {filteredDispatchers.map((dispatcher) => {
                const status = dispatcher.is_active ? 'active' : 'blocked'

                return (
                  <tr key={dispatcher.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 p-3 font-medium">
                      {dispatcher.name ||
                        [dispatcher.first_name, dispatcher.last_name].filter(Boolean).join(' ') ||
                        '-'}
                    </td>
                    <td className="border-b border-slate-100 p-3">{dispatcher.phone}</td>
                    <td className="border-b border-slate-100 p-3">{dispatcher.email ?? '-'}</td>
                    <td className="border-b border-slate-100 p-3">
                      <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
                    </td>
                    <td className="border-b border-slate-100 p-3">
                      {formatDate(dispatcher.created_at)}
                    </td>
                    <td className="border-b border-slate-100 p-3 font-mono text-xs">
                      {dispatcher.user_id}
                    </td>
                    <td className="border-b border-slate-100 p-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 w-9 p-0"
                          title="Редактировать"
                          onClick={() => openEditModal(dispatcher)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {dispatcher.is_active ? (
                          <Button
                            type="button"
                            variant="danger"
                            className="h-9 w-9 p-0"
                            title="Заблокировать"
                            onClick={() => setBlockingDispatcher(dispatcher)}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-9 w-9 p-0"
                            title="Разблокировать"
                            onClick={() => setUnblockingDispatcher(dispatcher)}
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card>
      ) : dispatchers.data?.length ? (
        <EmptyState title="По вашему запросу ничего не найдено" />
      ) : null}

      <Modal
        title={editingDispatcher ? 'Редактирование диспетчера' : 'Создание диспетчера'}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingDispatcher(undefined)
        }}
      >
        <TaxiParkDispatcherForm
          dispatcher={editingDispatcher}
          isSaving={createMutation.isPending || updateMutation.isPending}
          onCreate={submitCreate}
          onUpdate={submitUpdate}
        />
      </Modal>

      <ConfirmModal
        open={Boolean(blockingDispatcher)}
        title="Заблокировать диспетчера"
        description={`Диспетчер ${blockingDispatcher?.name ?? blockingDispatcher?.phone ?? ''} потеряет доступ к панели.`}
        confirmText="Заблокировать"
        isLoading={blockMutation.isPending}
        onCancel={() => setBlockingDispatcher(null)}
        onConfirm={() => blockingDispatcher && blockMutation.mutate(blockingDispatcher.id)}
      />

      <ConfirmModal
        open={Boolean(unblockingDispatcher)}
        title="Разблокировать диспетчера"
        description={`Диспетчер ${unblockingDispatcher?.name ?? unblockingDispatcher?.phone ?? ''} снова получит доступ к панели.`}
        confirmText="Разблокировать"
        isLoading={unblockMutation.isPending}
        onCancel={() => setUnblockingDispatcher(null)}
        onConfirm={() => unblockingDispatcher && unblockMutation.mutate(unblockingDispatcher.id)}
      />
    </div>
  )
}
