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
import consentPersonalDataTemplate from './templates/consent_personal_data.md?raw'
import privacyPolicyTemplate from './templates/privacy_policy.md?raw'
import taxiParkAgreementCompliance from './templates/taxi_park_agreement_driver_compliance.md?raw'
import termsOfServiceTemplate from './templates/terms_of_service.md?raw'

const schema = z.object({
  document_type: z.enum(documentTypes),
  language: z.string().min(2),
  version: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
})

const legalTemplates = [
  {
    label: 'Лицензионное соглашение',
    description: 'Публичная оферта об использовании сервиса заказа и автоматизации такси.',
    document_type: 'terms_of_service',
    title: 'Лицензионное соглашение',
    content: termsOfServiceTemplate,
  },
  {
    label: 'Политика конфиденциальности',
    description: 'Политика обработки персональных данных пользователей сервиса.',
    document_type: 'privacy_policy',
    title: 'Политика конфиденциальности и обработки персональных данных',
    content: privacyPolicyTemplate,
  },
  {
    label: 'Согласие на обработку данных',
    description: 'Отдельное согласие для чекбоксов регистрации и использования сервиса.',
    document_type: 'consent_personal_data',
    title: 'Согласие на обработку персональных данных',
    content: consentPersonalDataTemplate,
  },
  {
    label: 'Дополнение для таксопарков',
    description: 'Ответственность за проверку водителей, автомобилей и разрешений.',
    document_type: 'taxi_park_agreement',
    title: 'Дополнение к лицензионному соглашению таксопарка',
    content: taxiParkAgreementCompliance,
  },
] as const

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
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="mb-3">
          <div className="text-sm font-semibold text-amber-950">Готовые юридические шаблоны</div>
          <p className="mt-1 text-sm text-amber-800">
            Заполните форму одним из шаблонов, затем проверьте реквизиты и создайте новую версию документа.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {legalTemplates.map((template) => (
            <div
              key={template.document_type}
              className="rounded-lg border border-amber-200 bg-white/80 p-3"
            >
              <div className="text-sm font-semibold text-slate-900">{template.label}</div>
              <p className="mt-1 min-h-10 text-sm text-slate-600">{template.description}</p>
              <Button
                className="mt-3"
                type="button"
                variant="secondary"
                onClick={() => {
                  setValue('document_type', template.document_type)
                  setValue('language', 'ru')
                  setValue('title', template.title)
                  setValue('content', template.content)
                }}
              >
                Заполнить
              </Button>
            </div>
          ))}
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
