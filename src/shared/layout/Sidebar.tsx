import { useQuery } from '@tanstack/react-query'
import {
  BadgeDollarSign,
  Car,
  ClipboardList,
  FileText,
  Gauge,
  LogOut,
  Settings,
  Tags,
  Users,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { getTaxiParkSettings } from '../../features/taxi-park-settings/api'
import type { UserRole } from '../api/types'
import { useAuthStore } from '../auth/auth-store'
import { Badge } from '../ui/Badge'
import { statusLabel } from '../ui/badge-utils'
import { Button } from '../ui/Button'
import { cn } from '../utils/cn'

type MenuItem = {
  label: string
  href: string
  icon: typeof Gauge
}

const menuByRole: Partial<Record<UserRole, MenuItem[]>> = {
  admin: [
    { label: 'Dashboard', href: '/dashboard', icon: Gauge },
    { label: 'Финансы', href: '/admin/finance', icon: BadgeDollarSign },
    { label: 'Юр. документы', href: '/admin/legal', icon: FileText },
  ],
  taxi_park: [
    { label: 'Dashboard', href: '/dashboard', icon: Gauge },
    { label: 'Настройки', href: '/taxi-park/settings', icon: Settings },
    { label: 'Тарифы', href: '/taxi-park/tariffs', icon: Tags },
    { label: 'Диспетчеры', href: '/taxi-park/dispatchers', icon: Users },
    { label: 'Водители', href: '/taxi-park/drivers', icon: Users },
    { label: 'Автомобили', href: '/taxi-park/cars', icon: Car },
    { label: 'Заказы', href: '/taxi-park/orders', icon: ClipboardList },
    { label: 'Финансы', href: '/taxi-park/finance', icon: BadgeDollarSign },
  ],
  driver: [
    { label: 'Dashboard', href: '/dashboard', icon: Gauge },
    { label: 'Финансы', href: '/driver/finance', icon: BadgeDollarSign },
  ],
  dispatcher: [
    { label: 'Dashboard', href: '/dashboard', icon: Gauge },
    { label: 'Заказы таксопарка', href: '/taxi-park/orders', icon: ClipboardList },
    { label: 'Водители', href: '/taxi-park/drivers', icon: Users },
    { label: 'Автомобили', href: '/taxi-park/cars', icon: Car },
  ],
  passenger: [{ label: 'Dashboard', href: '/dashboard', icon: Gauge }],
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const menu = menuByRole[user?.role ?? 'passenger'] ?? menuByRole.passenger ?? []
  const showTaxiParkInfo = user?.role === 'taxi_park' || user?.role === 'dispatcher'
  const settings = useQuery({
    queryKey: ['taxi-park-settings'],
    queryFn: getTaxiParkSettings,
    enabled: showTaxiParkInfo,
    staleTime: 60_000,
  })

  return (
    <aside className="flex h-full min-h-screen w-72 flex-col bg-[#0F172A] px-4 py-5 text-white">
      <div className="px-2">
        <div className="text-lg font-bold leading-tight">Такси Пульт</div>
        <div className="mt-0.5 text-xs font-medium text-slate-400">операционный центр</div>
        {user?.role && user.role !== 'taxi_park' ? (
          <div className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-slate-300">
            {getRoleLabel(user.role)}
          </div>
        ) : null}
        {showTaxiParkInfo ? <TaxiParkSidebarInfo settings={settings.data} /> : null}
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1">
        {menu.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white',
                  isActive && 'bg-[#F59E0B] text-white hover:bg-[#F59E0B]',
                )
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <Button
        type="button"
        variant="ghost"
        className="justify-start text-slate-300 hover:bg-white/10 hover:text-white"
        onClick={() => {
          logout()
          navigate('/login')
        }}
      >
        <LogOut className="h-4 w-4" />
        Выйти
      </Button>
    </aside>
  )
}

function getRoleLabel(role: UserRole) {
  const labels: Partial<Record<UserRole, string>> = {
    admin: 'Администратор',
    taxi_park: 'Таксопарк',
    dispatcher: 'Диспетчер',
    driver: 'Водитель',
    passenger: 'Пассажир',
    super_admin: 'Суперадминистратор',
    city_admin: 'Администратор города',
    taxi_park_admin: 'Администратор парка',
    finance_manager: 'Финансы',
    moderator: 'Модератор',
    support: 'Поддержка',
  }

  return labels[role] ?? role
}

function TaxiParkSidebarInfo({
  settings,
}: {
  settings: Awaited<ReturnType<typeof getTaxiParkSettings>> | undefined
}) {
  if (!settings) {
    return (
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.06] p-3 text-xs text-slate-400">
        Данные таксопарка загружаются
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.06] p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold leading-tight text-white">
            {settings.display_name || settings.legal_name || 'Таксопарк'}
          </div>
          <div className="mt-1 truncate text-xs text-slate-400">
            {settings.city?.name ?? 'Город не указан'}
            {settings.city?.region ? `, ${settings.city.region}` : ''}
          </div>
        </div>
        <Badge variant={settings.is_active ? 'success' : 'danger'}>
          {settings.is_active ? statusLabel('active') : statusLabel('inactive')}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 text-xs text-slate-300">
        <SidebarInfoLine label="Поддержка" value={settings.support_phone || '-'} />
        <SidebarInfoLine label="Email" value={settings.support_email || '-'} />
      </div>
    </div>
  )
}

function SidebarInfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="truncate text-right font-medium text-slate-200">{value}</span>
    </div>
  )
}
