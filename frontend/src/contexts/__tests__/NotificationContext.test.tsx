import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { NotificationProvider, useNotifications } from '../NotificationContext';
import type { NotificationApi } from '@/services/api';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
type SocketHandler = (...args: unknown[]) => void;

const socketHandlers = new Map<string, SocketHandler>();
const fakeSocket = {
  connected: true,
  emit: vi.fn(),
  on: vi.fn((evt: string, cb: SocketHandler) => {
    socketHandlers.set(evt, cb);
  }),
  off: vi.fn((evt: string) => {
    socketHandlers.delete(evt);
  }),
  once: vi.fn(),
};

vi.mock('@/lib/socket', () => ({
  getSocket: () => fakeSocket,
}));

const mockUnreadByCategory = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();

vi.mock('@/services/api', () => ({
  ApiService: {
    notifications: {
      unreadByCategory: () => mockUnreadByCategory(),
      markRead: (id: number) => mockMarkRead(id),
      markAllRead: () => mockMarkAllRead(),
    },
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function Probe() {
  const { unreadCount, unreadByCategory, markRead, markAllRead, osPermission } =
    useNotifications();
  return (
    <div>
      <span data-testid="total">{unreadCount}</span>
      <span data-testid="bills">{unreadByCategory.bills}</span>
      <span data-testid="money">{unreadByCategory.money}</span>
      <span data-testid="permission">{osPermission}</span>
      <button onClick={() => markRead(1, 'bills')}>mark-1-bills</button>
      <button onClick={() => void markAllRead()}>mark-all</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <NotificationProvider>
      <Probe />
    </NotificationProvider>,
  );
}

const fakeNotif = (overrides: Partial<NotificationApi> = {}): NotificationApi => ({
  id: 99,
  user_id: 1,
  community_id: null,
  category: 'bills',
  title: 'New bill',
  body: 'Test body',
  source: 'Lekki HOA',
  action_href: null,
  action_label: null,
  amount: null,
  initials: null,
  is_read: false,
  read_at: null,
  timestamp: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: null,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  socketHandlers.clear();
  mockUnreadByCategory.mockResolvedValue({
    data: {
      data: {
        unread_by_category: {
          money: 2,
          bills: 5,
          communities: 0,
          events: 0,
          security: 1,
          system: 0,
        },
        total: 8,
      },
    },
  });
  mockMarkRead.mockResolvedValue({});
  mockMarkAllRead.mockResolvedValue({});
  // Provide a token so the provider engages; it's read at mount time.
  window.localStorage.setItem('access_token', 'fake-token');
});

describe('NotificationProvider', () => {
  it('hydrates total + per-category counts on mount', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('total').textContent).toBe('8');
    });
    expect(screen.getByTestId('bills').textContent).toBe('5');
    expect(screen.getByTestId('money').textContent).toBe('2');
  });

  it('subscribes to the notifications socket room on mount', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(fakeSocket.emit).toHaveBeenCalledWith('join_notifications');
    });
  });

  it('decrements both total and the right category bucket on markRead', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('total').textContent).toBe('8'),
    );

    await user.click(screen.getByText('mark-1-bills'));

    expect(screen.getByTestId('total').textContent).toBe('7');
    expect(screen.getByTestId('bills').textContent).toBe('4');
    // Other buckets untouched.
    expect(screen.getByTestId('money').textContent).toBe('2');
    expect(mockMarkRead).toHaveBeenCalledWith(1);
  });

  it('zeros out everything on markAllRead', async () => {
    const user = userEvent.setup();
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('total').textContent).toBe('8'),
    );

    await user.click(screen.getByText('mark-all'));

    expect(screen.getByTestId('total').textContent).toBe('0');
    expect(screen.getByTestId('bills').textContent).toBe('0');
    expect(screen.getByTestId('money').textContent).toBe('0');
    expect(mockMarkAllRead).toHaveBeenCalledOnce();
  });

  it('bumps the right bucket when a live socket notification arrives', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('total').textContent).toBe('8'),
    );

    act(() => {
      const handler = socketHandlers.get('notification_created');
      handler?.({
        notification: fakeNotif({ category: 'money', is_read: false }),
        unread_count: 9,
      });
    });

    expect(screen.getByTestId('total').textContent).toBe('9');
    expect(screen.getByTestId('money').textContent).toBe('3');
    // bills untouched by a money push.
    expect(screen.getByTestId('bills').textContent).toBe('5');
  });

  it('does not bump category bucket when arriving notification is already read', async () => {
    renderWithProvider();
    await waitFor(() =>
      expect(screen.getByTestId('total').textContent).toBe('8'),
    );

    act(() => {
      socketHandlers.get('notification_created')?.({
        notification: fakeNotif({ category: 'bills', is_read: true }),
        unread_count: 8,
      });
    });

    // Bucket stays at 5 since the new item is already read.
    expect(screen.getByTestId('bills').textContent).toBe('5');
  });

  it('exposes "unsupported" when the browser has no Notification API', async () => {
    // jsdom default — no window.Notification.
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('permission').textContent).toBe('unsupported');
    });
  });
});
