/**
 * SubscriptionsContent integration tests
 * --------------------------------------------------------------------------
 *   1. fetches /v2/subscriptions on mount,
 *   2. renders real subscriptions split into active/inactive,
 *   3. pause toggles status via /v2/subscriptions/<id> PATCH,
 *   4. cancel hits PATCH with status=cancelled.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const apiMocks = {
  subscriptions: {
    list: vi.fn(),
    setStatus: vi.fn(),
  },
};

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

const fakeSub = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  user_id: 50,
  kind: 'subscription',
  name: 'Yalleman',
  description: 'Membership',
  amount: 120,
  currency: 'NGN',
  cadence: 'monthly',
  next_charge_at: null,
  last_charged_at: null,
  status: 'active',
  counterparty_type: null,
  counterparty_id: null,
  source_bill_id: null,
  destination_account_number: null,
  destination_bank_code: null,
  destination_account_name: null,
  pin_required: false,
  created_at: null,
  updated_at: null,
  ...overrides,
});

beforeEach(() => {
  apiMocks.subscriptions.list.mockResolvedValue({
    data: { data: { subscriptions: [], total: 0 } },
  });
  apiMocks.subscriptions.setStatus.mockImplementation((id: number, status: string) =>
    Promise.resolve({
      data: { data: { subscription: fakeSub({ id, status }) } },
    }),
  );
});

afterEach(() => {
  Object.values(apiMocks.subscriptions).forEach((fn) =>
    (fn as ReturnType<typeof vi.fn>).mockReset(),
  );
});

async function importComp() {
  const mod = await import('@/components/settings/SubscriptionsContent');
  return mod.SubscriptionsContent;
}

describe('SubscriptionsContent', () => {
  it('fetches /v2/subscriptions on mount', async () => {
    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(apiMocks.subscriptions.list).toHaveBeenCalled();
    });
  });

  it('renders real subscriptions in the active tab', async () => {
    apiMocks.subscriptions.list.mockResolvedValue({
      data: {
        data: {
          subscriptions: [
            fakeSub({ id: 11, name: 'Estate dues', amount: 18500 }),
            fakeSub({ id: 12, name: 'Pro tier', amount: 4500, cadence: 'quarterly' }),
          ],
        },
      },
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText('Estate dues')).toBeInTheDocument();
    });
    expect(screen.getByText('Pro tier')).toBeInTheDocument();
  });

  it('clicking pause hits PATCH with status=paused', async () => {
    apiMocks.subscriptions.list.mockResolvedValue({
      data: { data: { subscriptions: [fakeSub({ id: 42 })] } },
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText('Yalleman')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Pause Yalleman/i }));

    await waitFor(() => {
      expect(apiMocks.subscriptions.setStatus).toHaveBeenCalledWith(42, 'paused');
    });
  });

  it('clicking cancel hits PATCH with status=cancelled', async () => {
    apiMocks.subscriptions.list.mockResolvedValue({
      data: { data: { subscriptions: [fakeSub({ id: 42 })] } },
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText('Yalleman')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Cancel Yalleman/i }));

    await waitFor(() => {
      expect(apiMocks.subscriptions.setStatus).toHaveBeenCalledWith(42, 'cancelled');
    });
  });
});
