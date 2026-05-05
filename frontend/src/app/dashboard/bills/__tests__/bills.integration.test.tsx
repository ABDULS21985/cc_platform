/**
 * /dashboard/bills integration tests
 * --------------------------------------------------------------------------
 * Mounts the page with mocked ApiService responses and verifies:
 *   1. joined() → getBills() fan-out aggregates the right way,
 *   2. real creator name flows through (no "User #N" placeholder),
 *   3. clicking "Pay" on a card opens the PIN modal AND the modal's confirm
 *      callback hits ApiService.communities.payBill with the right shape,
 *   4. "Settle all" hits the same payBill endpoint once per outstanding bill,
 *   5. when the page falls back to mock data (no joined communities), Pay
 *      stays in optimistic-UI mode and never touches the API.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const apiMocks = {
  communities: {
    joined: vi.fn(),
    getBills: vi.fn(),
    payBill: vi.fn(),
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
  usePathname: () => '/dashboard/bills',
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
  const mod = await import('@/app/dashboard/bills/page');
  return mod.default;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
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
  creator: {
    id: 99,
    firstname: 'Adaeze',
    lastname: 'Mbakwe',
    full_name: 'Adaeze Mbakwe',
    profile_photo: null,
  },
  title: 'Estate dues',
  description: 'Monthly maintenance',
  amount: 18500,
  type: 'fixed',
  status: 'active',
  is_recurring: false,
  recurrence_type: null,
  due_date: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  collected_amount: 0,
  paid_member_count: 0,
  expected_member_count: 4,
  progress_percentage: 0,
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
  apiMocks.communities.payBill.mockResolvedValue({
    data: { data: { transaction_id: 1, reference: 'TX-1' } },
  });
  window.localStorage.setItem('user_data', JSON.stringify({ id: 50 }));
});

afterEach(() => {
  for (const fn of Object.values(apiMocks.communities)) {
    (fn as ReturnType<typeof vi.fn>).mockReset();
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('/dashboard/bills', () => {
  it('walks joined() → getBills(id) per community on mount', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: {
        data: {
          communities: [fakeCommunity(10, 'Lekki HOA'), fakeCommunity(11, 'Cryptos NG')],
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

  it('uses bill.creator.full_name (not "User #N" fallback) when API supplies it', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Lekki HOA')] } },
    });
    apiMocks.communities.getBills.mockResolvedValue({
      data: {
        data: {
          bills: [fakeBill({ creator: { id: 99, full_name: 'Adaeze Mbakwe', firstname: 'Adaeze', lastname: 'Mbakwe', profile_photo: null } })],
        },
      },
    });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Estate dues')).toBeInTheDocument();
    });
    // The card surfaces the inlined creator name, not a "User #N" stub.
    expect(screen.getAllByText(/Adaeze Mbakwe/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/User #99/)).not.toBeInTheDocument();
  });

  it('falls back to "User #N" when the API omits the creator object', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Lekki HOA')] } },
    });
    apiMocks.communities.getBills.mockResolvedValue({
      data: {
        data: {
          bills: [fakeBill({ creator: undefined })],
        },
      },
    });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Estate dues')).toBeInTheDocument();
    });
    expect(screen.getAllByText(/User #99/).length).toBeGreaterThan(0);
  });

  it('clicking Pay opens the PIN modal and a 4-digit PIN dispatches payBill with the right shape', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Lekki HOA')] } },
    });
    apiMocks.communities.getBills.mockResolvedValue({
      data: { data: { bills: [fakeBill({ id: 100, amount: 18500 })] } },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Estate dues')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const payBtn = screen.getByRole('button', { name: /Pay now/i });
    await user.click(payBtn);

    // PIN modal opens
    const pinInput = await screen.findByPlaceholderText(/Enter transaction pin/i);
    await user.type(pinInput, '1234');
    // The modal's confirm button is labeled just "Pay" (not "Pay now").
    await user.click(screen.getByRole('button', { name: /^Pay$/ }));

    await waitFor(() => {
      expect(apiMocks.communities.payBill).toHaveBeenCalledTimes(1);
    });
    const [communityId, billId, payload] = apiMocks.communities.payBill.mock.calls[0];
    expect(communityId).toBe(10);
    expect(billId).toBe(100);
    expect(payload).toEqual(
      expect.objectContaining({
        amount: 18500,
        payment_method: 'wallet',
        pin: '1234',
      }),
    );
  });

  it('"Settle all" calls payBill once per outstanding bill', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Lekki HOA')] } },
    });
    apiMocks.communities.getBills.mockResolvedValue({
      data: {
        data: {
          bills: [
            fakeBill({ id: 100, amount: 5000 }),
            fakeBill({ id: 101, amount: 8000, due_date: new Date(Date.now() - 86_400_000).toISOString() }), // overdue
            fakeBill({ id: 102, amount: 3000, status: 'paid' }), // already paid — should be excluded
          ],
        },
      },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getAllByText(/Estate dues/).length).toBeGreaterThan(0);
    });

    const user = userEvent.setup();
    // The hero's "Settle all" button.
    const settleAllButtons = screen.getAllByRole('button', { name: /Settle all/i });
    await user.click(settleAllButtons[0]);

    const pinInput = await screen.findByPlaceholderText(/Enter transaction pin/i);
    await user.type(pinInput, '1234');
    // After the modal opens, the modal's confirm button is also "Settle all".
    const allSettle = screen.getAllByRole('button', { name: /Settle all/i });
    // Click the last one (the modal's), not the hero button.
    await user.click(allSettle[allSettle.length - 1]);

    // payBill called for the 2 outstanding bills, NOT the paid one.
    await waitFor(() => {
      expect(apiMocks.communities.payBill).toHaveBeenCalledTimes(2);
    });
    const billIds = apiMocks.communities.payBill.mock.calls.map((c) => c[1]);
    expect(billIds).toEqual(expect.arrayContaining([100, 101]));
    expect(billIds).not.toContain(102);
  });

  it('staying on mock fallback (no joined communities) keeps Pay in optimistic mode', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [] } },
    });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /Pay now/i }).length).toBeGreaterThan(0);
    });

    const user = userEvent.setup();
    await user.click(screen.getAllByRole('button', { name: /Pay now/i })[0]);
    // Mock-mode skips the PIN modal, so payBill never fires.
    expect(apiMocks.communities.payBill).not.toHaveBeenCalled();
  });
});
