import { create } from "zustand";
import {
  createJSONStorage,
  persist,
} from "zustand/middleware";

export type NotificationKind =
  | "success"
  | "error"
  | "info";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  jobId?: string;
  createdAt: string;
  read: boolean;
};

type NewNotification = Omit<
  AppNotification,
  "id" | "createdAt" | "read"
>;

type NotificationStore = {
  notifications: AppNotification[];
  addNotification: (
    notification: NewNotification
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
};

function createNotificationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export const useNotificationStore =
  create<NotificationStore>()(
    persist(
      (set) => ({
        notifications: [],

        addNotification: (notification) =>
          set((state) => ({
            notifications: [
              {
                ...notification,
                id: createNotificationId(),
                createdAt: new Date().toISOString(),
                read: false,
              },
              ...state.notifications,
            ].slice(0, 50),
          })),

        markAsRead: (id) =>
          set((state) => ({
            notifications: state.notifications.map(
              (notification) =>
                notification.id === id
                  ? {
                      ...notification,
                      read: true,
                    }
                  : notification
            ),
          })),

        markAllAsRead: () =>
          set((state) => ({
            notifications: state.notifications.map(
              (notification) => ({
                ...notification,
                read: true,
              })
            ),
          })),

        removeNotification: (id) =>
          set((state) => ({
            notifications:
              state.notifications.filter(
                (notification) =>
                  notification.id !== id
              ),
          })),

        clearNotifications: () =>
          set({ notifications: [] }),
      }),
      {
        name: "veyqra-notifications",
        storage: createJSONStorage(
          () => localStorage
        ),
      }
    )
  );
