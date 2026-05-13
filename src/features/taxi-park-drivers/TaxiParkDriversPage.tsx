import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusVariant } from '../../shared/ui/badge-utils'
import { Card } from '../../shared/ui/Card'
import { EmptyState, Table } from '../../shared/ui/Table'
import { Select } from '../../shared/ui/Select'
import { Skeleton } from '../../shared/ui/Loader'
import { formatDate } from '../../shared/utils/format-date'
import { getTaxiParkDrivers } from './api'

export function TaxiParkDriversPage() {
  const [status, setStatus] = useState('')
  const drivers = useQuery({
    queryKey: ['taxi-park-drivers', status],
    queryFn: () => getTaxiParkDrivers(status || undefined),
  })

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Водители</h2>
          <p className="text-sm text-slate-500">Статусы водителей таксопарка</p>
        </div>
        <Select className="md:w-56" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Все статусы</option>
          <option value="offline">offline</option>
          <option value="online">online</option>
          <option value="busy">busy</option>
          <option value="paused">paused</option>
          <option value="blocked">blocked</option>
        </Select>
      </Card>
      {drivers.isLoading ? <Skeleton className="h-64" /> : null}
      {drivers.isError ? <Card className="text-red-700">{getApiErrorMessage(drivers.error)}</Card> : null}
      {drivers.data?.length === 0 ? <EmptyState title="Водители не найдены" /> : null}
      {drivers.data?.length ? (
        <Card>
          <Table>
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 p-3">ФИО</th>
                <th className="border-b border-slate-200 p-3">Рейтинг</th>
                <th className="border-b border-slate-200 p-3">Статус</th>
                <th className="border-b border-slate-200 p-3">Дата добавления</th>
                <th className="border-b border-slate-200 p-3">user_id</th>
              </tr>
            </thead>
            <tbody>
              {drivers.data.map((driver) => (
                <tr key={driver.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 p-3 font-medium">{driver.full_name}</td>
                  <td className="border-b border-slate-100 p-3">{driver.rating.toFixed(1)}</td>
                  <td className="border-b border-slate-100 p-3">
                    <Badge variant={statusVariant(driver.status)}>{driver.status}</Badge>
                  </td>
                  <td className="border-b border-slate-100 p-3">{formatDate(driver.created_at)}</td>
                  <td className="border-b border-slate-100 p-3 font-mono text-xs">{driver.user_id}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}
    </div>
  )
}
