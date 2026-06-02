import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet'

import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Card } from '../../shared/ui/Card'
import { formatDate } from '../../shared/utils/format-date'
import { getTaxiParkDriverLocations } from '../dashboard/api'
import type { DriverLocationCache } from '../websocket/use-mobile-ws'
import type { CoordinatesPayload, TaxiParkOrder } from './api'

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
}

export function TaxiParkOrderMap({ order }: { order: TaxiParkOrder }) {
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
  const center = getCenter(pickup, destination, driverLocation)
  const route = [pickup, destination]
    .filter((point): point is CoordinatesPayload => Boolean(point))
    .map((point) => [point.latitude, point.longitude] as [number, number])

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-bold text-slate-950">Карта заказа</h2>
        <p className="text-sm text-slate-500">
          Подача, конечная точка и текущая позиция водителя, если он на линии.
        </p>
      </div>
      <div className="h-[460px]">
        <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {pickup ? (
            <Marker position={[pickup.latitude, pickup.longitude]} icon={pickupIcon} />
          ) : null}
          {destination ? (
            <Marker
              position={[destination.latitude, destination.longitude]}
              icon={destinationIcon}
            />
          ) : null}
          {driverPoint ? (
            <Marker
              position={[driverPoint.latitude, driverPoint.longitude]}
              icon={driverIcon}
            />
          ) : null}
          {route.length > 1 ? <Polyline positions={route} color="#F59E0B" /> : null}
        </MapContainer>
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

function getCenter(
  pickup?: CoordinatesPayload,
  destination?: CoordinatesPayload,
  driver?: DriverPositionLike,
) {
  const driverPoint = getDriverPoint(driver)
  if (driverPoint) {
    return [driverPoint.latitude, driverPoint.longitude] as [number, number]
  }

  if (pickup) return [pickup.latitude, pickup.longitude] as [number, number]
  if (destination) return [destination.latitude, destination.longitude] as [number, number]
  return defaultCenter
}

function getDriverPoint(driver?: DriverPositionLike) {
  const latitude = driver?.latitude ?? driver?.location?.latitude
  const longitude = driver?.longitude ?? driver?.location?.longitude

  if (latitude === undefined || longitude === undefined) return undefined
  return { latitude, longitude }
}

function getDriverName(
  order: TaxiParkOrder,
  driver?: { name?: string },
) {
  return driver?.name ?? order.driver_name ?? order.driver_id ?? 'Не назначен'
}

function getDriverUpdatedAt(
  driver?: {
    updated_at?: string
    recorded_at?: string
  },
) {
  return driver?.updated_at ?? driver?.recorded_at
}
