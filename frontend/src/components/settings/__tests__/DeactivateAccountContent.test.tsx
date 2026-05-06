/**
 * DeactivateAccountContent integration tests
 *   1. fetches /v2/auth/deactivate/preflight on mount,
 *   2. lists blockers when preflight returns them and disables submit,
 *   3. requires email-match + password before submit is enabled,
 *   4. clicking deactivate hits POST /v2/auth/deactivate.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const apiMocks = {
  auth: {
    deactivation: {
      preflight: vi.fn(),
      deactivate: vi.fn(),
      reactivate: vi.fn(),
    },
  },
};

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

beforeEach(() => {
  apiMocks.auth.deactivation.preflight.mockResolvedValue({
    data: {
      data: { blockers: [], can_deactivate: true, grace_days: 30 },
    },
  });
  apiMocks.auth.deactivation.deactivate.mockResolvedValue({
    data: { data: { deactivated_at: new Date().toISOString() } },
  });
  window.localStorage.setItem(
    'user_data',
    JSON.stringify({ id: 1, email: 'ada@example.com' }),
  );
});

afterEach(() => {
  Object.values(apiMocks.auth.deactivation).forEach((fn) =>
    (fn as ReturnType<typeof vi.fn>).mockReset(),
  );
});

async function importComp() {
  const mod = await import('@/components/settings/DeactivateAccountContent');
  return mod.DeactivateAccountContent;
}

describe('DeactivateAccountContent', () => {
  it('fetches preflight on mount', async () => {
    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(apiMocks.auth.deactivation.preflight).toHaveBeenCalled();
    });
  });

  it('shows blockers and disables submit when can_deactivate=false', async () => {
    apiMocks.auth.deactivation.preflight.mockResolvedValue({
      data: {
        data: {
          blockers: [
            {
              kind: 'wallet_balance',
              message: 'Withdraw your ₦5,000 wallet balance first.',
            },
          ],
          can_deactivate: false,
          grace_days: 30,
        },
      },
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText(/Withdraw your ₦5,000/)).toBeInTheDocument();
    });
    const submit = screen.getByRole('button', { name: /Deactivate account/i });
    expect(submit).toBeDisabled();
  });

  it('enables submit only when email matches AND password is provided', async () => {
    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(apiMocks.auth.deactivation.preflight).toHaveBeenCalled();
    });

    const user = userEvent.setup();
    const submit = screen.getByRole('button', { name: /Deactivate account/i });
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByLabelText(/Type your email to confirm/i),
      'ada@example.com',
    );
    expect(submit).toBeDisabled(); // no password yet

    await user.type(screen.getByLabelText(/^Password$/i), 'hunter2');
    expect(submit).not.toBeDisabled();
  });

  it('clicking deactivate calls POST /v2/auth/deactivate with email+password', async () => {
    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(apiMocks.auth.deactivation.preflight).toHaveBeenCalled();
    });

    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText(/Type your email to confirm/i),
      'ada@example.com',
    );
    await user.type(screen.getByLabelText(/^Password$/i), 'hunter2');
    await user.click(screen.getByRole('button', { name: /Deactivate account/i }));

    await waitFor(() => {
      expect(apiMocks.auth.deactivation.deactivate).toHaveBeenCalledWith({
        password: 'hunter2',
      });
    });
  });
});
