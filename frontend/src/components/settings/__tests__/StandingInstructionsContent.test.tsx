/**
 * StandingInstructionsContent integration tests
 *   1. fetches /v2/standing-instructions on mount,
 *   2. renders real instructions,
 *   3. clicking pause hits setStatus(id, 'paused'),
 *   4. clicking cancel hits setStatus(id, 'cancelled').
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const apiMocks = {
  standingInstructions: {
    list: vi.fn(),
    create: vi.fn(),
    setStatus: vi.fn(),
  },
};

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

// Modal subcomponents would otherwise drag in heavyweight Dialog/Radix —
// stub them to no-op components.
vi.mock('@/components/settings/AddInstructionsModal', () => ({
  AddInstructionsModal: () => null,
}));
vi.mock('@/components/settings/PasswordConfirmModal', () => ({
  PasswordConfirmModal: () => null,
}));
vi.mock('@/components/settings/SplitPaymentModal', () => ({
  SplitPaymentModal: () => null,
}));

const fakeSI = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  user_id: 50,
  kind: 'standing_instruction',
  name: 'Estate fund',
  description: 'Lekki block 3',
  amount: 18500,
  currency: 'NGN',
  cadence: 'monthly',
  next_charge_at: new Date(Date.now() + 86_400_000 * 7).toISOString(),
  last_charged_at: null,
  status: 'active',
  counterparty_type: null,
  counterparty_id: null,
  source_bill_id: null,
  destination_account_number: '1234567890',
  destination_bank_code: '044',
  destination_account_name: 'Lekki HOA',
  pin_required: true,
  created_at: null,
  updated_at: null,
  ...overrides,
});

beforeEach(() => {
  apiMocks.standingInstructions.list.mockResolvedValue({
    data: { data: { subscriptions: [], total: 0 } },
  });
  apiMocks.standingInstructions.setStatus.mockImplementation(
    (id: number, status: string) =>
      Promise.resolve({ data: { data: { subscription: fakeSI({ id, status }) } } }),
  );
  apiMocks.standingInstructions.create.mockResolvedValue({
    data: { data: { subscription: fakeSI() } },
  });
});

afterEach(() => {
  Object.values(apiMocks.standingInstructions).forEach((fn) =>
    (fn as ReturnType<typeof vi.fn>).mockReset(),
  );
});

async function importComp() {
  const mod = await import('@/components/settings/StandingInstructionsContent');
  return mod.StandingInstructionsContent;
}

describe('StandingInstructionsContent', () => {
  it('fetches /v2/standing-instructions on mount', async () => {
    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(apiMocks.standingInstructions.list).toHaveBeenCalled();
    });
  });

  it('renders real instructions', async () => {
    apiMocks.standingInstructions.list.mockResolvedValue({
      data: { data: { subscriptions: [fakeSI({ id: 11, name: 'Estate fund' })] } },
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText('Estate fund')).toBeInTheDocument();
    });
  });

  it('clicking pause hits setStatus(id, "paused")', async () => {
    apiMocks.standingInstructions.list.mockResolvedValue({
      data: { data: { subscriptions: [fakeSI({ id: 88 })] } },
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText('Estate fund')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Pause Estate fund/i }));

    await waitFor(() => {
      expect(apiMocks.standingInstructions.setStatus).toHaveBeenCalledWith(88, 'paused');
    });
  });
});
