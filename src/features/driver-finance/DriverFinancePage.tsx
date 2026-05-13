import { useQuery } from '@tanstack/react-query'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Card, StatCard } from '../../shared/ui/Card'
import { Skeleton } from '../../shared/ui/Loader'
import { EmptyState, Table } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyCents } from '../../shared/utils/format-money'
import { getDriverBalance, getDriverTransactions } from './api'

export function DriverFinancePage() {
  const balance = useQuery({ queryKey: ['driver-balance'], queryFn: getDriverBalance })
  const transactions = useQuery({
    queryKey: ['driver-transactions'],
    queryFn: getDriverTransactions,
  })

  if (balance.isLoading || transactions.isLoading) return <Skeleton className="h-80" />
  if (balance.isError) return <Card className="text-red-700">{getApiErrorMessage(balance.error)}</Card>
  if (transactions.isError) return <Card className="text-red-700">{getApiErrorMessage(transactions.error)}</Card>

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard title="Доступный баланс" value={formatMoneyCents(balance.data?.available)} />
        <StatCard title="Ожидающий баланс" value={formatMoneyCents(balance.data?.pending)} />
      </div>
      {transactions.data?.length === 0 ? <EmptyState title="Транзакции не найдены" /> : null}
      {transactions.data?.length ? (
        <Card>
          <Table>
            <thead>
              <tr className="text-slate-500">
                <th className="border-b border-slate-200 p-3">Тип</th>
                <th className="border-b border-slate-200 p-3">Сумма заказа</th>
                <th className="border-b border-slate-200 p-3">Комиссия</th>
                <th className="border-b border-slate-200 p-3">Чистый доход</th>
                <th className="border-b border-slate-200 p-3">Дата</th>
              </tr>
            </thead>
            <tbody>
              {transactions.data.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 p-3">{transaction.type}</td>
                  <td className="border-b border-slate-100 p-3">{formatMoneyCents(transaction.amount)}</td>
                  <td className="border-b border-slate-100 p-3">{formatMoneyCents(transaction.commission)}</td>
                  <td className="border-b border-slate-100 p-3">{formatMoneyCents(transaction.net_income)}</td>
                  <td className="border-b border-slate-100 p-3">{formatDate(transaction.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      ) : null}
    </div>
  )
}
