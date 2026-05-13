import { http } from '../../shared/api/http'
import type { ApiResponse } from '../../shared/api/types'

export type LegalDocumentType =
  | 'privacy_policy'
  | 'terms_of_service'
  | 'driver_agreement'
  | 'taxi_park_agreement'
  | 'consent_personal_data'

export type LegalDocument = {
  id: string
  document_type: LegalDocumentType
  language: string
  version: string
  title: string
  content: string
  is_active: boolean
  created_at: string
}

export type LegalDocumentPayload = {
  document_type: LegalDocumentType
  language: string
  version: string
  title: string
  content: string
}

export async function getLegalDocuments(params?: {
  document_type?: string
  language?: string
}) {
  const response = await http.get<ApiResponse<LegalDocument[]>>(
    '/admin/legal/documents',
    { params },
  )
  return response.data.data
}

export async function createLegalDocument(payload: LegalDocumentPayload) {
  const response = await http.post<ApiResponse<LegalDocument>>(
    '/admin/legal/documents',
    payload,
  )
  return response.data.data
}

export async function activateLegalDocument(id: string) {
  const response = await http.post<ApiResponse<LegalDocument>>(
    `/admin/legal/documents/${id}/activate`,
  )
  return response.data.data
}

export async function deactivateLegalDocument(id: string) {
  const response = await http.post<ApiResponse<LegalDocument>>(
    `/admin/legal/documents/${id}/deactivate`,
  )
  return response.data.data
}

export async function getPublicLegalDocument(kind: 'terms' | 'privacy-policy' | 'consent') {
  const response = await http.get<ApiResponse<LegalDocument>>(`/public/legal/${kind}`, {
    params: { language: 'ru' },
  })
  return response.data.data
}
