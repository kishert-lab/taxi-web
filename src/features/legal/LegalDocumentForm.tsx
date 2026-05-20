import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Select } from '../../shared/ui/Select'
import { Textarea } from '../../shared/ui/Textarea'
import type { LegalDocumentPayload } from './api'
import { documentTypes } from './constants'
import { LegalDocumentPreview } from './LegalDocumentPreview'
import taxiParkAgreementCompliance from './templates/taxi_park_agreement_driver_compliance.md?raw'

const schema = z.object({
  document_type: z.enum(documentTypes),
  language: z.string().min(2),
  version: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
})

export function LegalDocumentForm({
  onSubmit,
  isSaving,
}: {
  onSubmit: (payload: LegalDocumentPayload) => void
  isSaving: boolean
}) {
  const [preview, setPreview] = useState(false)
  const { register, handleSubmit, control, formState, setValue } =
    useForm<LegalDocumentPayload>({
      resolver: zodResolver(schema),
      defaultValues: {
        document_type: 'terms_of_service',
        language: 'ru',
        version: '1.0.0',
        title: '',
        content: '',
      },
    })
  const content = useWatch({ control, name: 'content' })

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-amber-900">
              Шаблон дополнения для таксопарков
            </div>
            <p className="mt-1 text-sm text-amber-800">
              Ответственность за проверку водителей, автомобилей и разрешительных документов.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setValue('document_type', 'taxi_park_agreement')
              setValue('language', 'ru')
              setValue('title', 'Дополнение к лицензионному соглашению таксопарка')
              setValue('content', taxiParkAgreementCompliance)
            }}
          >
            Заполнить
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Тип</span>
          <Select {...register('document_type')}>
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Язык</span>
          <Input {...register('language')} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Версия</span>
          <Input {...register('version')} />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium text-slate-700">Заголовок</span>
          <Input {...register('title')} />
        </label>
      </div>

      <label>
        <span className="mb-1 block text-sm font-medium text-slate-700">Markdown content</span>
        <Textarea className="min-h-72 font-mono" {...register('content')} />
      </label>

      {Object.values(formState.errors)[0]?.message ? (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {String(Object.values(formState.errors)[0]?.message)}
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving}>
          Создать версию
        </Button>
        <Button type="button" variant="secondary" onClick={() => setPreview((value) => !value)}>
          Preview
        </Button>
      </div>

      {preview ? <LegalDocumentPreview content={content} /> : null}
    </form>
  )
}
