import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Button } from '../../shared/ui/Button'
import { Card, StatCard } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Skeleton } from '../../shared/ui/Loader'
import { Modal } from '../../shared/ui/Modal'
import { Select } from '../../shared/ui/Select'
import { Textarea } from '../../shared/ui/Textarea'
import { basisPointsToPercent, percentToBasisPoints, rublesToCents } from '../../shared/utils/format-money'
import { formatMoneyCents } from '../../shared/utils/format-money'
import { getTaxiParkDrivers } from '../taxi-park-drivers/api'
import {
  approveTaxiParkDriverPayout,
  createTaxiParkDriverPayout,
  createTaxiParkPlatformInvoice,
  getTaxiParkDriverFinanceBalance,
  getTaxiParkDriverPayouts,
  getTaxiParkFinanceDocuments,
  getTaxiParkFinanceOrders,
  getTaxiParkFinanceOverview,
  getTaxiParkFinanceSettings,
  getTaxiParkPlatformFeeAccruals,
  getTaxiParkPlatformFeeDebt,
  getTaxiParkPlatformInvoices,
  markTaxiParkDriverPayoutPaid,
  updateTaxiParkDriverCommission,
  type DriverPayout,
} from './api'
import {
  FinanceDocumentsTable,
  FinanceOverviewCards,
  OrderFinanceTable,
  PayoutsTable,
  PlatformDebtCard,
  PlatformInvoicesTable,
  Section,
} from './finance-ui'

const commissionSchema = z.object({
  driver_commission_percent: z.coerce.number().min(0).max(100),
})

const payoutSchema = z.object({
  driver_id: z.string().min(1, 'Выберите водителя'),
  amount_rubles: z.coerce.number().min(0.01, 'Укажите сумму'),
  period_from: z.string().optional(),
  period_to: z.string().optional(),
  comment: z.string().optional(),
})

const invoiceSchema = z.object({
  period_from: z.string().min(1, 'Укажите начало периода'),
  period_to: z.string().min(1, 'Укажите конец периода'),
})

type CommissionValues = z.input<typeof commissionSchema>
type CommissionSubmitValues = z.output<typeof commissionSchema>
type PayoutValues = z.input<typeof payoutSchema>
type PayoutSubmitValues = z.output<typeof payoutSchema>
type InvoiceValues = z.infer<typeof invoiceSchema>

export function TaxiParkFinancePage() {
  const queryClient = useQueryClient()
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [payoutOpen, setPayoutOpen] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(false)

  const [settings, overview, orders, debt, accruals, invoices, documents, drivers] = useQueries({
    queries: [
      { queryKey: ['taxi-park-finance-settings'], queryFn: getTaxiParkFinanceSettings },
      { queryKey: ['taxi-park-finance-overview'], queryFn: () => getTaxiParkFinanceOverview() },
      { queryKey: ['taxi-park-finance-orders'], queryFn: () => getTaxiParkFinanceOrders({ limit: 50 }) },
      { queryKey: ['taxi-park-platform-fee-debt'], queryFn: getTaxiParkPlatformFeeDebt },
      { queryKey: ['taxi-park-platform-fee-accruals'], queryFn: () => getTaxiParkPlatformFeeAccruals({ limit: 50 }) },
      { queryKey: ['taxi-park-platform-invoices'], queryFn: () => getTaxiParkPlatformInvoices({ limit: 50 }) },
      { queryKey: ['taxi-park-finance-documents'], queryFn: () => getTaxiParkFinanceDocuments({ limit: 50 }) },
      { queryKey: ['taxi-park-drivers', 'finance'], queryFn: () => getTaxiParkDrivers() },
    ],
  })

  const driverBalance = useQuery({
    queryKey: ['taxi-park-finance-driver-balance', selectedDriverId],
    queryFn: () => getTaxiParkDriverFinanceBalance(selectedDriverId),
    enabled: Boolean(selectedDriverId),
  })
  const driverPayouts = useQuery({
    queryKey: ['taxi-park-finance-driver-payouts', selectedDriverId],
    queryFn: () => getTaxiParkDriverPayouts(selectedDriverId, { limit: 50 }),
    enabled: Boolean(selectedDriverId),
  })

  const commissionForm = useForm<CommissionValues, unknown, CommissionSubmitValues>({
    resolver: zodResolver(commissionSchema),
    values: {
      driver_commission_percent: settings.data
        ? basisPointsToPercent(settings.data.driver_commission_basis_points)
        : 0,
    },
  })
  const payoutForm = useForm<PayoutValues, unknown, PayoutSubmitValues>({
    resolver: zodResolver(payoutSchema),
    defaultValues: { driver_id: '', amount_rubles: 0, comment: '' },
  })
  const invoiceForm = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: { period_from: '', period_to: '' },
  })

  const commissionMutation = useMutation({
    mutationFn: (values: CommissionSubmitValues) =>
      updateTaxiParkDriverCommission(percentToBasisPoints(values.driver_commission_percent)),
    onSuccess: () => {
      toast.success('Комиссия водителя сохранена')
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-finance-settings'] })
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-finance-overview'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const payoutMutation = useMutation({
    mutationFn: (values: PayoutSubmitValues) =>
      createTaxiParkDriverPayout(values.driver_id, {
        amount_cents: rublesToCents(values.amount_rubles),
        period_from: dateToRFC3339(values.period_from),
        period_to: dateToRFC3339(values.period_to),
        comment: values.comment?.trim() || undefined,
      }),
    onSuccess: (_, values) => {
      toast.success('Выплата создана')
      setPayoutOpen(false)
      payoutForm.reset()
      setSelectedDriverId(values.driver_id)
      void invalidatePayoutQueries(queryClient, values.driver_id)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const approveMutation = useMutation({
    mutationFn: approveTaxiParkDriverPayout,
    onSuccess: (payout) => {
      toast.success('Выплата согласована')
      void invalidatePayoutQueries(queryClient, payout.driver_id)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const paidMutation = useMutation({
    mutationFn: markTaxiParkDriverPayoutPaid,
    onSuccess: (payout) => {
      toast.success('Выплата отмечена оплаченной')
      void invalidatePayoutQueries(queryClient, payout.driver_id)
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const invoiceMutation = useMutation({
    mutationFn: (values: InvoiceValues) =>
      createTaxiParkPlatformInvoice({
        period_from: dateToRFC3339(values.period_from) ?? values.period_from,
        period_to: dateToRFC3339(values.period_to) ?? values.period_to,
      }),
    onSuccess: () => {
      toast.success('Счет платформы создан')
      setInvoiceOpen(false)
      invoiceForm.reset()
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-platform-invoices'] })
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-platform-fee-debt'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  const firstError = [settings, overview, orders, debt, accruals, invoices, documents, drivers].find((query) => query.isError)
  if (firstError?.error) return <Card className="text-red-700">{getApiErrorMessage(firstError.error)}</Card>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Финансы таксопарка</h1>
          <p className="text-sm text-slate-500">
            Доход таксопарка, плата платформе и долг перед платформой отображаются отдельно.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setPayoutOpen(true)}>
            Создать выплату
          </Button>
          <Button type="button" onClick={() => setInvoiceOpen(true)}>
            Создать счет платформы
          </Button>
        </div>
      </div>

      {overview.isLoading ? <Skeleton className="h-48" /> : overview.data ? <FinanceOverviewCards overview={overview.data} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <form className="space-y-3" onSubmit={commissionForm.handleSubmit((values) => commissionMutation.mutate(values))}>
            <h2 className="text-lg font-bold text-slate-950">Настройки комиссии водителя</h2>
            <p className="text-sm text-slate-500">
              Плата платформе задается отдельно backend и не вычитается из дохода таксопарка по заказу.
            </p>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Комиссия таксопарка с водителя, %</span>
              <Input type="number" min={0} max={100} step="0.01" {...commissionForm.register('driver_commission_percent')} />
            </label>
            <div className="text-sm text-slate-500">
              Плата платформе: {settings.data?.platform_fee_percent ?? '0.00'}%
            </div>
            <Button type="submit" disabled={commissionMutation.isPending}>
              Сохранить
            </Button>
          </form>
        </Card>
        <PlatformDebtCard amount={debt.data?.amount} />
      </div>

      <Section title="Финансы заказов">
        {orders.isLoading ? <Skeleton className="h-64" /> : <OrderFinanceTable orders={orders.data} />}
      </Section>

      <Section title="Баланс и выплаты водителя">
        <Card className="space-y-4">
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Водитель</span>
            <Select value={selectedDriverId} onChange={(event) => setSelectedDriverId(event.target.value)}>
              <option value="">Выберите водителя</option>
              {drivers.data?.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name}
                </option>
              ))}
            </Select>
          </label>
          {selectedDriverId && driverBalance.data ? (
            <div className="grid gap-4 md:grid-cols-2">
              <StatCard title="Доступно водителю" value={formatMoneyCents(driverBalance.data.available)} />
              <StatCard title="Ожидает" value={formatMoneyCents(driverBalance.data.pending)} />
            </div>
          ) : null}
        </Card>
        {driverPayouts.isLoading ? <Skeleton className="h-48" /> : <PayoutsTable payouts={driverPayouts.data} actions={(payout) => payoutActions(payout, approveMutation.mutate, paidMutation.mutate, approveMutation.isPending || paidMutation.isPending)} />}
      </Section>

      <Section title="Начисления платы платформе">
        {accruals.isLoading ? <Skeleton className="h-64" /> : <OrderFinanceTable orders={accruals.data} />}
      </Section>

      <Section title="Счета платформы">
        {invoices.isLoading ? <Skeleton className="h-48" /> : <PlatformInvoicesTable invoices={invoices.data} />}
      </Section>

      <Section title="Финансовые документы">
        {documents.isLoading ? <Skeleton className="h-48" /> : <FinanceDocumentsTable documents={documents.data} />}
      </Section>

      <Modal title="Создать выплату водителю" open={payoutOpen} onClose={() => setPayoutOpen(false)}>
        <form className="space-y-3" onSubmit={payoutForm.handleSubmit((values) => payoutMutation.mutate(values))}>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Водитель</span>
            <Select {...payoutForm.register('driver_id')}>
              <option value="">Выберите водителя</option>
              {drivers.data?.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Сумма, ₽</span>
            <Input type="number" min={0.01} step="0.01" {...payoutForm.register('amount_rubles')} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Период с</span>
              <Input type="date" {...payoutForm.register('period_from')} />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Период по</span>
              <Input type="date" {...payoutForm.register('period_to')} />
            </label>
          </div>
          <Textarea placeholder="Комментарий" {...payoutForm.register('comment')} />
          <Button type="submit" disabled={payoutMutation.isPending}>Создать</Button>
        </form>
      </Modal>

      <Modal title="Создать счет платформы" open={invoiceOpen} onClose={() => setInvoiceOpen(false)}>
        <form className="space-y-3" onSubmit={invoiceForm.handleSubmit((values) => invoiceMutation.mutate(values))}>
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Период с</span>
              <Input type="date" {...invoiceForm.register('period_from')} />
            </label>
            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Период по</span>
              <Input type="date" {...invoiceForm.register('period_to')} />
            </label>
          </div>
          <Button type="submit" disabled={invoiceMutation.isPending}>Создать</Button>
        </form>
      </Modal>
    </div>
  )
}

function payoutActions(
  payout: DriverPayout,
  approve: (id: string) => void,
  markPaid: (id: string) => void,
  disabled: boolean,
) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" disabled={disabled || payout.status !== 'created'} onClick={() => approve(payout.id)}>
        Согласовать
      </Button>
      <Button type="button" disabled={disabled || payout.status === 'paid'} onClick={() => markPaid(payout.id)}>
        Оплачено
      </Button>
    </div>
  )
}

function dateToRFC3339(value?: string) {
  return value ? new Date(`${value}T00:00:00Z`).toISOString() : undefined
}

function invalidatePayoutQueries(queryClient: ReturnType<typeof useQueryClient>, driverId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['taxi-park-finance-driver-payouts', driverId] }),
    queryClient.invalidateQueries({ queryKey: ['taxi-park-finance-driver-balance', driverId] }),
    queryClient.invalidateQueries({ queryKey: ['taxi-park-finance-documents'] }),
  ])
}
