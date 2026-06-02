import L from 'leaflet'
import { MapPin } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

import { Button } from '../../shared/ui/Button'

type LocationMode = 'pickup' | 'destination'

type Point = {
  latitude?: number
  longitude?: number
}

type OrderLocationMapProps = {
  pickup: Point
  destination: Point
  defaultCenter?: Required<Point>
  onPickupChange: (point: Required<Point>) => void
  onDestinationChange: (point: Required<Point>) => void
}

const defaultCenter: [number, number] = [56.838011, 60.597465]

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

export function OrderLocationMap({
  pickup,
  destination,
  defaultCenter: cityCenter,
  onPickupChange,
  onDestinationChange,
}: OrderLocationMapProps) {
  const [mode, setMode] = useState<LocationMode>('pickup')
  const center = useMemo<[number, number]>(() => {
    if (pickup.latitude !== undefined && pickup.longitude !== undefined) {
      return [pickup.latitude, pickup.longitude]
    }
    if (destination.latitude !== undefined && destination.longitude !== undefined) {
      return [destination.latitude, destination.longitude]
    }
    if (cityCenter) {
      return [cityCenter.latitude, cityCenter.longitude]
    }
    return defaultCenter
  }, [
    cityCenter,
    destination.latitude,
    destination.longitude,
    pickup.latitude,
    pickup.longitude,
  ])

  function setPoint(latitude: number, longitude: number) {
    const point = {
      latitude: roundCoordinate(latitude),
      longitude: roundCoordinate(longitude),
    }

    if (mode === 'pickup') {
      onPickupChange(point)
      setMode('destination')
      return
    }

    onDestinationChange(point)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === 'pickup' ? 'primary' : 'secondary'}
            onClick={() => setMode('pickup')}
          >
            <MapPin className="h-4 w-4" />
            Точка подачи
          </Button>
          <Button
            type="button"
            variant={mode === 'destination' ? 'primary' : 'secondary'}
            onClick={() => setMode('destination')}
          >
            <MapPin className="h-4 w-4" />
            Точка назначения
          </Button>
        </div>
        <p className="text-sm text-slate-500">
          Клик по карте ставит выбранную точку. Адрес вводится в полях выше.
        </p>
      </div>

      <div className="h-[360px] overflow-hidden rounded-2xl border border-slate-200">
        <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onClick={setPoint} />
          {pickup.latitude !== undefined && pickup.longitude !== undefined ? (
            <Marker position={[pickup.latitude, pickup.longitude]} icon={pickupIcon} />
          ) : null}
          {destination.latitude !== undefined && destination.longitude !== undefined ? (
            <Marker
              position={[destination.latitude, destination.longitude]}
              icon={destinationIcon}
            />
          ) : null}
        </MapContainer>
      </div>
    </div>
  )
}

function MapClickHandler({ onClick }: { onClick: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onClick(event.latlng.lat, event.latlng.lng)
    },
  })

  return null
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6))
}
