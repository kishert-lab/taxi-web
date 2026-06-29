const YANDEX_MAPS_SCRIPT_ID = 'yandex-maps-api-script'
const YANDEX_MAPS_SCRIPT_URL = 'https://api-maps.yandex.ru/2.1/'

export type YandexCoordinates = [number, number]

export type YandexGeoObject = {
  events?: {
    add: (eventName: string, handler: (event: YandexEvent) => void) => void
  }
}

export type YandexMapInstance = {
  destroy: () => void
  container: {
    fitToViewport: () => void
  }
  geoObjects: {
    add: (object: YandexGeoObject) => void
    removeAll: () => void
  }
  events: {
    add: (eventName: string, handler: (event: YandexEvent) => void) => void
  }
  setCenter: (coordinates: YandexCoordinates, zoom?: number, options?: { duration?: number }) => void
  setBounds: (
    bounds: [YandexCoordinates, YandexCoordinates],
    options?: { checkZoomRange?: boolean; zoomMargin?: number | number[] },
  ) => void
}

export type YandexMapConstructor = new (
  element: HTMLElement,
  state: {
    center: YandexCoordinates
    zoom: number
    controls?: string[]
  },
  options?: {
    suppressMapOpenBlock?: boolean
  },
) => YandexMapInstance

export type YandexPlacemarkConstructor = new (
  coordinates: YandexCoordinates,
  properties?: Record<string, unknown>,
  options?: Record<string, unknown>,
) => YandexGeoObject

export type YandexPolylineConstructor = new (
  coordinates: YandexCoordinates[],
  properties?: Record<string, unknown>,
  options?: Record<string, unknown>,
) => YandexGeoObject

export type YandexEvent = {
  get: (name: 'coords') => YandexCoordinates | undefined
}

export type YandexMapsApi = {
  ready: (callback: () => void) => void
  Map: YandexMapConstructor
  Placemark: YandexPlacemarkConstructor
  Polyline: YandexPolylineConstructor
}

declare global {
  interface Window {
    ymaps?: YandexMapsApi
  }
}

let yandexMapsPromise: Promise<YandexMapsApi> | null = null

export function loadYandexMaps(apiKey: string) {
  if (!apiKey) {
    return Promise.reject(new Error('Yandex Maps API key is not configured'))
  }

  if (window.ymaps) {
    return waitForYandexMaps(window.ymaps)
  }

  if (yandexMapsPromise) {
    return yandexMapsPromise
  }

  yandexMapsPromise = new Promise<YandexMapsApi>((resolve, reject) => {
    const existingScript = document.getElementById(YANDEX_MAPS_SCRIPT_ID) as HTMLScriptElement | null

    const handleReady = () => {
      if (!window.ymaps) {
        reject(new Error('Yandex Maps API did not initialize'))
        return
      }

      void waitForYandexMaps(window.ymaps).then(resolve).catch(reject)
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleReady, { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Yandex Maps API')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.id = YANDEX_MAPS_SCRIPT_ID
    script.src = `${YANDEX_MAPS_SCRIPT_URL}?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`
    script.async = true
    script.onload = handleReady
    script.onerror = () => reject(new Error('Failed to load Yandex Maps API'))
    document.head.appendChild(script)
  }).catch((error) => {
    yandexMapsPromise = null
    throw error
  })

  return yandexMapsPromise
}

function waitForYandexMaps(ymaps: YandexMapsApi) {
  return new Promise<YandexMapsApi>((resolve) => {
    ymaps.ready(() => resolve(ymaps))
  })
}
