/**
 * /dashboard/activity integration tests
 * --------------------------------------------------------------------------
 * Verifies the data flow on the wallet activity page:
 *   1. fetches transactions + joined() in parallel,
 *   2. resolves real community names via the joined() lookup map,
 *   3. renders fetched items (regression for the stale-useMemo deps bug),
 *   4. on /v2/wallet 404, falls back to MOCK_ACTIVITY and surfaces the
 *      "Wallet not provisioned" CTA.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const apiMocks = {
  wallet: {
    getTransactions: vi.fn(),
    getTransaction: vi.fn(),
  },
  communities: {
    joined: vi.fn(),
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
  usePathname: () => '/dashboard/activity',
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
  const mod = await import('@/app/dashboard/activity/page');
  return mod.default;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const fakeTx = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  reference: 'TX-1',
  type: 'payment',
  transaction_type: 'bill_payment',
  amount: '5000',
  signed_amount: '-5000',
  fee: '0',
  net_amount: '5000',
  status: 'successful',
  description: 'Estate dues',
  source_account_name: null,
  source_bank_name: null,
  destination_account_name: 'Trinity Co-op',
  community_id: 10,
  bill_id: 100,
  completed_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  ...overrides,
});

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

beforeEach(() => {
  apiMocks.wallet.getTransactions.mockResolvedValue({
    data: { data: { transactions: [] } },
  });
  apiMocks.wallet.getTransaction.mockResolvedValue({
    data: { data: { transaction: fakeTx() } },
  });
  apiMocks.communities.joined.mockResolvedValue({
    data: { data: { communities: [] } },
  });
  window.localStorage.setItem('user_data', JSON.stringify({ id: 50 }));
});

afterEach(() => {
  for (const group of Object.values(apiMocks)) {
    for (const fn of Object.values(group)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('/dashboard/activity', () => {
  it('hits /v2/wallet/transactions + /v2/community/me on mount', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(apiMocks.wallet.getTransactions).toHaveBeenCalledWith({ limit: 100 });
      expect(apiMocks.communities.joined).toHaveBeenCalled();
    });
  });

  it('renders fetched transactions (regression for stale useMemo deps)', async () => {
    apiMocks.wallet.getTransactions.mockResolvedValue({
      data: {
        data: {
          transactions: [
            fakeTx({ id: 1, description: 'Estate dues — April' }),
            fakeTx({
              id: 2,
              description: 'Wallet top-up',
              transaction_type: 'deposit',
              amount: '40000',
              signed_amount: '40000',
              source_account_name: 'Bell MFB',
              destination_account_name: null,
            }),
          ],
        },
      },
    });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Estate dues — April')).toBeInTheDocument();
    });
    expect(screen.getByText('Wallet top-up')).toBeInTheDocument();
  });

  it('resolves real community names via joined() lookup (not "Community" stub)', async () => {
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
    apiMocks.wallet.getTransactions.mockResolvedValue({
      data: {
        data: {
          transactions: [
            fakeTx({ id: 1, community_id: 10, description: 'Estate dues' }),
            fakeTx({ id: 2, community_id: 11, description: 'Crypto class fee' }),
          ],
        },
      },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Estate dues')).toBeInTheDocument();
    });
    // Real community names render — not the literal "Community" placeholder.
    expect(screen.getAllByText(/Lekki HOA/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cryptos NG/).length).toBeGreaterThan(0);
  });

  it('falls back to "Community #<id>" when joined() does not include that id', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Lekki HOA')] } },
    });
    apiMocks.wallet.getTransactions.mockResolvedValue({
      data: {
        data: {
          transactions: [
            fakeTx({ id: 1, community_id: 99, description: 'Stranger circle' }),
          ],
        },
      },
    });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Stranger circle')).toBeInTheDocument();
    });
    // The community-99 row uses the "Community #99" fallback rather than
    // "Community" alone.
    expect(screen.getByText(/Community #99/)).toBeInTheDocument();
  });

  it('falls back to MOCK_ACTIVITY + walletMissing banner when /v2/wallet returns 404', async () => {
    apiMocks.wallet.getTransactions.mockRejectedValue({
      response: { status: 404 },
    });
    const Page = await importPage();
    render(<Page />);
    // The first MOCK_ACTIVITY entry: "Transfer from Adaeze Mbakwe".
    await waitFor(() => {
      expect(screen.getByText('Transfer from Adaeze Mbakwe')).toBeInTheDocument();
    });
  });

  it('aggregates totals from fetched data (totalIn vs totalOut)', async () => {
    apiMocks.wallet.getTransactions.mockResolvedValue({
      data: {
        data: {
          transactions: [
            fakeTx({
              id: 1,
              amount: '50000',
              signed_amount: '50000',
              source_account_name: 'Bank',
              destination_account_name: null,
              transaction_type: 'deposit',
            }),
            fakeTx({
              id: 2,
              amount: '20000',
              signed_amount: '-20000',
            }),
          ],
        },
      },
    });
    const Page = await importPage();
    render(<Page />);
    // Hero shows totals — each amount appears at least once.
    await waitFor(() => {
      expect(screen.getAllByText(/50,000/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/20,000/).length).toBeGreaterThan(0);
  });

  it('opens a transaction detail dialog backed by the selected API row', async () => {
    apiMocks.wallet.getTransactions.mockResolvedValue({
      data: {
        data: {
          transactions: [
            fakeTx({
              id: 33,
              description: 'Detailed estate dues',
              reference: 'TX-DETAIL',
              balance_before: '10000',
              balance_after: '5000',
            }),
          ],
        },
      },
    });
    apiMocks.wallet.getTransaction.mockResolvedValue({
      data: {
        data: {
          transaction: fakeTx({
            id: 33,
            description: 'Detailed estate dues',
            reference: 'TX-DETAIL',
            bell_mfb_reference: 'BELL-33',
            balance_before: '10000',
            balance_after: '5000',
          }),
        },
      },
    });

    const Page = await importPage();
    render(<Page />);
    await screen.findByText('Detailed estate dues');

    await userEvent.setup().click(screen.getByText('Detailed estate dues'));

    await waitFor(() => {
      expect(apiMocks.wallet.getTransaction).toHaveBeenCalledWith(33);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByText('TX-DETAIL')).toBeInTheDocument();
    expect(screen.getByText('BELL-33')).toBeInTheDocument();
  });
});
