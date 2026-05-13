import { Sidebar } from './Sidebar'

export function MobileSidebar({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <button
        type="button"
        aria-label="Закрыть меню"
        className="absolute inset-0 bg-slate-950/50"
        onClick={onClose}
      />
      <div className="relative h-full">
        <Sidebar onNavigate={onClose} />
      </div>
    </div>
  )
}
