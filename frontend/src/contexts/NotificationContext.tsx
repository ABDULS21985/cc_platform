'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ApiService, type NotificationApi } from '@/services/api';
import { getSocket } from '@/lib/socket';

type Listener = (n: NotificationApi) => void;

interface NotificationContextValue {
  unreadCount: number;
  /** Subscribe to live notifications. Returns an unsubscribe function. */
  onNotification: (cb: Listener) => () => void;
  /** Imperatively refresh unread count from the server. */
  refresh: () => Promise<void>;
  /** Mark a single notification read (also decrements the local count). */
  markRead: (id: number) => void;
  /** Mark all read (locally + on the server). */
  markAllRead: () => Promise<void>;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const listenersRef = React.useRef<Set<Listener>>(new Set());

  const refresh = React.useCallback(async () => {
    try {
      const res = await ApiService.notifications.unreadCount();
      const count = res.data?.data?.unread_count ?? 0;
      setUnreadCount(count);
    } catch {
      // ignore — handled elsewhere
    }
  }, []);

  const onNotification = React.useCallback<NotificationContextValue['onNotification']>(
    (cb) => {
      listenersRef.current.add(cb);
      return () => {
        listenersRef.current.delete(cb);
      };
    },
    []
  );

  const markRead = React.useCallback((id: number) => {
    ApiService.notifications.markRead(id).catch(() => {});
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = React.useCallback(async () => {
    setUnreadCount(0);
    try {
      await ApiService.notifications.markAllRead();
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.localStorage.getItem('access_token')) return;
    void refresh();

    const socket = getSocket();
    if (!socket) return;

    const join = () => socket.emit('join_notifications');
    if (socket.connected) {
      join();
    } else {
      socket.once('connect', join);
    }

    const handleCreated = (payload: {
      notification: NotificationApi;
      unread_count: number;
    }) => {
      setUnreadCount(payload.unread_count);
      for (const cb of listenersRef.current) {
        try {
          cb(payload.notification);
        } catch {
          // listener errors should not break others
        }
      }
      // Lightweight global toast as a fallback for pages not subscribed.
      const direction = payload.notification.amount?.direction;
      const desc = direction
        ? `₦${payload.notification.amount?.value} ${direction === 'in' ? 'received' : 'sent'}`
        : payload.notification.body || payload.notification.source;
      toast(payload.notification.title, { description: desc });
    };

    socket.on('notification_created', handleCreated);

    return () => {
      socket.off('notification_created', handleCreated);
      socket.off('connect', join);
    };
  }, [refresh]);

  const value = React.useMemo<NotificationContextValue>(
    () => ({ unreadCount, onNotification, refresh, markRead, markAllRead }),
    [unreadCount, onNotification, refresh, markRead, markAllRead]
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = React.useContext(NotificationContext);
  if (!ctx) {
    // Allow components to import the hook without crashing when the
    // provider isn't mounted (e.g. on signin pages). Return a no-op shape.
    return {
      unreadCount: 0,
      onNotification: () => () => {},
      refresh: async () => {},
      markRead: () => {},
      markAllRead: async () => {},
    };
  }
  return ctx;
}
