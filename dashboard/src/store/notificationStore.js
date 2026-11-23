import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: [],

      unreadCount: () => get().notifications.filter((n) => !n.read).length,

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              id: `notif-${Date.now()}`,
              timestamp: 'Just now',
              read: false,
              ...notification,
            },
            ...state.notifications,
          ],
        })),
    }),
    {
      name: 'germin8-notifications',
      // v1 dropped the bundled demo notifications; older saved state still holds them.
      version: 1,
      migrate: () => ({ notifications: [] }),
    }
  )
);
