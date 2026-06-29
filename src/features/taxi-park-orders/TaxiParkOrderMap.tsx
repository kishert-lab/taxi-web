import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'

import { appConfig } from '../../app/config'
import { loadYandexMaps, type YandexCoordinates, type YandexMapInstance } from '../../shared/maps/yandex-loader'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Card } from '../../shared/ui/Card'
import { formatDate } from '../../shared/utils/format-date'
import { getTaxiParkDriverLocations } from '../dashboard/api'
import { getTaxiParkSettings } from '../taxi-park-settings/api'
import type { DriverLocationCache } from '../websocket/use-mobile-ws'
import type { CoordinatesPayload, TaxiParkOrder } from './api'
import { getDriverDisplayName } from './order-display'

const pickupIcon = L.divIcon({
  className: '',
  html: '<div style="height:28px;width:28px;border-radius:9999px;background:#16a34a;border:3px solid white;box-shadow:0 8px 18px rgba(15,23,42,.25)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const destinationIcon = L.divIcon({
  className: '',
  html: '<div style="height:28px;width:28px;border-radius:9999px;background:#dc2626;border:3px solid white;box-shadow:0 8px 18px rgba(15,23,42,.25)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

const driverIcon = L.divIcon({
  className: '',
  html: '<div style="height:32px;width:32px;border-radius:9999px;background:#f59e0b;border:3px solid white;box-shadow:0 10px 20px rgba(15,23,42,.28);display:flex;align-items:center;justify-content:center;color:white;font-weight:800;font-size:13px">T</div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
})

const defaultCenter: [number, number] = [58.010455, 56.229443]

type DriverPositionLike = {
  latitude?: number
  longitude?: number
  location?: CoordinatesPayload
  name?: string
  status?: string
  updated_at?: string
  recorded_at?: string
}

export function TaxiParkOrderMap({ order }: { order: TaxiParkOrder }) {
  const settings = useQuery({
    queryKey: ['taxi-park-settings'],
    queryFn: getTaxiParkSettings,
    staleTime: 60_000,
  })
  const locations = useQuery<DriverLocationCache>({
    queryKey: ['taxi-park-driver-locations'],
    queryFn: async () => ({}),
    initialData: {},
    staleTime: Infinity,
  })
  const snapshot = useQuery({
    queryKey: ['taxi-park-driver-locations-snapshot'],
    queryFn: () => getTaxiParkDriverLocations(30),
    refetchOnReconnect: true,
  })
  const pickup = order.pickup_location ?? order.pickup_point
  const destination = order.destination_location ?? order.destination_point
  const snapshotDriver = order.driver_id
    ? snapshot.data?.find((item) => item.driver_id === order.driver_id)
    : undefined
  const driverLocation = order.driver_id
    ? locations.data[order.driver_id] ?? snapshotDriver
    : undefined
  const driverPoint = getDriverPoint(driverLocation)
  const parkCenter = settings.data?.city?.center

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-bold text-slate-950">Карта заказа</h2>
        <p className="text-sm text-slate-500">
          Подача, конечная точка и текущая позиция водителя, если он на линии.
        </p>
      </div>
      <div className="h-[460px]">
        <OrderMapCanvas
          pickup={pickup}
          destination={destination}
          driverPoint={driverPoint}
          driverName={getDriverName(order, driverLocation)}
          defaultCenter={parkCenter ? [parkCenter.latitude, parkCenter.longitude] : defaultCenter}
        />
      </div>
      <div className="grid gap-3 border-t border-slate-200 px-4 py-3 text-sm md:grid-cols-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Водитель</p>
          <p className="mt-1 font-semibold text-slate-800">
            {getDriverName(order, driverLocation)}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Статус</p>
          <div className="mt-1">
            <Badge variant={statusVariant(driverLocation?.status)}>
              {statusLabel(driverLocation?.status)}
            </Badge>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400">Геопозиция</p>
          <p className="mt-1 font-semibold text-slate-800">
            {driverPoint ? 'Водитель отображается на карте' : 'Нет актуальной геопозиции'}
          </p>
          <p className="text-xs text-slate-500">
            {formatDate(getDriverUpdatedAt(driverLocation))}
          </p>
        </div>
      </div>
    </Card>
  )
}

function OrderMapCanvas({
  pickup,
  destination,
  driverPoint,
  driverName,
  defaultCenter,
}: {
  pickup?: CoordinatesPayload
  destination?: CoordinatesPayload
  driverPoint?: CoordinatesPayload
  driverName: string
  defaultCenter: [number, number]
}) {
  const [useLeafletFallback, setUseLeafletFallback] = useState(!appConfig.yandexMapsApiKey)

  if (useLeafletFallback) {
    return (
      <LeafletOrderMapCanvas
        pickup={pickup}
        destination={destination}
        driverPoint={driverPoint}
        defaultCenter={defaultCenter}
      />
    )
  }

  return (
    <YandexOrderMapCanvas
      pickup={pickup}
      destination={destination}
      driverPoint={driverPoint}
      driverName={driverName}
      defaultCenter={defaultCenter}
      onFallback={() => setUseLeafletFallback(true)}
    />
  )
}

function YandexOrderMapCanvas({
  pickup,
  destination,
  driverPoint,
  driverName,
  defaultCenter,
  onFallback,
}: {
  pickup?: CoordinatesPayload
  destination?: CoordinatesPayload
  driverPoint?: CoordinatesPayload
  driverName: string
  defaultCenter: [number, number]
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

      if (pickup) {
        mapRef.current.geoObjects.add(
          new ymaps.Placemark(
            [pickup.latitude, pickup.longitude],
            { hintContent: 'Точка подачи' },
            { preset: 'islands#greenCircleDotIcon' },
          ),
        )
      }

      if (destination) {
        mapRef.current.geoObjects.add(
          new ymaps.Placemark(
            [destination.latitude, destination.longitude],
            { hintContent: 'Точка назначения' },
            { preset: 'islands#redCircleDotIcon' },
          ),
        )
      }

      if (driverPoint) {
        mapRef.current.geoObjects.add(
          new ymaps.Placemark(
            [driverPoint.latitude, driverPoint.longitude],
            { hintContent: driverName },
            { preset: 'islands#orangeCircleDotIcon' },
          ),
        )
      }

      const route = [pickup, destination]
        .filter((point): point is CoordinatesPayload => Boolean(point))
        .map((point) => [point.latitude, point.longitude] as YandexCoordinates)

      if (route.length > 1) {
        mapRef.current.geoObjects.add(
          new ymaps.Polyline(route, {}, { strokeColor: '#F59E0B', strokeWidth: 4, opacity: 0.85 }),
        )
      }

      const focusPoints = [pickup, destination, driverPoint]
        .filter((point): point is CoordinatesPayload => Boolean(point))
        .map((point) => [point.latitude, point.longitude] as YandexCoordinates)

      focusYandexMap(mapRef.current, focusPoints, defaultCenter)
      mapRef.current.container.fitToViewport()
    }

    void syncMap()

    return () => {
      isDisposed = true
    }
  }, [defaultCenter, destination, driverName, driverPoint, mapReady, pickup])

  return <div ref={containerRef} className="h-full w-full" />
}

function LeafletOrderMapCanvas({
  pickup,
  destination,
  driverPoint,
  defaultCenter,
}: {
  pickup?: CoordinatesPayload
  destination?: CoordinatesPayload
  driverPoint?: CoordinatesPayload
  defaultCenter: [number, number]
}) {
  const center = getCenter(pickup, destination, driverPoint, defaultCenter)
  const route = [pickup, destination]
    .filter((point): point is CoordinatesPayload => Boolean(point))
    .map((point) => [point.latitude, point.longitude] as [number, number])

  return (
    <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pickup ? <Marker position={[pickup.latitude, pickup.longitude]} icon={pickupIcon} /> : null}
      {destination ? (
        <Marker position={[destination.latitude, destination.longitude]} icon={destinationIcon} />
      ) : null}
      {driverPoint ? (
        <Marker position={[driverPoint.latitude, driverPoint.longitude]} icon={driverIcon} />
      ) : null}
      {route.length > 1 ? <Polyline positions={route} color="#F59E0B" /> : null}
    </MapContainer>
  )
}

function focusYandexMap(
  map: YandexMapInstance,
  points: YandexCoordinates[],
  defaultCenter: [number, number],
) {
  if (!points.length) {
    map.setCenter(defaultCenter, 12, { duration: 200 })
    return
  }

  if (points.length === 1) {
    map.setCenter(points[0], 14, { duration: 200 })
    return
  }

  const bounds = getBounds(points)
  if (!bounds) return

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

function getCenter(
  pickup?: CoordinatesPayload,
  destination?: CoordinatesPayload,
  driverPoint?: CoordinatesPayload,
  fallbackCenter: [number, number] = defaultCenter,
) {
  if (driverPoint) {
    return [driverPoint.latitude, driverPoint.longitude] as [number, number]
  }

  if (pickup) return [pickup.latitude, pickup.longitude] as [number, number]
  if (destination) return [destination.latitude, destination.longitude] as [number, number]
  return fallbackCenter
}

function getDriverPoint(driver?: DriverPositionLike) {
  const latitude = driver?.latitude ?? driver?.location?.latitude
  const longitude = driver?.longitude ?? driver?.location?.longitude

  if (latitude === undefined || longitude === undefined) return undefined
  return { latitude, longitude }
}

function getDriverName(order: TaxiParkOrder, driver?: { name?: string }) {
  return getDriverDisplayName(order, driver?.name)
}

function getDriverUpdatedAt(driver?: { updated_at?: string; recorded_at?: string }) {
  return driver?.updated_at ?? driver?.recorded_at
}
