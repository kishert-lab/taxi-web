import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { Car, Clock, MapPin, Navigation } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'

import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Card } from '../../shared/ui/Card'
import { EmptyState } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import type { TaxiParkDriver } from '../taxi-park-drivers/api'
import type { DriverLocationCache } from '../websocket/use-mobile-ws'
import { getTaxiParkDriverLocations, type TaxiParkDriverLocation } from './api'

type FleetDriverLocation = {
  driver?: TaxiParkDriver
  driver_id: string
  user_id?: string
  name: string
  phone?: string
  status?: string
  verification_status?: string
  is_verified?: boolean
  is_stale?: boolean
  latitude?: number
  longitude?: number
  heading?: number
  speed_mps?: number
  accuracy_meters?: number
  updated_at?: string
  car?: TaxiParkDriverLocation['car']
}

const defaultCenter: [number, number] = [56.838011, 60.597465]

const onlineDriverIcon = L.divIcon({
  className: '',
  html: '<div style="height:30px;width:30px;border-radius:9999px;background:#10b981;border:3px solid white;box-shadow:0 10px 20px rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:13px">T</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const busyDriverIcon = L.divIcon({
  className: '',
  html: '<div style="height:30px;width:30px;border-radius:9999px;background:#f59e0b;border:3px solid white;box-shadow:0 10px 20px rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:13px">T</div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

export function TaxiParkFleetMap({ drivers }: { drivers: TaxiParkDriver[] }) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
  const snapshot = useQuery({
    queryKey: ['taxi-park-driver-locations-snapshot'],
    queryFn: () => getTaxiParkDriverLocations(30),
    refetchOnWindowFocus: true,
  })
  const liveLocations = useQuery<DriverLocationCache>({
    queryKey: ['taxi-park-driver-locations'],
    queryFn: async () => ({}),
    initialData: {},
    staleTime: Infinity,
  })

  const onlineDrivers = useMemo(
    () => mergeFleetLocations(drivers, snapshot.data ?? [], liveLocations.data),
    [drivers, liveLocations.data, snapshot.data],
  )
  const driversWithLocation = onlineDrivers.filter(hasLocation)
  const selectedDriver =
    onlineDrivers.find((driver) => driver.driver_id === selectedDriverId) ?? onlineDrivers[0]
  const center = getMapCenter(driversWithLocation)

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Card className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-lg font-bold text-slate-950">Карта водителей онлайн</h2>
          <p className="text-sm text-slate-500">
            Стартовое состояние берется из snapshot, дальше обновляется через WebSocket.
          </p>
          {snapshot.isError ? (
            <p className="mt-1 text-xs font-medium text-red-600">
              Не удалось загрузить snapshot локаций
            </p>
          ) : null}
        </div>
        {driversWithLocation.length ? (
          <div className="h-[460px]">
            <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {driversWithLocation.map((item) => (
                <Marker
                  key={item.driver_id}
                  position={[item.latitude, item.longitude]}
                  icon={item.status === 'busy' ? busyDriverIcon : onlineDriverIcon}
                  eventHandlers={{
                    click: () => setSelectedDriverId(item.driver_id),
                  }}
                />
              ))}
            </MapContainer>
          </div>
        ) : (
          <div className="flex h-[460px] items-center justify-center">
            <EmptyState title="Нет онлайн-водителей с актуальной геопозицией" />
          </div>
        )}
      </Card>

      <Card className="space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-950">Ситуация по парку</h3>
          <p className="text-sm text-slate-500">
            Онлайн: {onlineDrivers.length}, на карте: {driversWithLocation.length}
          </p>
        </div>

        {selectedDriver ? (
          <DriverSituationCard item={selectedDriver} onSelect={setSelectedDriverId} />
        ) : (
          <EmptyState title="Нет водителей онлайн" />
        )}

        {onlineDrivers.length ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Водители онлайн</p>
            {onlineDrivers.map((item) => (
              <button
                key={item.driver_id}
                type="button"
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
                onClick={() => setSelectedDriverId(item.driver_id)}
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-800">{item.name}</span>
                  <span className="text-xs text-slate-500">
                    {hasLocation(item) ? 'геопозиция есть' : 'геопозиция не получена'}
                    {item.is_stale ? ', устарела' : ''}
                  </span>
                </span>
                <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
              </button>
            ))}
          </div>
        ) : null}
      </Card>
    </div>
  )
}

function DriverSituationCard({
  item,
  onSelect,
}: {
  item: FleetDriverLocation
  onSelect: (driverId: string) => void
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-slate-950">{item.name}</p>
          <p className="font-mono text-xs text-slate-500">{item.user_id ?? item.driver_id}</p>
        </div>
        <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
      </div>

      <div className="grid gap-3 text-sm text-slate-700">
        <InfoLine icon={<Car className="h-4 w-4" />} label="Авто" value={formatCar(item.car)} />
        <InfoLine icon={<ShieldDot />} label="Проверка" value={statusLabel(item.verification_status)} />
        <InfoLine
          icon={<MapPin className="h-4 w-4" />}
          label="Координаты"
          value={
            hasLocation(item)
              ? `${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}`
              : 'нет данных'
          }
        />
        <InfoLine
          icon={<Clock className="h-4 w-4" />}
          label="Обновлено"
          value={formatDate(item.updated_at)}
        />
        <InfoLine
          icon={<Navigation className="h-4 w-4" />}
          label="Скорость"
          value={item.speed_mps !== undefined ? `${item.speed_mps.toFixed(1)} м/с` : '-'}
        />
      </div>

      <button
        type="button"
        className="inline-flex items-center gap-2 text-sm font-semibold text-amber-700 hover:text-amber-800"
        onClick={() => onSelect(item.driver_id)}
      >
        <Navigation className="h-4 w-4" />
        Смотреть на карте
      </button>
    </div>
  )
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-right font-semibold text-slate-800">{value}</span>
    </div>
  )
}

function ShieldDot() {
  return <span className="h-4 w-4 rounded-full bg-emerald-500" />
}

function mergeFleetLocations(
  drivers: TaxiParkDriver[],
  snapshot: TaxiParkDriverLocation[],
  liveLocations: DriverLocationCache,
) {
  const byDriverId = new Map<string, FleetDriverLocation>()

  snapshot.forEach((item) => {
    byDriverId.set(item.driver_id, fromSnapshot(item))
  })

  drivers.forEach((driver) => {
    const existing = byDriverId.get(driver.id)
    byDriverId.set(driver.id, {
      ...fromDriver(driver),
      ...existing,
      driver,
      driver_id: driver.id,
      user_id: driver.user_id,
      name: existing?.name ?? driver.full_name,
      status: existing?.status ?? driver.status,
      verification_status: existing?.verification_status ?? driver.verification_status,
    })
  })

  uniqueLocations(liveLocations).forEach((location) => {
    const existingEntry = findFleetEntry(byDriverId, location)
    const existing = existingEntry?.[1]
    const targetDriverId = existing?.driver_id ?? location.driver_id

    byDriverId.set(targetDriverId, {
      ...existing,
      driver_id: targetDriverId,
      user_id: location.user_id ?? existing?.user_id,
      name: location.name ?? existing?.name ?? location.driver_id,
      phone: location.phone ?? existing?.phone,
      status: location.status ?? existing?.status,
      latitude: location.latitude,
      longitude: location.longitude,
      heading: location.heading,
      speed_mps: location.speed_mps,
      accuracy_meters: location.accuracy_meters,
      updated_at: location.updated_at,
      is_stale: location.is_stale ?? false,
    })
  })

  return Array.from(byDriverId.values()).filter(
    (item) => item.status === 'online' || item.status === 'busy',
  )
}

function uniqueLocations(liveLocations: DriverLocationCache) {
  const byIdentity = new Map<string, DriverLocationCache[string]>()

  Object.values(liveLocations).forEach((location) => {
    const key = location.driver_id || location.user_id
    if (!key) return

    const existing = byIdentity.get(key)
    if (!existing || isNewerLocation(location.updated_at, existing.updated_at)) {
      byIdentity.set(key, location)
    }
  })

  return Array.from(byIdentity.values())
}

function findFleetEntry(
  byDriverId: Map<string, FleetDriverLocation>,
  location: DriverLocationCache[string],
) {
  return Array.from(byDriverId.entries()).find(([driverId, item]) => {
    return (
      driverId === location.driver_id ||
      driverId === location.user_id ||
      item.driver_id === location.driver_id ||
      item.driver_id === location.user_id ||
      item.user_id === location.driver_id ||
      item.user_id === location.user_id
    )
  })
}

function isNewerLocation(next?: string, previous?: string) {
  if (!previous) return true
  if (!next) return false

  return new Date(next).getTime() >= new Date(previous).getTime()
}

function fromSnapshot(item: TaxiParkDriverLocation): FleetDriverLocation {
  const latitude = getNumber(
    item.location?.latitude ??
      (item as unknown as Record<string, unknown>).latitude ??
      (item as unknown as Record<string, unknown>).lat,
  )
  const longitude = getNumber(
    item.location?.longitude ??
      (item as unknown as Record<string, unknown>).longitude ??
      (item as unknown as Record<string, unknown>).lng ??
      (item as unknown as Record<string, unknown>).lon,
  )

  return {
    driver_id: item.driver_id,
    user_id: item.user_id,
    name: item.name,
    phone: item.phone,
    status: item.status,
    verification_status: item.verification_status,
    is_verified: item.is_verified,
    is_stale: item.is_stale,
    latitude,
    longitude,
    heading: item.heading,
    speed_mps: item.speed_mps,
    accuracy_meters: item.accuracy_meters,
    updated_at: item.recorded_at ?? item.updated_at,
    car: item.car,
  }
}

function fromDriver(driver: TaxiParkDriver): FleetDriverLocation {
  return {
    driver,
    driver_id: driver.id,
    user_id: driver.user_id,
    name: driver.full_name,
    phone: driver.phone,
    status: driver.status,
    verification_status: driver.verification_status,
    is_verified: driver.is_verified,
    latitude:
      driver.latitude ??
      driver.lat ??
      driver.location?.latitude ??
      driver.location?.lat ??
      driver.last_location?.latitude ??
      driver.last_location?.lat,
    longitude:
      driver.longitude ??
      driver.lng ??
      driver.location?.longitude ??
      driver.location?.lng ??
      driver.last_location?.longitude ??
      driver.last_location?.lng,
    updated_at: driver.location_updated_at ?? driver.last_location?.updated_at,
  }
}

function hasLocation(item: FleetDriverLocation): item is FleetDriverLocation & {
  latitude: number
  longitude: number
} {
  return item.latitude !== undefined && item.longitude !== undefined
}

function getMapCenter(items: Array<FleetDriverLocation & { latitude: number; longitude: number }>) {
  if (!items.length) return defaultCenter

  return [
    items.reduce((sum, item) => sum + item.latitude, 0) / items.length,
    items.reduce((sum, item) => sum + item.longitude, 0) / items.length,
  ] as [number, number]
}

function formatCar(car?: TaxiParkDriverLocation['car']) {
  if (!car) return '-'
  return [car.brand, car.model, car.plate_number].filter(Boolean).join(' ') || car.id || '-'
}

function getNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const number = Number(value)
    return Number.isFinite(number) ? number : undefined
  }
  return undefined
}
