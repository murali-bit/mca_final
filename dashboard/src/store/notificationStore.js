import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif-1',
    title: 'AOC-4 Statutory Deadline Approaching',
    message: 'Form AOC-4 for LessonBoard Tech is due in 5 days (Oct 30, 2026). Ensure Auditor and Directors Report are signed.',
    type: 'warning',
    timestamp: '10 mins ago',
    read: false,
    formCode: 'AOC-4',
    actionUrl: '/dashboard/user/forms?form=AOC-4&mode=overview',
  },
  {
    id: 'notif-2',
    title: 'MGT-7 Annual Return Challan Confirmed',
    message: 'MCA V3 filing confirmed with SRN F98124912. Statutory receipt downloaded to Document Vault.',
    type: 'success',
    timestamp: '2 hours ago',
    read: false,
    formCode: 'MGT-7',
    actionUrl: '/dashboard/user/forms?form=MGT-7&mode=filesure',
  },
  {
    id: 'notif-3',
    title: 'DIR-3 KYC OTP Pending Verification',
    message: 'Director Ramesh Sharma has not completed annual Mobile & Email OTP validation. Deadline Sept 30.',
    type: 'warning',
    timestamp: '5 hours ago',
    read: false,
    formCode: 'DIR-3-KYC',
    actionUrl: '/dashboard/user/forms?form=DIR-3-KYC&mode=manual',
  },
  {
    id: 'notif-4',
    title: 'AI OCR Extraction Completed',
    message: 'BalanceSheet_FY25.pdf processed successfully. 18 statutory fields extracted with 96% average neural confidence.',
    type: 'info',
    timestamp: '1 day ago',
    read: true,
    formCode: 'AOC-4',
    actionUrl: '/dashboard/user/forms?form=AOC-4&mode=extractor',
  },
  {
    id: 'notif-5',
    title: 'Germin8 Chrome Extension Synchronized',
    message: 'ADT-1 draft successfully pushed to Chrome extension local storage for automated 1-click filing on mca.gov.in.',
    type: 'success',
    timestamp: '1 day ago',
    read: true,
    formCode: 'ADT-1',
    actionUrl: '/dashboard/user/forms?form=ADT-1&mode=connector',
  },
];

export const useNotificationStore = create(
  persist(
    (set, get) => ({
      notifications: INITIAL_NOTIFICATIONS,

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
    }
  )
);

