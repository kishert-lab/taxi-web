import { useState } from 'react'
import { Outlet } from 'react-router-dom'

import { useWebSocket } from '../../features/websocket/use-mobile-ws'
import { Header } from './Header'
import { MobileSidebar } from './MobileSidebar'
import { Sidebar } from './Sidebar'

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  useWebSocket()

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="fixed inset-y-0 left-0 hidden md:block">
        <Sidebar />
      </div>
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="md:pl-72">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
