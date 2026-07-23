import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Badge } from '../../shared/ui/Badge'
import { statusLabel, statusVariant } from '../../shared/ui/badge-utils'
import { Card, StatCard } from '../../shared/ui/Card'
import { Skeleton } from '../../shared/ui/Loader'
import { EmptyState } from '../../shared/ui/Table'
import { formatDate } from '../../shared/utils/format-date'
import { formatMoneyAmount } from '../../shared/utils/format-money'
import { getCurrentPassengerOrder, getPassengerOrderHistory, getPassengerProfile } from './api'

export function PassengerDashboard() {
  const [profile, currentOrder, history] = useQueries({
    queries: [
      { queryKey: ['passenger-profile'], queryFn: getPassengerProfile },
      { queryKey: ['passenger-current-order'], queryFn: getCurrentPassengerOrder },
      { queryKey: ['passenger-order-history'], queryFn: getPassengerOrderHistory },
    ],
  })

  if ([profile, currentOrder, history].some((query) => query.isLoading)) {
    return <Skeleton className="h-80" />
  }

  const firstError = [profile, currentOrder, history].find((query) => query.isError)
  if (firstError?.error) {
    return <Card className="text-red-700">{getApiErrorMessage(firstError.error)}</Card>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Профиль"
          value={profile.data?.name ?? profile.data?.phone ?? 'Пассажир'}
        />
        <StatCard
          title="Текущий заказ"
          value={currentOrder.data ? statusLabel(currentOrder.data.status) : 'Нет'}
        />
        <StatCard title="История поездок" value={history.data?.length ?? 0} />
        <StatCard title="Телефон" value={profile.data?.phone ?? '-'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-950">Текущий заказ</h2>
              <p className="text-sm text-slate-500">
                Актуальный статус и краткая информация по поездке.
              </p>
            </div>
            <Link className="text-sm font-semibold text-amber-700" to="/passenger/orders">
              Открыть заказы
            </Link>
          </div>

          {currentOrder.data ? (
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-base font-bold text-slate-950">
                    {currentOrder.data.pickup_point?.address ?? 'Точка подачи'} {'->'}{' '}
                    {currentOrder.data.destination_point?.address ?? 'Точка назначения'}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Водитель: {currentOrder.data.driver?.name ?? 'еще не назначен'}
                  </div>
                </div>
                <Badge variant={statusVariant(currentOrder.data.status)}>
                  {statusLabel(currentOrder.data.status)}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <Info label="Цена" value={formatMoneyAmount(currentOrder.data.price)} />
                <Info label="ETA" value={formatEta(currentOrder.data.eta_seconds)} />
                <Info label="Версия" value={String(currentOrder.data.version ?? '-')} />
              </div>
            </div>
          ) : (
            <EmptyState title="Сейчас активного заказа нет" />
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold text-slate-950">Быстрые действия</h2>
          <QuickLink
            to="/passenger/orders"
            label="Заказать такси"
            description="Создание нового заказа и история поездок."
          />
          <QuickLink
            to="/passenger/profile"
            label="Профиль"
            description="Имя, email и данные аккаунта."
          />
          <QuickLink
            to="/passenger/support"
            label="Поддержка"
            description="Чат с поддержкой пассажиров."
          />
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Последние поездки</h2>
            <p className="text-sm text-slate-500">
              Последние завершенные или отмененные заказы.
            </p>
          </div>
          <Link className="text-sm font-semibold text-amber-700" to="/passenger/orders">
            Вся история
          </Link>
        </div>

        {history.data?.length ? (
          <div className="space-y-3">
            {history.data.slice(0, 5).map((order) => (
              <div key={order.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold text-slate-950">
                      {order.pickup_point?.address ?? 'Маршрут'} {'->'}{' '}
                      {order.destination_point?.address ?? 'Маршрут'}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {order.timeline?.[0]?.created_at
                        ? formatDate(order.timeline[0].created_at)
                        : 'Дата недоступна'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
                    <span className="font-semibold text-slate-900">
                      {formatMoneyAmount(order.price)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="История поездок пока пуста" />
        )}
      </Card>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function QuickLink({
  to,
  label,
  description,
}: {
  to: string
  label: string
  description: string
}) {
  return (
    <Link
      className="block rounded-2xl border border-slate-200 p-4 transition hover:bg-slate-50"
      to={to}
    >
      <div className="font-semibold text-slate-950">{label}</div>
      <div className="mt-1 text-sm text-slate-500">{description}</div>
    </Link>
  )
}

function formatEta(value?: number) {
  if (!value) return '—'
  const minutes = Math.round(value / 60)
  return `${minutes} мин`
}
