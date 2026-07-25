import { http } from '../../shared/api/http'
import type { ApiResponse } from '../../shared/api/types'

export type AdminLocalPointTrustLevel = 'confirmed' | 'trusted' | 'rejected'

export type AdminLocalPoint = {
  id: string
  city_id: string
  name: string
  normalized_name: string
  address: string
  coordinates: {
    latitude: number
    longitude: number
  }
  source: string
  external_provider?: string
  external_place_id?: string
  confidence: number
  trust_level: AdminLocalPointTrustLevel
  confirmation_count: number
  reject_count: number
  created_at: string
  updated_at: string
}

export type CreateAdminLocalPointPayload = {
  city_id: string
  name: string
  address: string
  coordinates: {
    latitude: number
    longitude: number
  }
  trust_level?: AdminLocalPointTrustLevel
}

export async function getAdminLocalPoints(params?: {
  city_id?: string
  trust_level?: AdminLocalPointTrustLevel
  limit?: number
}) {
  const response = await http.get<ApiResponse<{ points: AdminLocalPoint[] }>>(
    '/admin/geocoder/local-points',
    { params: { limit: 100, ...params } },
  )

  return response.data.data.points
}

export async function createAdminLocalPoint(payload: CreateAdminLocalPointPayload) {
  const response = await http.post<ApiResponse<AdminLocalPoint>>(
    '/admin/geocoder/local-points',
    payload,
  )

  return response.data.data
}

export async function approveAdminLocalPoint(pointId: string) {
  const response = await http.post<ApiResponse<AdminLocalPoint>>(
    `/admin/geocoder/local-points/${pointId}/approve`,
  )

  return response.data.data
}

export async function rejectAdminLocalPoint(pointId: string) {
  const response = await http.post<ApiResponse<AdminLocalPoint>>(
    `/admin/geocoder/local-points/${pointId}/reject`,
  )

  return response.data.data
}
