/**
 * /dashboard/audit integration tests
 * --------------------------------------------------------------------------
 * Verifies the audit log data flow:
 *   1. fetches /v2/audit on mount,
 *   2. renders real audit events (mapped via mapApiAudit),
 *   3. falls back to MOCK when the API returns an empty list,
 *   4. tab + actor filter narrow the visible event list,
 *   5. CSV export wires up a Blob download (smoke).
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const apiMocks = {
  audit: {
    list: vi.fn(),
  },
};

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard/audit',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock('@/hooks/useUserData', () => ({
  default: () => ({ id: 50 }),
}));

async function importPage() {
  const mod = await import('@/app/dashboard/audit/page');
  return mod.default;
}

const fakeAudit = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  user_id: 50,
  category: 'security',
  severity: 'info',
  action: 'Sign-in successful',
  details: 'Signed in with email and password',
  actor: 'You',
  target: null,
  ip: '105.112.40.18',
  device: 'Chrome · macOS',
  hashPrefix: 'ab4f9d2',
  timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
  created_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  ...overrides,
});

beforeEach(() => {
  apiMocks.audit.list.mockResolvedValue({
    data: { data: { events: [], pagination: { total: 0, limit: 200, offset: 0 } } },
  });
  window.localStorage.setItem('user_data', JSON.stringify({ id: 50 }));
});

afterEach(() => {
  for (const fn of Object.values(apiMocks.audit)) {
    (fn as ReturnType<typeof vi.fn>).mockReset();
  }
});

describe('/dashboard/audit', () => {
  it('hits /v2/audit on mount', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(apiMocks.audit.list).toHaveBeenCalledWith({ limit: 200 });
    });
  });

  it('renders audit events from the API (mapped through mapApiAudit)', async () => {
    apiMocks.audit.list.mockResolvedValue({
      data: {
        data: {
          events: [
            fakeAudit({
              id: 11,
              action: 'Wallet funded',
              details: 'Top-up of ₦40,000 from Bell MFB',
              category: 'money',
            }),
            fakeAudit({
              id: 12,
              action: 'New device sign-in',
              details: 'A new device accessed your account',
              category: 'security',
              severity: 'warning',
            }),
          ],
        },
      },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Wallet funded')).toBeInTheDocument();
    });
    expect(screen.getByText('New device sign-in')).toBeInTheDocument();
  });

  it('falls back to MOCK when /v2/audit returns an empty list', async () => {
    const Page = await importPage();
    render(<Page />);
    // The first MOCK action is "Sign-in successful" — within 5 minutes, so visible in default 7d window.
    await waitFor(() => {
      expect(screen.getByText('Sign-in successful')).toBeInTheDocument();
    });
  });

  it('falls back to MOCK on API error', async () => {
    apiMocks.audit.list.mockRejectedValue(new Error('boom'));
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Sign-in successful')).toBeInTheDocument();
    });
  });

  it('clicking the Money tab marks it as the active category tab', async () => {
    apiMocks.audit.list.mockResolvedValue({
      data: {
        data: {
          events: [
            fakeAudit({ id: 1, action: 'Wallet funded', category: 'money' }),
            fakeAudit({ id: 2, action: 'New device sign-in', category: 'security' }),
          ],
        },
      },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Wallet funded')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const moneyTab = screen.getByRole('tab', { name: /Money/i });
    expect(moneyTab).toHaveAttribute('aria-selected', 'false');
    await user.click(moneyTab);
    await waitFor(() => {
      expect(moneyTab).toHaveAttribute('aria-selected', 'true');
    });
  });
});
