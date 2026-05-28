import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel } from '../../shared/ui/badge-utils'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Skeleton } from '../../shared/ui/Loader'
import { Modal } from '../../shared/ui/Modal'
import { Select } from '../../shared/ui/Select'
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import {
  activateLegalDocument,
  createLegalDocument,
  deactivateLegalDocument,
  getLegalDocuments,
} from './api'
import { documentTypes } from './constants'
import { LegalDocumentForm } from './LegalDocumentForm'

export function LegalDocumentsPage() {
  const queryClient = useQueryClient()
  const [documentType, setDocumentType] = useState('')
  const [language, setLanguage] = useState('ru')
  const [modalOpen, setModalOpen] = useState(false)
  const documents = useQuery({
    queryKey: ['legal-documents', documentType, language],
    queryFn: () =>
      getLegalDocuments({
        document_type: documentType || undefined,
        language: language || undefined,
      }),
  })
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['legal-documents'] })
  const createMutation = useMutation({
    mutationFn: createLegalDocument,
    onSuccess: () => {
      toast.success('Документ создан')
      setModalOpen(false)
      void invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const activateMutation = useMutation({
    mutationFn: activateLegalDocument,
    onSuccess: () => {
      toast.success('Документ активирован')
      void invalidate()
    },
  })
  const deactivateMutation = useMutation({
    mutationFn: deactivateLegalDocument,
    onSuccess: () => {
      toast.success('Документ деактивирован')
      void invalidate()
    },
  })

  return (
    <div className="space-y-4">
      <Card className="grid gap-3 md:grid-cols-[1fr_260px_140px_auto] md:items-end">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Юридические документы</h2>
          <p className="text-sm text-slate-500">Версии, языки и активация</p>
        </div>
        <Select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
          <option value="">Все типы</option>
          {documentTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <Select value={language} onChange={(event) => setLanguage(event.target.value)}>
          <option value="ru">ru</option>
          <option value="en">en</option>
        </Select>
        <Button type="button" onClick={() => setModalOpen(true)}>
          Создать
        </Button>
      </Card>
      {documents.isLoading ? <Skeleton className="h-64" /> : null}
      {documents.isError ? <Card className="text-red-700">{getApiErrorMessage(documents.error)}</Card> : null}
      {documents.data?.length === 0 ? <EmptyState title="Документы не найдены" /> : null}
      {documents.data?.length ? (
        <Card>
          <Table>
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 p-3">Тип</th>
                <th className="border-b border-slate-200 p-3">Заголовок</th>
                <th className="border-b border-slate-200 p-3">Версия</th>
                <th className="border-b border-slate-200 p-3">Язык</th>
                <th className="border-b border-slate-200 p-3">Статус</th>
                <th className="border-b border-slate-200 p-3">Создан</th>
                <th className="border-b border-slate-200 p-3" />
              </tr>
            </thead>
            <tbody>
              {documents.data.map((document) => (
                <tr key={document.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 p-3">{document.document_type}</td>
                  <td className="border-b border-slate-100 p-3 font-medium">{document.title}</td>
                  <td className="border-b border-slate-100 p-3">{document.version}</td>
                  <td className="border-b border-slate-100 p-3">{document.language}</td>
                  <td className="border-b border-slate-100 p-3">
                    <Badge variant={document.is_active ? 'success' : 'muted'}>
                      {document.is_active ? statusLabel('active') : statusLabel('inactive')}
                    </Badge>
                  </td>
                  <td className="border-b border-slate-100 p-3">{formatDate(document.created_at)}</td>
                  <td className="border-b border-slate-100 p-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        document.is_active
                          ? deactivateMutation.mutate(document.id)
                          : activateMutation.mutate(document.id)
                      }
                    >
                      {document.is_active ? 'Деактивировать' : 'Активировать'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}
      <Modal title="Новая версия документа" open={modalOpen} onClose={() => setModalOpen(false)}>
        <LegalDocumentForm
          isSaving={createMutation.isPending}
          onSubmit={(payload) => createMutation.mutate(payload)}
        />
      </Modal>
    </div>
  )
}
