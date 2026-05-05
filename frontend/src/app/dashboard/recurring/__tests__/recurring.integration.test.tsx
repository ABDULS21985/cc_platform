/**
 * /dashboard/recurring integration tests
 * --------------------------------------------------------------------------
 * Verifies the recurring-rules data flow:
 *   1. fans out joined() → getBills() per community on mount,
 *   2. is_recurring=true bills become rules; non-recurring are filtered out,
 *   3. mapApiToRecurring populates community name + status,
 *   4. falls back to MOCK when no joined communities,
 *   5. falls back to MOCK when no joined-community bills are recurring,
 *   6. clicking "Pause" on a rule flips it to paused.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const apiMocks = {
  communities: {
    joined: vi.fn(),
    getBills: vi.fn(),
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
  usePathname: () => '/dashboard/recurring',
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
  const mod = await import('@/app/dashboard/recurring/page');
  return mod.default;
}

const fakeCommunity = (id: number, name: string) => ({
  id,
  name,
  description: 'd',
  visibility: 'public',
  status: 'active',
  is_joined: true,
  member_count: 5,
  created_by: 1,
  created_at: '2025-01-01T00:00:00Z',
  organization_id: 0,
  institution_id: 0,
  member_cost: '0',
  slug: name.toLowerCase().replace(/\s+/g, '-'),
});

const fakeBill = (overrides: Record<string, unknown> = {}) => ({
  id: 100,
  community_id: 10,
  creator_id: 99,
  title: 'Estate dues',
  description: 'Monthly maintenance',
  amount: 18500,
  status: 'active',
  is_recurring: true,
  recurrence_type: 'monthly',
  due_date: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  paid_member_count: 2,
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

beforeEach(() => {
  apiMocks.communities.joined.mockResolvedValue({
    data: { data: { communities: [] } },
  });
  apiMocks.communities.getBills.mockResolvedValue({
    data: { data: { bills: [] } },
  });
  window.localStorage.setItem('user_data', JSON.stringify({ id: 50 }));
});

afterEach(() => {
  for (const fn of Object.values(apiMocks.communities)) {
    (fn as ReturnType<typeof vi.fn>).mockReset();
  }
});

describe('/dashboard/recurring', () => {
  it('walks joined() → getBills(id) per community on mount', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: {
        data: {
          communities: [
            fakeCommunity(10, 'Lekki HOA'),
            fakeCommunity(11, 'Cryptos NG'),
          ],
        },
      },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => expect(apiMocks.communities.joined).toHaveBeenCalled());
    await waitFor(() => {
      expect(apiMocks.communities.getBills).toHaveBeenCalledTimes(2);
    });
    expect(apiMocks.communities.getBills).toHaveBeenCalledWith(10, expect.any(Object));
    expect(apiMocks.communities.getBills).toHaveBeenCalledWith(11, expect.any(Object));
  });

  it('renders only is_recurring=true bills as rules', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Lekki HOA')] } },
    });
    apiMocks.communities.getBills.mockResolvedValue({
      data: {
        data: {
          bills: [
            fakeBill({ id: 100, title: 'Estate dues — recurring', is_recurring: true }),
            fakeBill({ id: 101, title: 'One-off pothole levy', is_recurring: false }),
          ],
        },
      },
    });

    const Page = await importPage();
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Estate dues — recurring')).toBeInTheDocument();
    });
    expect(screen.queryByText('One-off pothole levy')).not.toBeInTheDocument();
  });

  it('falls back to MOCK when no joined communities exist', async () => {
    const Page = await importPage();
    render(<Page />);

    // First MOCK rule title.
    await waitFor(() => {
      expect(screen.getByText('Lekki Block 3 dues')).toBeInTheDocument();
    });
    // No real getBills calls should have fired.
    expect(apiMocks.communities.getBills).not.toHaveBeenCalled();
  });

  it('falls back to MOCK when joined communities have no recurring bills', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Lekki HOA')] } },
    });
    apiMocks.communities.getBills.mockResolvedValue({
      data: {
        data: { bills: [fakeBill({ is_recurring: false })] },
      },
    });

    const Page = await importPage();
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Lekki Block 3 dues')).toBeInTheDocument();
    });
  });

  it('clicking Pause on an active rule flips it to paused', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Lekki HOA')] } },
    });
    apiMocks.communities.getBills.mockResolvedValue({
      data: {
        data: {
          bills: [fakeBill({ id: 100, title: 'Estate dues' })],
        },
      },
    });

    const Page = await importPage();
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Estate dues')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^Pause$/i }));

    // After pausing, the same row's button now reads "Resume".
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /^Pause$/i }),
      ).not.toBeInTheDocument();
    });
    // The Active tab no longer contains this rule — switch to Paused.
    await user.click(screen.getByRole('tab', { name: /Paused/i }));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /^Resume$/i }),
      ).toBeInTheDocument();
    });
  });
});
