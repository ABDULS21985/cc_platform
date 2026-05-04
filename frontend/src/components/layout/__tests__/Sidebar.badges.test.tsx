import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import { Sidebar } from '../Sidebar';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/image', () => ({
  default: () => null,
}));

const ctxValue = {
  unreadCount: 12,
  unreadByCategory: { money: 3, bills: 7, communities: 0, events: 0, security: 0, system: 2 },
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
// Tests
// ---------------------------------------------------------------------------
function renderSidebar() {
  return render(
    <Sidebar
      isOpen={true}
      onToggle={() => {}}
      onCloseMobile={() => {}}
      user={{ firstname: 'Sam', full_name: 'Sam Tester' }}
      onLogout={() => {}}
    />,
  );
}

describe('<Sidebar> live unread badges', () => {
  it('renders the total unread count next to Inbox', () => {
    renderSidebar();
    const inboxLink = screen.getByRole('link', { name: /Inbox/i });
    expect(within(inboxLink).getByText('12')).toBeInTheDocument();
  });

  it('renders the bills bucket count next to Bills', () => {
    renderSidebar();
    const billsLink = screen.getByRole('link', { name: /Bills/i });
    expect(within(billsLink).getByText('7')).toBeInTheDocument();
  });

  it('renders the money bucket count next to Wallet', () => {
    renderSidebar();
    const walletLink = screen.getByRole('link', { name: /Wallet/i });
    expect(within(walletLink).getByText('3')).toBeInTheDocument();
  });

  it('does not render a badge when the bucket is zero (Communities)', () => {
    renderSidebar();
    const link = screen.getByRole('link', { name: /^Communities$/i });
    // Buckets at 0 should produce no visible number.
    expect(within(link).queryByText('0')).not.toBeInTheDocument();
  });

  it('caps display at 99+ when the bucket exceeds 99', () => {
    ctxValue.unreadCount = 250;
    renderSidebar();
    const inboxLink = screen.getByRole('link', { name: /Inbox/i });
    expect(within(inboxLink).getByText('99+')).toBeInTheDocument();
    // restore for other tests
    ctxValue.unreadCount = 12;
  });
});
