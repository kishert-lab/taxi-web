import { http } from '../../shared/api/http'
import type { ApiResponse } from '../../shared/api/types'
import type { CoordinatesPayload } from '../taxi-park-orders/api'

export type GeocoderPoint = {
  id?: string
  external_id?: string
  source?: string
  provider?: string
  address: string
  name?: string
  location: CoordinatesPayload
  confidence?: number
  is_trusted?: boolean
}

type RawGeocoderPoint = {
  id?: string
  external_id?: string
  externalId?: string
  external_place_id?: string
  externalPlaceId?: string
  source?: string
  provider?: string
  address?: string
  formatted_address?: string
  display_name?: string
  name?: string
  title?: string
  latitude?: number | string
  longitude?: number | string
  lat?: number | string
  lon?: number | string
  lng?: number | string
  location?: {
    latitude?: number | string
    longitude?: number | string
    lat?: number | string
    lon?: number | string
    lng?: number | string
  }
  point?: {
    latitude?: number | string
    longitude?: number | string
    lat?: number | string
    lon?: number | string
    lng?: number | string
  }
  coordinates?: {
    latitude?: number | string
    longitude?: number | string
    lat?: number | string
    lon?: number | string
    lng?: number | string
  }
  confidence?: number
  score?: number
  is_trusted?: boolean
  trusted?: boolean
}

type SearchResponse =
  | { points?: RawGeocoderPoint[]; results?: RawGeocoderPoint[]; items?: RawGeocoderPoint[] }
  | RawGeocoderPoint[]

export async function searchGeocoder(query: string, cityId?: string) {
  const response = await http.get<ApiResponse<SearchResponse>>('/geocoder/search', {
    params: {
      q: query,
      query,
      city_id: cityId,
      limit: 8,
    },
  })

  return getRawPoints(response.data.data)
    .map(normalizePoint)
    .filter((point): point is GeocoderPoint => Boolean(point))
}

export async function confirmGeocoderPoint(point: GeocoderPoint) {
  const response = await http.post<ApiResponse<unknown>>('/geocoder/points/confirm', {
    point_id: point.id,
    external_id: point.external_id,
    source: point.source,
    address: point.address,
    name: point.name,
    location: point.location,
  })

  return response.data.data
}

function getRawPoints(data: SearchResponse): RawGeocoderPoint[] {
  if (Array.isArray(data)) return data
  return data.points ?? data.results ?? data.items ?? []
}

function normalizePoint(point: RawGeocoderPoint): GeocoderPoint | null {
  const latitude = numberValue(
    point.location?.latitude ??
    point.location?.lat ??
      point.coordinates?.latitude ??
      point.coordinates?.lat ??
      point.point?.latitude ??
      point.point?.lat ??
      point.latitude ??
      point.lat,
  )
  const longitude = numberValue(
    point.location?.longitude ??
    point.location?.lng ??
    point.location?.lon ??
      point.coordinates?.longitude ??
      point.coordinates?.lng ??
      point.coordinates?.lon ??
      point.point?.longitude ??
      point.point?.lng ??
      point.point?.lon ??
      point.longitude ??
      point.lng ??
      point.lon,
  )
  const address =
    point.address ?? point.formatted_address ?? point.display_name ?? point.name ?? point.title

  if (!address || latitude === undefined || longitude === undefined) return null

  return {
    id: point.id,
    external_id: point.external_id ?? point.externalId ?? point.external_place_id ?? point.externalPlaceId,
    source: point.source ?? point.provider,
    address,
    name: point.name ?? point.title,
    location: { latitude, longitude },
    confidence: point.confidence ?? point.score,
    is_trusted: point.is_trusted ?? point.trusted,
  }
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const number = Number(value)
    return Number.isFinite(number) ? number : undefined
  }
  return undefined
}
