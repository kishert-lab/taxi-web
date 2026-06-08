import { useQueries } from '@tanstack/react-query'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Card, StatCard } from '../../shared/ui/Card'
import { Skeleton } from '../../shared/ui/Loader'
import { formatMoneyCents } from '../../shared/utils/format-money'
import {
  getDriverFinanceBalance,
  getDriverFinanceDocuments,
  getDriverFinanceOrders,
  getDriverFinancePayouts,
} from '../finance/api'
import {
  FinanceDocumentsTable,
  OrderFinanceTable,
  PayoutsTable,
  Section,
} from '../finance/finance-ui'

export function DriverFinancePage() {
  const [balance, orders, payouts, documents] = useQueries({
    queries: [
      { queryKey: ['driver-finance-balance'], queryFn: getDriverFinanceBalance },
      { queryKey: ['driver-finance-orders'], queryFn: () => getDriverFinanceOrders({ limit: 50 }) },
      { queryKey: ['driver-finance-payouts'], queryFn: () => getDriverFinancePayouts({ limit: 50 }) },
      { queryKey: ['driver-finance-documents'], queryFn: () => getDriverFinanceDocuments({ limit: 50 }) },
    ],
  })

  if ([balance, orders, payouts, documents].some((query) => query.isLoading)) {
    return <Skeleton className="h-80" />
  }

  const firstError = [balance, orders, payouts, documents].find((query) => query.isError)
  if (firstError?.error) return <Card className="text-red-700">{getApiErrorMessage(firstError.error)}</Card>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Финансы водителя</h1>
        <p className="text-sm text-slate-500">
          История заказов, начисления дохода водителя и выплаты.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="Доступный баланс" value={formatMoneyCents(balance.data?.available)} />
        <StatCard title="Ожидающий баланс" value={formatMoneyCents(balance.data?.pending)} />
      </div>

      <Section title="История заказов">
        <OrderFinanceTable orders={orders.data} />
      </Section>

      <Section title="Выплаты">
        <PayoutsTable payouts={payouts.data} />
      </Section>

      <Section title="Финансовые документы">
        <FinanceDocumentsTable documents={documents.data} />
      </Section>
    </div>
  )
}
