import {
  BarChart3,
  BadgeDollarSign,
  Car,
  ClipboardList,
  FileText,
  Gauge,
  LogOut,
  Map,
  Percent,
  Shield,
  Settings,
  Tags,
  Users,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'

import { useAuthStore } from '../auth/auth-store'
import { hasPermission, type PermissionCode } from '../rbac/permissions'
import { Button } from '../ui/Button'
import { cn } from '../utils/cn'

const menuItems: {
  label: string
  href: string
  icon: typeof Gauge
  permission: PermissionCode
}[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Gauge, permission: 'dashboard.view' },
  { label: 'Заказы', href: '/orders', icon: ClipboardList, permission: 'orders.view' },
  { label: 'Карта', href: '/map', icon: Map, permission: 'map.view' },
  { label: 'Водители', href: '/drivers', icon: Users, permission: 'drivers.view' },
  { label: 'Автомобили', href: '/cars', icon: Car, permission: 'cars.view' },
  { label: 'Пассажиры', href: '/passengers', icon: Users, permission: 'passengers.view' },
  { label: 'Таксопарки', href: '/taxi-parks', icon: Car, permission: 'taxi_parks.view' },
  { label: 'Тарифы', href: '/tariffs', icon: Tags, permission: 'tariffs.manage' },
  { label: 'Комиссии', href: '/commissions', icon: Percent, permission: 'commissions.manage' },
  { label: 'Финансы', href: '/finance', icon: BadgeDollarSign, permission: 'finance.view' },
  { label: 'Выплаты', href: '/payouts', icon: BadgeDollarSign, permission: 'payouts.manage' },
  { label: 'Зоны', href: '/zones', icon: Map, permission: 'zones.view' },
  { label: 'Промокоды', href: '/promocodes', icon: Tags, permission: 'promocodes.view' },
  { label: 'Support', href: '/support', icon: FileText, permission: 'support.view' },
  { label: 'Аналитика', href: '/analytics', icon: BarChart3, permission: 'analytics.view' },
  { label: 'Админы', href: '/admin-users', icon: Shield, permission: 'admin_users.manage' },
  { label: 'Роли', href: '/roles', icon: Shield, permission: 'roles.manage' },
  { label: 'Настройки', href: '/settings', icon: Settings, permission: 'settings.manage' },
  { label: 'Аудит', href: '/audit-logs', icon: FileText, permission: 'audit_logs.view' },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const menu = menuItems.filter((item) => hasPermission(user?.role, item.permission))

  return (
    <aside className="flex h-full min-h-screen w-72 flex-col bg-[#0F172A] px-4 py-5 text-white">
      <div className="px-2">
        <div className="text-xl font-bold">Taxi Platform</div>
        <div className="mt-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-slate-300">
          {user?.role ?? 'guest'}
        </div>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        {menu.map((item) => {
          const Icon = item.icon

          return (
            <NavLink
              key={item.href + item.label}
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
