import { useQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Card, StatCard } from '../../shared/ui/Card'
import { Skeleton } from '../../shared/ui/Loader'
import { formatMoneyCents } from '../../shared/utils/format-money'
import { getAdminFinanceOverview } from './api'

export function AdminFinancePage() {
  const overview = useQuery({
    queryKey: ['admin-finance-overview'],
    queryFn: getAdminFinanceOverview,
  })

  if (overview.isLoading) {
    return <Skeleton className="h-44" />
  }

  if (overview.isError) {
    return <Card className="text-red-700">{getApiErrorMessage(overview.error)}</Card>
  }

  const data = overview.data
  if (!data) return null

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <StatCard title="Общая выручка" value={formatMoneyCents(data.total_revenue)} />
      <StatCard title="Комиссии платформы" value={formatMoneyCents(data.platform_commission)} />
      <StatCard title="Завершенных заказов" value={data.completed_orders_count} />
      <StatCard title="Выплаты водителям" value={formatMoneyCents(data.driver_payouts)} />
      <StatCard title="Доход таксопарков" value={formatMoneyCents(data.taxi_park_income)} />
    </div>
  )
}
