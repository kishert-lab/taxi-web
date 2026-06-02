import { useMutation, useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import { useState } from 'react'

import { Input } from '../../shared/ui/Input'
import { cn } from '../../shared/utils/cn'
import { confirmGeocoderPoint, searchGeocoder, type GeocoderPoint } from './api'

export function AddressSearchInput({
  value,
  cityId,
  placeholder,
  error,
  onAddressChange,
  onSelectPoint,
}: {
  value: string
  cityId?: string
  placeholder?: string
  error?: string
  onAddressChange: (value: string) => void
  onSelectPoint: (point: GeocoderPoint) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const query = value.trim()
  const search = useQuery({
    queryKey: ['geocoder-search', query, cityId],
    queryFn: () => searchGeocoder(query, cityId),
    enabled: isOpen && query.length >= 3,
    staleTime: 30_000,
  })
  const confirmMutation = useMutation({
    mutationFn: confirmGeocoderPoint,
  })

  function selectPoint(point: GeocoderPoint) {
    onAddressChange(point.address)
    onSelectPoint(point)
    setIsOpen(false)
    confirmMutation.mutate(point)
  }

  return (
    <div className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          onAddressChange(event.target.value)
          setIsOpen(true)
        }}
      />
      {error ? <span className="mt-1 block text-xs font-medium text-red-600">{error}</span> : null}
      {isOpen && query.length >= 3 ? (
        <div className="absolute z-[1200] mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {search.isLoading ? (
            <div className="px-3 py-2 text-sm text-slate-500">Ищем адрес...</div>
          ) : null}
          {search.data?.length ? (
            search.data.map((point) => (
              <button
                key={`${point.source ?? 'local'}-${point.id ?? point.external_id ?? point.address}`}
                type="button"
                className="flex w-full gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => selectPoint(point)}
              >
                <MapPin className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{point.address}</span>
                  <span className="text-xs text-slate-500">
                    {point.is_trusted ? 'Проверенная точка' : point.source ?? 'геокодер'}
                  </span>
                </span>
              </button>
            ))
          ) : search.isFetched ? (
            <div className="px-3 py-2 text-sm text-slate-500">Адрес не найден</div>
          ) : null}
        </div>
      ) : null}
      <div
        className={cn('fixed inset-0 z-[1100]', isOpen ? 'block' : 'hidden')}
        onClick={() => setIsOpen(false)}
      />
    </div>
  )
}
