'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { ApiService, type NotificationApi } from '@/services/api';
import { getSocket } from '@/lib/socket';

type Listener = (n: NotificationApi) => void;

type OSPermission = 'default' | 'granted' | 'denied' | 'unsupported';

type NotifCategory =
  | 'money'
  | 'bills'
  | 'communities'
  | 'events'
  | 'security'
  | 'system';

type CategoryCounts = Record<NotifCategory, number>;

const EMPTY_COUNTS: CategoryCounts = {
  money: 0,
  bills: 0,
  communities: 0,
  events: 0,
  security: 0,
  system: 0,
};

interface NotificationContextValue {
  unreadCount: number;
  /** Per-category unread counts for sidebar badges, etc. */
  unreadByCategory: CategoryCounts;
  /** Subscribe to live notifications. Returns an unsubscribe function. */
  onNotification: (cb: Listener) => () => void;
  /** Imperatively refresh unread count from the server. */
  refresh: () => Promise<void>;
  /** Mark a single notification read (also decrements the local count). */
  markRead: (id: number, category?: NotifCategory) => void;
  /** Mark all read (locally + on the server). */
  markAllRead: () => Promise<void>;
  /** Current OS-level Notification permission state. */
  osPermission: OSPermission;
  /** Prompt the user for OS notification permission (one-shot). */
  requestOSPermission: () => Promise<OSPermission>;
}

function detectOSPermission(): OSPermission {
  if (typeof window === 'undefined') return 'unsupported';
  if (typeof window.Notification === 'undefined') return 'unsupported';
  return window.Notification.permission as OSPermission;
}

const NotificationContext = React.createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [osPermission, setOSPermission] = React.useState<OSPermission>('default');
  const listenersRef = React.useRef<Set<Listener>>(new Set());

  React.useEffect(() => {
    setOSPermission(detectOSPermission());
  }, []);

  const requestOSPermission = React.useCallback(async (): Promise<OSPermission> => {
    if (typeof window === 'undefined' || typeof window.Notification === 'undefined') {
      return 'unsupported';
    }
    if (window.Notification.permission === 'granted') {
      setOSPermission('granted');
      return 'granted';
    }
    try {
      const result = await window.Notification.requestPermission();
      setOSPermission(result as OSPermission);
      return result as OSPermission;
    } catch {
      setOSPermission('denied');
      return 'denied';
    }
  }, []);

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
      const direction = payload.notification.amount?.direction;
      const desc = direction
        ? `₦${payload.notification.amount?.value} ${direction === 'in' ? 'received' : 'sent'}`
        : payload.notification.body || payload.notification.source;

      // If the user is in another tab and granted OS permission, fire a
      // native notification. Otherwise fall back to an in-app toast.
      const tabHidden =
        typeof document !== 'undefined' && document.visibilityState === 'hidden';
      if (
        tabHidden &&
        typeof window !== 'undefined' &&
        typeof window.Notification !== 'undefined' &&
        window.Notification.permission === 'granted'
      ) {
        try {
          const osNotif = new window.Notification(payload.notification.title, {
            body: desc,
            tag: `ccp-notif-${payload.notification.id}`,
            icon: '/favicon.ico',
          });
          osNotif.onclick = () => {
            window.focus();
            const href = payload.notification.action_href || '/dashboard/inbox';
            window.location.href = href;
            osNotif.close();
          };
        } catch {
          // Some browsers throw when constructed without a service worker.
          toast(payload.notification.title, { description: desc });
        }
      } else {
        toast(payload.notification.title, { description: desc });
      }
    };

    socket.on('notification_created', handleCreated);

    return () => {
      socket.off('notification_created', handleCreated);
      socket.off('connect', join);
    };
  }, [refresh]);

  const value = React.useMemo<NotificationContextValue>(
    () => ({
      unreadCount,
      onNotification,
      refresh,
      markRead,
      markAllRead,
      osPermission,
      requestOSPermission,
    }),
    [unreadCount, onNotification, refresh, markRead, markAllRead, osPermission, requestOSPermission]
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
      osPermission: 'unsupported' as const,
      requestOSPermission: async () => 'unsupported' as const,
    };
  }
  return ctx;
}
