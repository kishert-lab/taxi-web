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

import type { UserRole } from '../api/types'
import { useAuthStore } from '../auth/auth-store'
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
    { label: 'Водители', href: '/taxi-park/drivers', icon: Users },
    { label: 'Автомобили', href: '/taxi-park/cars', icon: Car },
    { label: 'Заказы', href: '/taxi-park/orders', icon: ClipboardList },
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
