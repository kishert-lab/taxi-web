import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Card } from '../../shared/ui/Card'
import { Skeleton } from '../../shared/ui/Loader'
import { getTaxiParkSettings, updateTaxiParkSettings } from './api'
import { TaxiParkSettingsForm } from './TaxiParkSettingsForm'

export function TaxiParkSettingsPage() {
  const queryClient = useQueryClient()
  const settings = useQuery({
    queryKey: ['taxi-park-settings'],
    queryFn: getTaxiParkSettings,
  })
  const mutation = useMutation({
    mutationFn: updateTaxiParkSettings,
    onMutate: (pas) => {
      console.log(pas)
    },
    onSuccess: () => {
      toast.success('Настройки сохранены')
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-settings'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  if (settings.isLoading) return <Skeleton className="h-96" />
  if (settings.isError) return <Card className="text-red-700">{getApiErrorMessage(settings.error)}</Card>
  if (!settings.data) return null
  
  return (
    <Card>
      <TaxiParkSettingsForm
        settings={settings.data}
        isSaving={mutation.isPending}
        onSubmit={(payload) => mutation.mutate(payload)}
      />
    </Card>
  )
}
