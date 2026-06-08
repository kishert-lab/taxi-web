import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Button } from '../../shared/ui/Button'
import { Card, StatCard } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Skeleton } from '../../shared/ui/Loader'
import { formatMoneyCents } from '../../shared/utils/format-money'
import {
  getAdminFinanceDocuments,
  getAdminPlatformFinanceOverview,
  getAdminPlatformInvoices,
  getAdminTaxiParkFinanceOverview,
  getAdminTaxiParkPlatformFeeDebt,
  markAdminPlatformInvoicePaid,
} from '../finance/api'
import {
  FinanceDocumentsTable,
  FinanceOverviewCards,
  PlatformDebtCard,
  PlatformInvoicesTable,
  Section,
} from '../finance/finance-ui'

export function AdminFinancePage() {
  const queryClient = useQueryClient()
  const [taxiParkId, setTaxiParkId] = useState('')
  const [submittedTaxiParkId, setSubmittedTaxiParkId] = useState('')
  const [platformOverview, invoices, documents] = useQueries({
    queries: [
      { queryKey: ['admin-platform-finance-overview'], queryFn: () => getAdminPlatformFinanceOverview() },
      { queryKey: ['admin-platform-invoices'], queryFn: () => getAdminPlatformInvoices({ limit: 100 }) },
      { queryKey: ['admin-finance-documents'], queryFn: () => getAdminFinanceDocuments({ limit: 100 }) },
    ],
  })
  const taxiParkOverview = useQuery({
    queryKey: ['admin-taxi-park-finance-overview', submittedTaxiParkId],
    queryFn: () => getAdminTaxiParkFinanceOverview(submittedTaxiParkId),
    enabled: Boolean(submittedTaxiParkId),
  })
  const taxiParkDebt = useQuery({
    queryKey: ['admin-taxi-park-platform-fee-debt', submittedTaxiParkId],
    queryFn: () => getAdminTaxiParkPlatformFeeDebt(submittedTaxiParkId),
    enabled: Boolean(submittedTaxiParkId),
  })
  const markPaidMutation = useMutation({
    mutationFn: markAdminPlatformInvoicePaid,
    onSuccess: () => {
      toast.success('Счет отмечен оплаченным')
      void queryClient.invalidateQueries({ queryKey: ['admin-platform-invoices'] })
      if (submittedTaxiParkId) {
        void queryClient.invalidateQueries({ queryKey: ['admin-taxi-park-platform-fee-debt', submittedTaxiParkId] })
        void queryClient.invalidateQueries({ queryKey: ['admin-taxi-park-finance-overview', submittedTaxiParkId] })
      }
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const firstError = [platformOverview, invoices, documents, taxiParkOverview, taxiParkDebt].find((query) => query.isError)
  if (firstError?.error) return <Card className="text-red-700">{getApiErrorMessage(firstError.error)}</Card>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Финансы платформы</h1>
        <p className="text-sm text-slate-500">
          Плата платформе и долг таксопарков учитываются отдельно от дохода таксопарка.
        </p>
      </div>

      <Section title="Обзор платформы">
        {platformOverview.isLoading ? <Skeleton className="h-48" /> : platformOverview.data ? <AdminPlatformOverviewCards overview={platformOverview.data} /> : null}
      </Section>

      <Section title="Таксопарк">
        <Card>
          <form
            className="grid gap-3 md:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault()
              setSubmittedTaxiParkId(taxiParkId.trim())
            }}
          >
            <Input
              value={taxiParkId}
              onChange={(event) => setTaxiParkId(event.target.value)}
              placeholder="UUID таксопарка"
            />
            <Button type="submit">Показать</Button>
          </form>
        </Card>
        {submittedTaxiParkId ? (
          <div className="space-y-4">
            {taxiParkOverview.isLoading ? <Skeleton className="h-48" /> : taxiParkOverview.data ? <FinanceOverviewCards overview={taxiParkOverview.data} /> : null}
            <PlatformDebtCard amount={taxiParkDebt.data?.amount} />
          </div>
        ) : null}
      </Section>

      <Section title="Счета платформы">
        {invoices.isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <PlatformInvoicesTable
            invoices={invoices.data}
            actions={(invoice) => (
              <Button
                type="button"
                disabled={markPaidMutation.isPending || invoice.status === 'paid'}
                onClick={() => markPaidMutation.mutate(invoice.id)}
              >
                Оплачено
              </Button>
            )}
          />
        )}
      </Section>

      <Section title="Финансовые документы">
        {documents.isLoading ? <Skeleton className="h-48" /> : <FinanceDocumentsTable documents={documents.data} />}
      </Section>
    </div>
  )
}

function AdminPlatformOverviewCards({
  overview,
}: {
  overview: Awaited<ReturnType<typeof getAdminPlatformFinanceOverview>>
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Выручка завершенных заказов" value={formatMoneyCents(overview.completed_orders_revenue)} />
      <StatCard title="Комиссии платформы" value={formatMoneyCents(overview.total_commissions)} />
      <StatCard title="Выплаты водителям" value={formatMoneyCents(overview.driver_payouts)} />
      <StatCard title="Доход таксопарков" value={formatMoneyCents(overview.taxi_park_revenue)} />
      <StatCard title="Завершенных заказов" value={overview.completed_orders_count} />
      <StatCard title="Средняя комиссия" value={formatMoneyCents(overview.average_commission_per_order)} />
    </div>
  )
}
