import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { getApiErrorMessage } from '../../shared/api/errors'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Skeleton } from '../../shared/ui/Loader'
import { formatDate } from '../../shared/utils/format-date'
import { getPassengerSupportMessages, sendPassengerSupportMessage } from './api'

export function PassengerSupportChatCard() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')

  const chat = useQuery({
    queryKey: ['passenger-support-chat'],
    queryFn: () => getPassengerSupportMessages(),
  })

  const sendMutation = useMutation({
    mutationFn: sendPassengerSupportMessage,
    onSuccess: () => {
      setMessage('')
      void queryClient.invalidateQueries({ queryKey: ['passenger-support-chat'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-950">Поддержка</h2>
        <p className="text-sm text-slate-500">Чат с поддержкой по вашим поездкам и аккаунту.</p>
      </div>

      {chat.isLoading ? <Skeleton className="h-40" /> : null}
      {chat.isError ? <div className="text-sm text-red-700">{getApiErrorMessage(chat.error)}</div> : null}

      {chat.data ? (
        <div className="max-h-80 space-y-2 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {chat.data.messages.length ? (
            chat.data.messages.map((item) => (
              <div
                key={item.id}
                className={
                  item.sender_role === 'passenger'
                    ? 'ml-auto max-w-[85%] rounded-2xl bg-amber-500 px-3 py-2 text-sm text-white'
                    : 'mr-auto max-w-[85%] rounded-2xl bg-white px-3 py-2 text-sm text-slate-700'
                }
              >
                <div>{item.body}</div>
                <div
                  className={
                    item.sender_role === 'passenger'
                      ? 'mt-1 text-right text-xs text-amber-100'
                      : 'mt-1 text-xs text-slate-400'
                  }
                >
                  {item.sender_role} · {formatDate(item.created_at)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-slate-500">Сообщений пока нет.</div>
          )}
        </div>
      ) : null}

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          if (!message.trim()) return
          sendMutation.mutate(message.trim())
        }}
      >
        <Input
          value={message}
          placeholder="Напишите сообщение"
          onChange={(event) => setMessage(event.target.value)}
        />
        <Button type="submit" disabled={!message.trim() || sendMutation.isPending}>
          {sendMutation.isPending ? 'Отправка...' : 'Отправить'}
        </Button>
      </form>
    </Card>
  )
}
