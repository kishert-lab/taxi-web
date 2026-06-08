import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ChatNotification = {
  id: string
  orderId: string
  orderTitle?: string
  orderSummary?: string
  senderUserId?: string
  senderName?: string
  senderRole?: string
  driverName?: string
  body: string
  createdAt: string
}

type NotificationState = {
  chatNotifications: ChatNotification[]
  addChatNotification: (notification: ChatNotification) => void
  markOrderChatRead: (orderId: string) => void
  clearChatNotifications: () => void
}

const maxNotifications = 30

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      chatNotifications: [],
      addChatNotification: (notification) =>
        set((state) => {
          const withoutDuplicate = state.chatNotifications.filter(
            (item) => item.id !== notification.id,
          )

          return {
            chatNotifications: [notification, ...withoutDuplicate].slice(0, maxNotifications),
          }
        }),
      markOrderChatRead: (orderId) =>
        set((state) => ({
          chatNotifications: state.chatNotifications.filter(
            (notification) => notification.orderId !== orderId,
          ),
        })),
      clearChatNotifications: () => set({ chatNotifications: [] }),
    }),
    {
      name: 'taxi_platform_chat_notifications',
      partialize: (state) => ({ chatNotifications: state.chatNotifications }),
    },
  ),
)
