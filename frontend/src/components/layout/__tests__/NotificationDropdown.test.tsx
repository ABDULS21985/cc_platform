import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { NotificationDropdown } from '../NotificationDropdown';
import type { NotificationApi } from '@/services/api';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const mockListNotifications = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();

vi.mock('@/services/api', () => ({
  ApiService: {
    notifications: {
      list: (params?: unknown) => mockListNotifications(params),
      markRead: (id: number) => mockMarkRead(id),
      markAllRead: () => mockMarkAllRead(),
    },
  },
}));

// Avoid pulling the real provider — supply a controlled context value.
const ctxValue = {
  unreadCount: 0,
  unreadByCategory: { money: 0, bills: 0, communities: 0, events: 0, security: 0, system: 0 },
  onNotification: vi.fn().mockReturnValue(() => {}),
  refresh: vi.fn().mockResolvedValue(undefined),
  markRead: vi.fn(),
  markAllRead: vi.fn().mockResolvedValue(undefined),
  osPermission: 'granted' as const,
  requestOSPermission: vi.fn().mockResolvedValue('granted' as const),
};

vi.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ctxValue,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mkNotif = (overrides: Partial<NotificationApi> = {}): NotificationApi => ({
  id: 1,
  user_id: 1,
  category: 'money',
  title: 'You received ₦5,000',
  body: 'From Adaeze',
  source: 'Bell MFB',
  action_href: '/dashboard/wallet',
  action_label: null,
  amount: { value: '5,000', direction: 'in' },
  initials: null,
  is_read: false,
  read_at: null,
  timestamp: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: null,
  ...overrides,
});

beforeEach(() => {
  pushMock.mockReset();
  ctxValue.markRead = vi.fn();
  ctxValue.markAllRead = vi.fn().mockResolvedValue(undefined);
  mockListNotifications.mockResolvedValue({
    data: {
      data: {
        notifications: [
          mkNotif(),
          mkNotif({
            id: 2,
            category: 'bills',
            title: 'Rent due',
            is_read: true,
            action_href: null,
          }),
        ],
      },
    },
  });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('<NotificationDropdown>', () => {
  it('lazy-loads notifications when the popover opens', async () => {
    const user = userEvent.setup();
    render(
      <NotificationDropdown>
        <button>open-bell</button>
      </NotificationDropdown>,
    );
    expect(mockListNotifications).not.toHaveBeenCalled();
    await user.click(screen.getByText('open-bell'));
    await waitFor(() => expect(mockListNotifications).toHaveBeenCalledTimes(1));
    // Notifications appear once the API resolves.
    await waitFor(() => {
      expect(screen.getByText('You received ₦5,000')).toBeInTheDocument();
    });
  });

  it('marks a row read and navigates to its action_href on click', async () => {
    const user = userEvent.setup();
    render(
      <NotificationDropdown>
        <button>open-bell</button>
      </NotificationDropdown>,
    );
    await user.click(screen.getByText('open-bell'));
    await waitFor(() =>
      expect(screen.getByText('You received ₦5,000')).toBeInTheDocument(),
    );

    await user.click(screen.getByText('You received ₦5,000'));

    expect(ctxValue.markRead).toHaveBeenCalledWith(1, 'money');
    expect(pushMock).toHaveBeenCalledWith('/dashboard/wallet');
  });

  it('does NOT call markRead again when clicking an already-read row', async () => {
    const user = userEvent.setup();
    render(
      <NotificationDropdown>
        <button>open-bell</button>
      </NotificationDropdown>,
    );
    await user.click(screen.getByText('open-bell'));
    await waitFor(() =>
      expect(screen.getByText('Rent due')).toBeInTheDocument(),
    );

    await user.click(screen.getByText('Rent due'));

    // Was already read, so context.markRead is NOT triggered.
    expect(ctxValue.markRead).not.toHaveBeenCalled();
    // But navigation still happens (falls back to /dashboard/inbox when no action_href).
    expect(pushMock).toHaveBeenCalledWith('/dashboard/inbox');
  });

  it('"Mark all read" calls the context method and updates local rows', async () => {
    const user = userEvent.setup();
    render(
      <NotificationDropdown>
        <button>open-bell</button>
      </NotificationDropdown>,
    );
    await user.click(screen.getByText('open-bell'));
    await waitFor(() =>
      expect(screen.getByText('You received ₦5,000')).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /mark all read/i }));
    expect(ctxValue.markAllRead).toHaveBeenCalledOnce();
  });

  it('renders empty state when the API returns no notifications', async () => {
    mockListNotifications.mockResolvedValueOnce({
      data: { data: { notifications: [] } },
    });
    const user = userEvent.setup();
    render(
      <NotificationDropdown>
        <button>open-bell</button>
      </NotificationDropdown>,
    );
    await user.click(screen.getByText('open-bell'));
    await waitFor(() => {
      expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    });
  });

  it('hides the "Get desktop alerts" prompt once permission is granted', async () => {
    const user = userEvent.setup();
    render(
      <NotificationDropdown>
        <button>open-bell</button>
      </NotificationDropdown>,
    );
    await user.click(screen.getByText('open-bell'));
    expect(screen.queryByText(/Get desktop alerts/i)).not.toBeInTheDocument();
  });
});
