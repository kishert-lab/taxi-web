import L from 'leaflet'
import { MapPin } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'

import { appConfig } from '../../app/config'
import { loadYandexMaps, type YandexCoordinates, type YandexMapInstance } from '../../shared/maps/yandex-loader'
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
        <LocationMapCanvas
          center={center}
          pickup={pickup}
          destination={destination}
          onPointSelect={setPoint}
        />
      </div>
    </div>
  )
}

function LocationMapCanvas({
  center,
  pickup,
  destination,
  onPointSelect,
}: {
  center: [number, number]
  pickup: Point
  destination: Point
  onPointSelect: (latitude: number, longitude: number) => void
}) {
  const [useLeafletFallback, setUseLeafletFallback] = useState(!appConfig.yandexMapsApiKey)

  if (useLeafletFallback) {
    return (
      <LeafletLocationMapCanvas
        center={center}
        pickup={pickup}
        destination={destination}
        onPointSelect={onPointSelect}
      />
    )
  }

  return (
    <YandexLocationMapCanvas
      center={center}
      pickup={pickup}
      destination={destination}
      onPointSelect={onPointSelect}
      onFallback={() => setUseLeafletFallback(true)}
    />
  )
}

function YandexLocationMapCanvas({
  center,
  pickup,
  destination,
  onPointSelect,
  onFallback,
}: {
  center: [number, number]
  pickup: Point
  destination: Point
  onPointSelect: (latitude: number, longitude: number) => void
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

        const map = new ymaps.Map(
          containerRef.current,
          {
            center,
            zoom: 13,
            controls: ['zoomControl', 'fullscreenControl'],
          },
          { suppressMapOpenBlock: true },
        )

        map.events.add('click', (event) => {
          const coordinates = event.get('coords')
          if (!coordinates) return
          onPointSelect(coordinates[0], coordinates[1])
        })

        mapRef.current = map
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
  }, [center, onFallback, onPointSelect])

  useEffect(() => {
    let isDisposed = false

    async function syncMap() {
      if (!mapRef.current || !mapReady) return

      const ymaps = await loadYandexMaps(appConfig.yandexMapsApiKey)
      if (isDisposed || !mapRef.current) return

      mapRef.current.geoObjects.removeAll()

      if (pickup.latitude !== undefined && pickup.longitude !== undefined) {
        mapRef.current.geoObjects.add(
          new ymaps.Placemark(
            [pickup.latitude, pickup.longitude],
            { hintContent: 'Точка подачи' },
            { preset: 'islands#greenCircleDotIcon' },
          ),
        )
      }

      if (destination.latitude !== undefined && destination.longitude !== undefined) {
        mapRef.current.geoObjects.add(
          new ymaps.Placemark(
            [destination.latitude, destination.longitude],
            { hintContent: 'Точка назначения' },
            { preset: 'islands#redCircleDotIcon' },
          ),
        )
      }

      const focusPoints = [pickup, destination]
        .filter((point): point is Required<Point> => point.latitude !== undefined && point.longitude !== undefined)
        .map((point) => [point.latitude, point.longitude] as YandexCoordinates)

      if (focusPoints.length > 1) {
        const bounds = getBounds(focusPoints)
        if (bounds) {
          mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 })
        }
      } else {
        mapRef.current.setCenter(center, 13, { duration: 200 })
      }

      mapRef.current.container.fitToViewport()
    }

    void syncMap()

    return () => {
      isDisposed = true
    }
  }, [center, destination, mapReady, pickup])

  return <div ref={containerRef} className="h-full w-full" />
}

function LeafletLocationMapCanvas({
  center,
  pickup,
  destination,
  onPointSelect,
}: {
  center: [number, number]
  pickup: Point
  destination: Point
  onPointSelect: (latitude: number, longitude: number) => void
}) {
  return (
    <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onClick={onPointSelect} />
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

function getBounds(points: YandexCoordinates[]) {
  if (!points.length) return null

  const latitudes = points.map(([latitude]) => latitude)
  const longitudes = points.map(([, longitude]) => longitude)

  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)],
  ] as [YandexCoordinates, YandexCoordinates]
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6))
}
