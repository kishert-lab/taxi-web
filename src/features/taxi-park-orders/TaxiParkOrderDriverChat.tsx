import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'

import { getApiErrorMessage } from '../../shared/api/errors'
import { useAuthStore } from '../../shared/auth/auth-store'
import { Button } from '../../shared/ui/Button'
import { Textarea } from '../../shared/ui/Textarea'
import { formatDate } from '../../shared/utils/format-date'
import {
  getTaxiParkDriverChatMessages,
  sendTaxiParkDriverChatMessage,
  type ChatMessagesResponse,
} from './api'

const schema = z.object({
  body: z.string().trim().min(1, 'Введите сообщение').max(2000, 'Сообщение слишком длинное'),
})

type FormValues = z.infer<typeof schema>

export function TaxiParkOrderDriverChat({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.user)
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const messages = useQuery({
    queryKey: ['taxi-park-order-driver-chat', orderId],
    queryFn: () => getTaxiParkDriverChatMessages(orderId, 50),
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  })
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { body: '' },
  })
  const sendMutation = useMutation({
    mutationFn: (values: FormValues) => sendTaxiParkDriverChatMessage(orderId, values.body),
    onSuccess: (message) => {
      form.reset({ body: '' })
      queryClient.setQueryData<ChatMessagesResponse>(
        ['taxi-park-order-driver-chat', orderId],
        (previous) =>
          previous
            ? { ...previous, messages: mergeMessages(previous.messages, message) }
            : {
                thread_id: message.thread_id,
                chat_type: message.chat_type,
                messages: [message],
              },
      )
      void queryClient.invalidateQueries({ queryKey: ['taxi-park-order-driver-chat', orderId] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.data?.messages.length])

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <h3 className="text-sm font-bold uppercase text-slate-500">Чат с водителем</h3>
        <p className="text-sm text-slate-500">
          Сообщения по текущему заказу между диспетчером/таксопарком и водителем.
        </p>
      </div>

      <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
        {messages.isLoading ? <p className="text-sm text-slate-500">Загрузка сообщений...</p> : null}
        {messages.isError ? (
          <p className="text-sm font-medium text-red-600">{getApiErrorMessage(messages.error)}</p>
        ) : null}
        {messages.data?.messages.length === 0 ? (
          <p className="text-sm text-slate-500">Сообщений пока нет</p>
        ) : null}
        {messages.data?.messages.map((message) => {
          const own =
            message.sender_user_id === currentUser?.id ||
            message.sender_role === 'taxi_park' ||
            message.sender_role === 'dispatcher'

          return (
            <div
              key={message.id}
              className={`flex ${own ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  own ? 'bg-amber-500 text-white' : 'bg-white text-slate-800'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
                <p className={`mt-1 text-xs ${own ? 'text-amber-50' : 'text-slate-400'}`}>
                  {message.sender_role} · {formatDate(message.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex flex-col gap-2 md:flex-row"
        onSubmit={form.handleSubmit((values) => sendMutation.mutate(values))}
      >
        <Textarea
          {...form.register('body')}
          className="min-h-20 md:min-h-10"
          placeholder="Сообщение водителю"
        />
        <Button type="submit" disabled={sendMutation.isPending} className="md:self-end">
          <Send className="h-4 w-4" />
          Отправить
        </Button>
      </form>
    </section>
  )
}

function mergeMessages(
  messages: ChatMessagesResponse['messages'],
  nextMessage: ChatMessagesResponse['messages'][number],
) {
  if (messages.some((message) => message.id === nextMessage.id)) return messages
  return [...messages, nextMessage]
}
