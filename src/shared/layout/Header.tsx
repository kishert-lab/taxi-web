import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useLocation } from 'react-router-dom'

import { ChatNotificationsButton } from '../../features/notifications/ChatNotificationsButton'
import { useAuthStore } from '../auth/auth-store'
import { Button } from '../ui/Button'
import { ThemeToggle } from '../ui/ThemeToggle'

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/admin/finance': 'Финансы платформы',
  '/admin/legal': 'Юридические документы',
  '/taxi-park/settings': 'Настройки таксопарка',
  '/taxi-park/tariffs': 'Тарифы',
  '/taxi-park/drivers': 'Водители',
  '/taxi-park/cars': 'Автомобили',
  '/taxi-park/orders': 'Заказы',
  '/driver/finance': 'Финансы водителя',
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-[#F8FAFC]/90 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-200 bg-white p-2 md:hidden"
          onClick={onMenuClick}
        >
          <span className="block h-0.5 w-5 bg-slate-900" />
          <span className="mt-1 block h-0.5 w-5 bg-slate-900" />
          <span className="mt-1 block h-0.5 w-5 bg-slate-900" />
        </button>
        <h1 className="truncate text-xl font-bold text-slate-950">
          {titles[location.pathname] ?? 'Такси Пульт'}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="hidden text-right text-sm md:block">
          <div className="font-semibold text-slate-900">{user?.name ?? 'Пользователь'}</div>
          <div className="text-slate-500">{user?.email ?? user?.phone ?? user?.role}</div>
        </div>
        <ChatNotificationsButton />
        <Button
          type="button"
          variant="secondary"
          className="h-10 w-10 p-0"
          onClick={() => void queryClient.invalidateQueries()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
