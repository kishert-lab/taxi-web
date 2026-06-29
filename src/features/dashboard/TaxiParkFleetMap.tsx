import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { Car, Clock, MapPin } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'

import { appConfig } from '../../app/config'
import {
  loadYandexMaps,
  type YandexCoordinates,
  type YandexMapInstance,
} from '../../shared/maps/yandex-loader'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Card } from '../../shared/ui/Card'
import { EmptyState } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import type { TaxiParkDriver } from '../taxi-park-drivers/api'
import { getTaxiParkSettings } from '../taxi-park-settings/api'
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

type ParkOverview = {
  totalDrivers: number
  activeDrivers: number
  busyDrivers: number
  offlineDrivers: number
  driversOnMap: number
  staleDrivers: number
  lastUpdatedAt?: string
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
  const settings = useQuery({
    queryKey: ['taxi-park-settings'],
    queryFn: getTaxiParkSettings,
    staleTime: 60_000,
  })
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

  const activeDrivers = useMemo(
    () => mergeFleetLocations(drivers, snapshot.data ?? [], liveLocations.data),
    [drivers, liveLocations.data, snapshot.data],
  )
  const driversWithLocation = activeDrivers.filter(hasLocation)
  const selectedDriver =
    activeDrivers.find((driver) => driver.driver_id === selectedDriverId) ?? activeDrivers[0]
  const overview = useMemo(
    () => buildParkOverview(drivers, activeDrivers, driversWithLocation),
    [drivers, activeDrivers, driversWithLocation],
  )
  const parkCenter = settings.data?.city?.center

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
            <FleetMapCanvas
              drivers={driversWithLocation}
              defaultCenter={
                parkCenter ? [parkCenter.latitude, parkCenter.longitude] : defaultCenter
              }
              selectedDriverId={selectedDriver?.driver_id}
              onSelect={setSelectedDriverId}
            />
          </div>
        ) : (
          <div className="flex h-[460px] items-center justify-center">
            <EmptyState title="Нет онлайн-водителей с актуальной геопозицией" />
          </div>
        )}
      </Card>

      <ParkOverviewPanel
        overview={overview}
        selectedDriver={selectedDriver}
        activeDrivers={activeDrivers}
        onSelectDriver={setSelectedDriverId}
      />
    </div>
  )
}

function FleetMapCanvas({
  drivers,
  defaultCenter,
  selectedDriverId,
  onSelect,
}: {
  drivers: Array<FleetDriverLocation & { latitude: number; longitude: number }>
  defaultCenter: [number, number]
  selectedDriverId?: string
  onSelect: (driverId: string) => void
}) {
  const [useLeafletFallback, setUseLeafletFallback] = useState(!appConfig.yandexMapsApiKey)

  if (useLeafletFallback) {
    return (
      <LeafletFleetMapCanvas
        drivers={drivers}
        defaultCenter={defaultCenter}
        selectedDriverId={selectedDriverId}
        onSelect={onSelect}
      />
    )
  }

  return (
    <YandexFleetMapCanvas
      drivers={drivers}
      defaultCenter={defaultCenter}
      selectedDriverId={selectedDriverId}
      onSelect={onSelect}
      onFallback={() => setUseLeafletFallback(true)}
    />
  )
}

function YandexFleetMapCanvas({
  drivers,
  defaultCenter,
  selectedDriverId,
  onSelect,
  onFallback,
}: {
  drivers: Array<FleetDriverLocation & { latitude: number; longitude: number }>
  defaultCenter: [number, number]
  selectedDriverId?: string
  onSelect: (driverId: string) => void
  onFallback: () => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<YandexMapInstance | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    let isDisposed = false

    async function initializeMap() {
      if (!containerRef.current) return

      try {
        const ymaps = await loadYandexMaps(appConfig.yandexMapsApiKey)
        if (isDisposed || !containerRef.current) return

        mapRef.current = new ymaps.Map(
          containerRef.current,
          {
            center: defaultCenter,
            zoom: 12,
            controls: ['zoomControl', 'fullscreenControl'],
          },
          { suppressMapOpenBlock: true },
        )
        setMapReady(true)
      } catch {
        if (!isDisposed) onFallback()
      }
    }

    void initializeMap()

    return () => {
      isDisposed = true
      setMapReady(false)
      mapRef.current?.destroy()
      mapRef.current = null
    }
  }, [defaultCenter, onFallback])

  useEffect(() => {
    let isDisposed = false

    async function syncMap() {
      if (!mapRef.current || !mapReady) return

      const ymaps = await loadYandexMaps(appConfig.yandexMapsApiKey)
      if (isDisposed || !mapRef.current) return

      mapRef.current.geoObjects.removeAll()

      drivers.forEach((driver) => {
        const placemark = new ymaps.Placemark(
          [driver.latitude, driver.longitude],
          {
            hintContent: driver.name,
            balloonContentHeader: driver.name,
            balloonContentBody: `Статус: ${statusLabel(driver.status)}`,
          },
          {
            preset:
              driver.status === 'busy'
                ? 'islands#orangeCircleDotIcon'
                : 'islands#greenCircleDotIcon',
          },
        )

        placemark.events?.add('click', () => onSelect(driver.driver_id))
        mapRef.current?.geoObjects.add(placemark)
      })

      focusFleetMap(mapRef.current, drivers, defaultCenter, selectedDriverId)
      mapRef.current.container.fitToViewport()
    }

    void syncMap()

    return () => {
      isDisposed = true
    }
  }, [defaultCenter, drivers, mapReady, onSelect, selectedDriverId])

  return <div ref={containerRef} className="h-full w-full" />
}

function LeafletFleetMapCanvas({
  drivers,
  defaultCenter,
  selectedDriverId,
  onSelect,
}: {
  drivers: Array<FleetDriverLocation & { latitude: number; longitude: number }>
  defaultCenter: [number, number]
  selectedDriverId?: string
  onSelect: (driverId: string) => void
}) {
  const selectedDriver = drivers.find((driver) => driver.driver_id === selectedDriverId)
  const center = selectedDriver
    ? ([selectedDriver.latitude, selectedDriver.longitude] as [number, number])
    : getMapCenter(drivers, defaultCenter)

  return (
    <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {drivers.map((item) => (
        <Marker
          key={item.driver_id}
          position={[item.latitude, item.longitude]}
          icon={item.status === 'busy' ? busyDriverIcon : onlineDriverIcon}
          eventHandlers={{
            click: () => onSelect(item.driver_id),
          }}
        />
      ))}
    </MapContainer>
  )
}

function ParkOverviewPanel({
  overview,
  selectedDriver,
  activeDrivers,
  onSelectDriver,
}: {
  overview: ParkOverview
  selectedDriver?: FleetDriverLocation
  activeDrivers: FleetDriverLocation[]
  onSelectDriver: (driverId: string) => void
}) {
  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-slate-950">Текущая информация по парку</h3>
        <p className="text-sm text-slate-500">
          Главные показатели по парку и водителям, которые сейчас на линии.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <OverviewMetric label="Всего водителей" value={overview.totalDrivers} tone="slate" />
        <OverviewMetric label="На линии" value={overview.activeDrivers} tone="emerald" />
        <OverviewMetric label="Заняты" value={overview.busyDrivers} tone="amber" />
        <OverviewMetric label="Оффлайн" value={overview.offlineDrivers} tone="slate" />
        <OverviewMetric label="На карте" value={overview.driversOnMap} tone="sky" />
        <OverviewMetric label="Устаревшая гео" value={overview.staleDrivers} tone="rose" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Последнее обновление
            </p>
            <p className="mt-1 text-sm font-bold text-slate-950">
              {formatDate(overview.lastUpdatedAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Фокус карты
            </p>
            <p className="mt-1 text-sm font-medium text-slate-800">
              {selectedDriver?.name ?? 'Не выбран'}
            </p>
          </div>
        </div>

        {selectedDriver ? (
          <div className="mt-4 grid gap-3 text-sm text-slate-700">
            <InfoLine icon={<Car className="h-4 w-4" />} label="Авто" value={formatCar(selectedDriver.car)} />
            <InfoLine
              icon={<MapPin className="h-4 w-4" />}
              label="Координаты"
              value={
                hasLocation(selectedDriver)
                  ? `${selectedDriver.latitude.toFixed(6)}, ${selectedDriver.longitude.toFixed(6)}`
                  : 'нет данных'
              }
            />
            <InfoLine
              icon={<Clock className="h-4 w-4" />}
              label="Обновлено"
              value={formatDate(selectedDriver.updated_at)}
            />
          </div>
        ) : null}
      </div>

      {activeDrivers.length ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Водители на линии</p>
          {activeDrivers.slice(0, 6).map((item) => (
            <button
              key={item.driver_id}
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50"
              onClick={() => onSelectDriver(item.driver_id)}
            >
              <span>
                <span className="block text-sm font-semibold text-slate-800">{item.name}</span>
                <span className="text-xs text-slate-500">
                  {hasLocation(item) ? 'геопозиция получена' : 'без геопозиции'}
                  {item.is_stale ? ', требует обновления' : ''}
                </span>
              </span>
              <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState title="Нет водителей на линии" />
      )}
    </Card>
  )
}

function OverviewMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'slate' | 'emerald' | 'amber' | 'sky' | 'rose'
}) {
  const toneClassName = {
    slate: 'bg-slate-50 text-slate-900',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    sky: 'bg-sky-50 text-sky-700',
    rose: 'bg-rose-50 text-rose-700',
  }[tone]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={`mt-2 inline-flex min-w-14 justify-center rounded-xl px-3 py-2 text-xl font-bold ${toneClassName}`}
      >
        {value}
      </p>
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

function focusFleetMap(
  map: YandexMapInstance,
  drivers: Array<FleetDriverLocation & { latitude: number; longitude: number }>,
  defaultCenter: [number, number],
  selectedDriverId?: string,
) {
  const selectedDriver = selectedDriverId
    ? drivers.find((driver) => driver.driver_id === selectedDriverId)
    : undefined

  if (selectedDriver) {
    map.setCenter([selectedDriver.latitude, selectedDriver.longitude], 15, { duration: 200 })
    return
  }

  if (drivers.length === 1) {
    map.setCenter([drivers[0].latitude, drivers[0].longitude], 15, { duration: 200 })
    return
  }

  const bounds = getBounds(
    drivers.map((driver) => [driver.latitude, driver.longitude] as YandexCoordinates),
  )
  if (!bounds) {
    map.setCenter(defaultCenter, 12, { duration: 200 })
    return
  }

  map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 })
}

function getBounds(points: YandexCoordinates[]) {
  if (!points.length) return null

  const latitudes = points.map(([latitude]) => latitude)
  const longitudes = points.map(([, longitude]) => longitude)

  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)],
  ] as [YandexCoordinates, YandexCoordinates]
}

function buildParkOverview(
  drivers: TaxiParkDriver[],
  activeDrivers: FleetDriverLocation[],
  driversWithLocation: Array<FleetDriverLocation & { latitude: number; longitude: number }>,
): ParkOverview {
  const busyDrivers = activeDrivers.filter((driver) => driver.status === 'busy').length
  const staleDrivers = activeDrivers.filter((driver) => driver.is_stale).length
  const updatedAtCandidates = activeDrivers
    .map((driver) => driver.updated_at)
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())

  return {
    totalDrivers: drivers.length,
    activeDrivers: activeDrivers.length,
    busyDrivers,
    offlineDrivers: Math.max(drivers.length - activeDrivers.length, 0),
    driversOnMap: driversWithLocation.length,
    staleDrivers,
    lastUpdatedAt: updatedAtCandidates[0],
  }
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
      status: driver.status ?? existing?.status,
      verification_status: driver.verification_status ?? existing?.verification_status,
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

function getMapCenter(
  items: Array<FleetDriverLocation & { latitude: number; longitude: number }>,
  fallbackCenter: [number, number],
) {
  if (!items.length) return fallbackCenter

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
