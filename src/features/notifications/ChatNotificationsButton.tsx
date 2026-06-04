import { MessageCircle, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '../../shared/ui/Button'
import { formatDate } from '../../shared/utils/format-date'
import { useNotificationStore } from './notification-store'

const freshWindowMs = 60 * 60 * 1000

export function ChatNotificationsButton() {
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(0)
  const chatNotifications = useNotificationStore((state) => state.chatNotifications)
  const clearChatNotifications = useNotificationStore((state) => state.clearChatNotifications)
  const freshCount = useMemo(
    () =>
      chatNotifications.filter((notification) => {
        const time = new Date(notification.createdAt).getTime()
        return now > 0 && Number.isFinite(time) && now - time <= freshWindowMs
      }).length,
    [chatNotifications, now],
  )
  const shouldBlink = freshCount > 0

  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    updateNow()

    const interval = window.setInterval(updateNow, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="relative">
      <Button
        type="button"
        variant="secondary"
        className={`relative h-10 w-10 p-0 ${shouldBlink ? 'ring-2 ring-amber-400 ring-offset-2 animate-pulse' : ''}`}
        title="Сообщения водителей"
        onClick={() => setOpen((value) => !value)}
      >
        <MessageCircle className="h-4 w-4" />
        {chatNotifications.length ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white">
            {chatNotifications.length > 9 ? '9+' : chatNotifications.length}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[340px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-slate-950">Сообщения водителей</div>
              <div className="text-xs text-slate-500">
                {freshCount ? `Свежих: ${freshCount}` : 'Свежих сообщений нет'}
              </div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {chatNotifications.length ? (
            <>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {chatNotifications.map((notification) => (
                  <Link
                    key={notification.id}
                    className="block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:bg-white"
                    to={`/taxi-park/orders/${notification.orderId}#driver-chat`}
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">
                          Заказ {notification.orderId}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                          {notification.body}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-slate-400">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    {notification.senderName || notification.senderRole ? (
                      <div className="mt-2 text-xs text-slate-500">
                        {notification.senderName ?? notification.senderRole}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                onClick={clearChatNotifications}
              >
                Очистить список
              </button>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Сообщений пока нет
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
