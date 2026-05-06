/**
 * /dashboard/wallet integration tests
 * --------------------------------------------------------------------------
 * Mounts each wallet component with mocked ApiService responses and verifies:
 *   1. correct endpoints are hit with the right params,
 *   2. data flows from API → render (balance, transactions, monthly stats,
 *      spending breakdown, upcoming bills, funding source, beneficiaries).
 *   3. graceful empty states / fallbacks when the API returns nothing.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const apiMocks = {
  wallet: {
    getSummary: vi.fn(),
    getDetails: vi.fn(),
    getTransactions: vi.fn(),
    getBeneficiaries: vi.fn(),
    saveBeneficiary: vi.fn(),
    deposit: vi.fn(),
    withdraw: vi.fn(),
  },
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
  usePathname: () => '/dashboard/wallet',
  useSearchParams: () => new URLSearchParams(),
}));

async function importComponents() {
  const [statsMod, balMod, txMod, benefMod, insightsMod, upcomingMod, fundingMod] =
    await Promise.all([
      import('@/components/wallet/WalletStatsStrip'),
      import('@/components/wallet/WalletBalanceCard'),
      import('@/components/wallet/RecentTransactions'),
      import('@/components/wallet/Beneficiaries'),
      import('@/components/wallet/SpendingInsights'),
      import('@/components/wallet/UpcomingPayments'),
      import('@/components/wallet/FundingSources'),
    ]);
  return {
    WalletStatsStrip: statsMod.WalletStatsStrip,
    WalletBalanceCard: balMod.default,
    RecentTransactions: txMod.default,
    Beneficiaries: benefMod.Beneficiaries,
    SpendingInsights: insightsMod.SpendingInsights,
    UpcomingPayments: upcomingMod.default,
    FundingSources: fundingMod.FundingSources,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const fakeTx = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  reference: 'TX-1',
  type: 'payment',
  transaction_type: 'bill_payment',
  amount: 5000,
  signed_amount: -5000,
  fee: 0,
  net_amount: 5000,
  status: 'successful',
  description: 'Bill payment',
  destination_account_name: 'Trinity Co-op',
  destination_account_number: '0123456789',
  destination_bank_name: 'SafeHaven',
  community_id: 10,
  bill_id: 100,
  source_account_name: null,
  source_account_number: null,
  completed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  ...overrides,
});

const fakeBeneficiary = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  user_id: 1,
  name: 'Adaeze Mbakwe',
  account_number: '0011223344',
  account_name: 'Adaeze Mbakwe',
  bank_code: '058',
  bank_name: 'GTBank',
  nickname: null,
  is_favorite: false,
  last_used_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  apiMocks.wallet.getSummary.mockResolvedValue({
    data: { data: { wallet: { balance: 0, currency: 'NGN' } } },
  });
  apiMocks.wallet.getDetails.mockResolvedValue({
    data: { data: { id: 1, account_number: '0000000000', account_name: 'Test', bank_name: 'Bell MFB', balance: '0', currency: 'NGN', status: 'active', created_at: '' } },
  });
  apiMocks.wallet.getTransactions.mockResolvedValue({
    data: { data: { transactions: [] } },
  });
  apiMocks.wallet.getBeneficiaries.mockResolvedValue({
    data: { data: { beneficiaries: [], pagination: { total: 0, limit: 50, offset: 0, has_more: false } } },
  });
  apiMocks.wallet.saveBeneficiary.mockResolvedValue({
    data: { data: { beneficiary: fakeBeneficiary(), already_saved: false } },
  });
  apiMocks.communities.joined.mockResolvedValue({
    data: { data: { communities: [] } },
  });
  apiMocks.communities.getBills.mockResolvedValue({
    data: { data: { bills: [] } },
  });
});

afterEach(() => {
  for (const group of Object.values(apiMocks)) {
    for (const fn of Object.values(group)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
});

// ---------------------------------------------------------------------------
// WalletStatsStrip
// ---------------------------------------------------------------------------
const TEST_TIMEOUT_MS = 20_000;

describe('WalletStatsStrip', () => {
  it('hits /v2/wallet/transactions on mount', async () => {
    const { WalletStatsStrip } = await importComponents();
    render(<WalletStatsStrip />);
    await waitFor(() => {
      expect(apiMocks.wallet.getTransactions).toHaveBeenCalledWith({ limit: 200 });
    });
  }, TEST_TIMEOUT_MS);

  it('aggregates current-month income vs spend from transactions', async () => {
    // Use a fixed point a few hours in the past so it's definitely within
    // the current calendar month + the last-7-day spark window.
    const recent = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    apiMocks.wallet.getTransactions.mockResolvedValue({
      data: {
        data: {
          transactions: [
            fakeTx({ signed_amount: 50000, status: 'successful', completed_at: recent }),
            fakeTx({ signed_amount: -20000, status: 'successful', completed_at: recent, transaction_type: 'bill_payment' }),
            // outside window — should be ignored:
            fakeTx({ signed_amount: 99999, status: 'successful', completed_at: '2020-01-01T00:00:00Z' }),
          ],
        },
      },
    });
    const { WalletStatsStrip } = await importComponents();
    render(<WalletStatsStrip />);
    // "Received this month" → ₦50,000; "Spent this month" → ₦20,000.
    await waitFor(() => {
      expect(screen.getByText(/₦50,000/)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/₦20,000/).length).toBeGreaterThanOrEqual(1);
    // Verify the bills-settled card rendered alongside the others.
    expect(screen.getByText(/Bills settled/i)).toBeInTheDocument();
  }, TEST_TIMEOUT_MS);

  it('skips non-successful transactions when aggregating', async () => {
    apiMocks.wallet.getTransactions.mockResolvedValue({
      data: {
        data: {
          transactions: [
            fakeTx({
              signed_amount: 999999,
              status: 'pending',
              completed_at: new Date().toISOString(),
            }),
          ],
        },
      },
    });
    const { WalletStatsStrip } = await importComponents();
    render(<WalletStatsStrip />);
    await waitFor(() => {
      // Pending tx must NOT appear in totals.
      expect(screen.queryByText(/999,999/)).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// WalletBalanceCard
// ---------------------------------------------------------------------------
describe('WalletBalanceCard', () => {
  it('hits /v2/wallet/summary on mount', async () => {
    const { WalletBalanceCard } = await importComponents();
    render(<WalletBalanceCard onAction={vi.fn()} />);
    await waitFor(() => {
      expect(apiMocks.wallet.getSummary).toHaveBeenCalled();
    });
  });

  it('routes quick actions to the wallet flow owner', async () => {
    const onAction = vi.fn();
    const { WalletBalanceCard } = await importComponents();
    render(<WalletBalanceCard onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /Fund/i }));
    expect(onAction).toHaveBeenCalledWith('fund');
  });
});

// ---------------------------------------------------------------------------
// RecentTransactions
// ---------------------------------------------------------------------------
describe('RecentTransactions', () => {
  it('hits /v2/wallet/transactions with limit=10', async () => {
    const { RecentTransactions } = await importComponents();
    render(<RecentTransactions />);
    await waitFor(() => {
      expect(apiMocks.wallet.getTransactions).toHaveBeenCalledWith({ limit: 10 });
    });
  });
});

// ---------------------------------------------------------------------------
// Beneficiaries
// ---------------------------------------------------------------------------
describe('Beneficiaries', () => {
  it('lists saved recipients from the beneficiaries API', async () => {
    apiMocks.wallet.getBeneficiaries.mockResolvedValue({
      data: {
        data: {
          beneficiaries: [
            fakeBeneficiary(),
            fakeBeneficiary({
              id: 2,
              name: 'Trinity Co-op',
              account_number: '9999000099',
              account_name: 'Trinity Co-op',
              bank_code: '999',
              bank_name: 'SafeHaven',
            }),
          ],
          pagination: { total: 2, limit: 50, offset: 0, has_more: false },
        },
      },
    });
    const { Beneficiaries } = await importComponents();
    render(<Beneficiaries onCreate={vi.fn()} onSelect={vi.fn()} />);
    await waitFor(() => {
      expect(apiMocks.wallet.getBeneficiaries).toHaveBeenCalledWith({ limit: 50 });
      expect(screen.getByText('Adaeze Mbakwe')).toBeInTheDocument();
    });
    expect(screen.getByText('Trinity Co-op')).toBeInTheDocument();
    expect(screen.getByText(/3344/)).toBeInTheDocument();
    expect(screen.getByText(/0099/)).toBeInTheDocument();
  });

  it('renders a real empty state when there are no saved recipients', async () => {
    apiMocks.wallet.getBeneficiaries.mockResolvedValue({
      data: {
        data: {
          beneficiaries: [],
          pagination: { total: 0, limit: 50, offset: 0, has_more: false },
        },
      },
    });
    const { Beneficiaries } = await importComponents();
    render(<Beneficiaries onCreate={vi.fn()} onSelect={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('No saved recipients')).toBeInTheDocument();
    });
    expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
  });

  it('opens real flow callbacks for new and saved recipient clicks', async () => {
    const onCreate = vi.fn();
    const onSelect = vi.fn();
    apiMocks.wallet.getBeneficiaries.mockResolvedValue({
      data: {
        data: {
          beneficiaries: [fakeBeneficiary()],
          pagination: { total: 1, limit: 50, offset: 0, has_more: false },
        },
      },
    });
    const { Beneficiaries } = await importComponents();
    render(<Beneficiaries onCreate={onCreate} onSelect={onSelect} />);
    await waitFor(() => {
      expect(screen.getByText('Adaeze Mbakwe')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /Add a new recipient/i }));
    expect(onCreate).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Send to Adaeze Mbakwe/i }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        accountNumber: '0011223344',
        bankCode: '058',
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// SpendingInsights
// ---------------------------------------------------------------------------
describe('SpendingInsights', () => {
  it('groups outflows by transaction_type and renders category labels', async () => {
    const recent = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    apiMocks.wallet.getTransactions.mockResolvedValue({
      data: {
        data: {
          transactions: [
            fakeTx({ signed_amount: -5000, transaction_type: 'bill_payment', completed_at: recent }),
            fakeTx({ signed_amount: -3000, transaction_type: 'bill_payment', completed_at: recent }),
            fakeTx({ signed_amount: -2000, transaction_type: 'withdrawal', completed_at: recent }),
          ],
        },
      },
    });
    const { SpendingInsights } = await importComponents();
    render(<SpendingInsights />);
    // "Community bills" shows up twice — once in the legend, once inside the
    // "Top category" sentence. Either way is fine.
    await waitFor(() => {
      expect(screen.getAllByText('Community bills').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Withdrawals')).toBeInTheDocument();
    // Total = 10,000 (badge in header).
    expect(screen.getByText(/₦10,000/)).toBeInTheDocument();
  });

  it('renders the seed empty-state when there are no current-month outflows', async () => {
    apiMocks.wallet.getTransactions.mockResolvedValue({
      data: {
        data: {
          transactions: [
            // Old transaction outside the current-month window
            fakeTx({
              signed_amount: -5000,
              completed_at: '2020-01-01T00:00:00Z',
            }),
          ],
        },
      },
    });
    const { SpendingInsights } = await importComponents();
    render(<SpendingInsights />);
    // "No spending yet" appears in both the legend and the "Top category"
    // sentence — at least one is enough to confirm the seed renders.
    await waitFor(() => {
      expect(screen.getAllByText(/No spending yet/i).length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// UpcomingPayments
// ---------------------------------------------------------------------------
describe('UpcomingPayments', () => {
  it('aggregates open bills across joined communities, overdue first', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: {
        data: {
          communities: [{ id: 10, name: 'Lekki HOA', description: '', visibility: 'public', status: 'active', is_joined: true, member_count: 1, created_by: 1, created_at: '', organization_id: 0, institution_id: 0, member_cost: '0', slug: 'lekki' }],
        },
      },
    });
    apiMocks.communities.getBills.mockResolvedValue({
      data: {
        data: {
          bills: [
            { id: 100, title: 'Estate dues', amount: 18500, status: 'active', due_date: new Date(Date.now() - 2 * 86_400_000).toISOString() }, // overdue
            { id: 101, title: 'Marathon tickets', amount: 12500, status: 'active', due_date: new Date(Date.now() + 3 * 86_400_000).toISOString() }, // due soon
            { id: 102, title: 'Already paid', amount: 5000, status: 'paid', due_date: new Date().toISOString() }, // skip
          ],
        },
      },
    });
    const { UpcomingPayments } = await importComponents();
    render(<UpcomingPayments />);
    await waitFor(() => {
      expect(screen.getByText('Estate dues')).toBeInTheDocument();
    });
    expect(screen.getByText('Marathon tickets')).toBeInTheDocument();
    expect(screen.queryByText('Already paid')).not.toBeInTheDocument();
    // Overdue badge for the overdue bill.
    expect(screen.getByText(/2d overdue/i)).toBeInTheDocument();
  });

  it('renders empty state when no joined communities have open bills', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [] } },
    });
    const { UpcomingPayments } = await importComponents();
    render(<UpcomingPayments />);
    await waitFor(() => {
      expect(screen.getByText(/all paid up/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// FundingSources
// ---------------------------------------------------------------------------
describe('FundingSources', () => {
  it('renders the user\'s real Bell MFB virtual account from /v2/wallet', async () => {
    apiMocks.wallet.getDetails.mockResolvedValue({
      data: {
        data: {
          id: 1,
          account_number: '8888887777',
          account_name: 'Sam Tester',
          balance: '0',
          currency: 'NGN',
          status: 'active',
          created_at: '',
        },
      },
    });
    const { FundingSources } = await importComponents();
    render(<FundingSources onAdd={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByText('CCPay wallet')).toBeInTheDocument();
    });
    // Account tail (last 4) shows.
    expect(screen.getByText(/7777/)).toBeInTheDocument();
    // Primary badge present.
    expect(screen.getByText(/Primary/i)).toBeInTheDocument();
  });

  it('shows the "Verify identity" CTA when /v2/wallet returns 404', async () => {
    apiMocks.wallet.getDetails.mockRejectedValue({
      response: { status: 404 },
    });
    const { FundingSources } = await importComponents();
    render(<FundingSources onAdd={vi.fn()} />);
    await waitFor(() => {
      expect(
        screen.getByText(/Verify identity to unlock funding/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Verify/i })).toHaveAttribute(
      'href',
      '/dashboard/settings?tab=verification',
    );
  });

  it('uses the Add button to open the real fund flow', async () => {
    const onAdd = vi.fn();
    const { FundingSources } = await importComponents();
    render(<FundingSources onAdd={onAdd} />);
    await waitFor(() => {
      expect(screen.getByText('CCPay wallet')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByRole('button', { name: /Add/i }));
    expect(onAdd).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AccountDetailsModal
// ---------------------------------------------------------------------------
describe('AccountDetailsModal', () => {
  it('renders backend-provided details and copies that account number', async () => {
    const writeText = vi.fn();
    Object.assign(navigator, { clipboard: { writeText } });
    const { AccountDetailsModal } = await import('@/components/wallet/AccountDetailsModal');

    render(
      <AccountDetailsModal
        isOpen={true}
        onClose={vi.fn()}
        details={{
          account_number: '1234567890',
          account_name: 'Sam Tester',
          bank_name: 'SafeHaven MFB',
          reference: 'DEP-123',
          instructions: 'Transfer to this account.',
        }}
      />,
    );

    expect(screen.getByText('1234567890')).toBeInTheDocument();
    expect(screen.getByText('SafeHaven MFB')).toBeInTheDocument();
    expect(screen.getByText('Sam Tester')).toBeInTheDocument();
    expect(screen.getByText('DEP-123')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Copy/i }));
    expect(writeText).toHaveBeenCalledWith('1234567890');
  });
});
