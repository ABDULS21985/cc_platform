import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = {
  communities: {
    getBills: vi.fn(),
    getBill: vi.fn(),
    createBill: vi.fn(),
    payBill: vi.fn(),
  },
};

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

vi.mock('@/hooks/useAxiosError', () => ({
  toastAxiosError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const fakeBill = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  community_id: 10,
  creator_id: 99,
  title: 'Roof campaign',
  description: 'Fix the roof',
  amount: 100000,
  collected_amount: 25000,
  type: 'free_will',
  min_amount: 0,
  status: 'active',
  is_recurring: false,
  recurrence_type: null,
  due_date: '2030-01-31T23:59:59Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  paid_member_count: 2,
  expected_member_count: 5,
  progress_percentage: 40,
  ...overrides,
});

async function importComponent() {
  const mod = await import('@/components/community/ExpensesTab');
  return mod.ExpensesTab;
}

beforeEach(() => {
  apiMocks.communities.getBills.mockResolvedValue({
    data: {
      data: {
        bills: [
          fakeBill(),
          fakeBill({ id: 2, title: 'Rent split', type: 'fixed' }),
        ],
      },
    },
  });
  apiMocks.communities.getBill.mockImplementation((_communityId: number, billId: number) =>
    Promise.resolve({
      data: {
        data: fakeBill({
          id: billId,
          member_payment_statuses: [],
          recent_transactions: [],
        }),
      },
    }),
  );
  apiMocks.communities.createBill.mockResolvedValue({ data: { data: fakeBill({ id: 3 }) } });
});

describe('ExpensesTab', () => {
  it('fetches bills and renders campaigns/split payments from backend data', async () => {
    const ExpensesTab = await importComponent();
    render(<ExpensesTab communityId={10} communityName="Estate Circle" />);

    await waitFor(() => expect(apiMocks.communities.getBills).toHaveBeenCalledWith(10, {
      limit: 200,
      offset: 0,
    }));

    expect(await screen.findByText('Roof campaign')).toBeInTheDocument();
    expect(screen.queryByText('End of the year party')).not.toBeInTheDocument();
    expect(screen.queryByText('Rent split')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Split payment/i }));
    expect(await screen.findByText('Rent split')).toBeInTheDocument();
  });

  it('creates campaigns through the community bills API as free-will bills', async () => {
    const ExpensesTab = await importComponent();
    const user = userEvent.setup();
    render(<ExpensesTab communityId={10} communityName="Estate Circle" />);

    await screen.findByText('Roof campaign');
    await user.click(screen.getByRole('button', { name: /^Create campaign$/i }));
    await user.type(screen.getByPlaceholderText('Enter your campaign title'), 'Generator fund');
    await user.type(screen.getByPlaceholderText('Enter target amount'), '50000');
    await user.type(screen.getByPlaceholderText('Enter a short description'), 'Buy generator');
    const dateInput = document.querySelector('input[type="date"]');
    expect(dateInput).not.toBeNull();
    await user.type(dateInput as HTMLInputElement, '2030-02-01');

    await user.click(screen.getByRole('button', { name: /Create Campaign/i }));

    await waitFor(() => {
      expect(apiMocks.communities.createBill).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          title: 'Generator fund',
          description: 'Buy generator',
          amount: 50000,
          type: 'free_will',
        }),
      );
    });
  });
});
