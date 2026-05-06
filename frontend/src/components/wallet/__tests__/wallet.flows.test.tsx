/**
 * Component-scoped integration tests for the CCPay wallet money flows.
 *
 * These cover the parts the wallet page composes:
 *   - TransactionPinModal: attempts counter + lockout when the parent reports
 *     server-side PIN failures.
 *   - SuccessModal: renders reference, deep-link, and "pending" hint.
 *   - SetTransactionPinModal: hits ApiService.wallet.setPin on submit.
 *   - SendMoneyModal: emits save_beneficiary in the draft when the checkbox
 *     is ticked.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const apiMocks = {
  wallet: {
    setPin: vi.fn(),
    withdraw: vi.fn(),
  },
};

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

vi.mock('@/hooks/useAxiosError', () => ({
  toastAxiosError: vi.fn(),
}));

beforeEach(() => {
  apiMocks.wallet.setPin.mockResolvedValue({ data: { success: true, data: {} } });
  apiMocks.wallet.withdraw.mockResolvedValue({
    data: {
      data: {
        transaction_id: 7,
        reference: 'WTH-7',
        amount: '5000',
        fee: '0',
        net_amount: '5000',
        status: 'pending',
        destination_bank: 'GTBank',
        destination_account: '0011223344',
        message: 'Withdrawal queued.',
      },
    },
  });
});

afterEach(() => {
  for (const fn of Object.values(apiMocks.wallet)) {
    (fn as ReturnType<typeof vi.fn>).mockReset();
  }
});

// ---------------------------------------------------------------------------
// TransactionPinModal
// ---------------------------------------------------------------------------
describe('TransactionPinModal', () => {
  it('rejects locally when the PIN is shorter than 4 digits', async () => {
    const onConfirm = vi.fn();
    const { TransactionPinModal } = await import('@/components/wallet/TransactionPinModal');

    render(
      <TransactionPinModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Confirm transfer"
        confirmButtonText="Send"
      />,
    );

    await userEvent.type(screen.getByPlaceholderText(/Enter transaction pin/i), '12');
    const submit = screen.getByRole('button', { name: /Send/i });
    expect(submit).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows inline attempts-remaining error when the parent reports a PIN failure', async () => {
    const onConfirm = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, pinError: true, attemptsRemaining: 2 });
    const { TransactionPinModal } = await import('@/components/wallet/TransactionPinModal');

    render(
      <TransactionPinModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Confirm transfer"
        confirmButtonText="Send"
      />,
    );

    await userEvent.type(screen.getByPlaceholderText(/Enter transaction pin/i), '1234');
    await userEvent.click(screen.getByRole('button', { name: /Send/i }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('1234');
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Incorrect PIN\. 2 attempts remaining\./i);
  });

  it('locks the Confirm button after three consecutive PIN failures', async () => {
    const onConfirm = vi.fn().mockResolvedValue({ ok: false, pinError: true });
    const { TransactionPinModal } = await import('@/components/wallet/TransactionPinModal');

    render(
      <TransactionPinModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Confirm transfer"
        confirmButtonText="Send"
      />,
    );

    const input = screen.getByPlaceholderText(/Enter transaction pin/i);

    for (let i = 0; i < 3; i++) {
      await userEvent.clear(input);
      await userEvent.type(input, '1234');
      await userEvent.click(screen.getByRole('button', { name: /Send/i }));
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledTimes(i + 1);
      });
    }

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        /Too many attempts\. Try again in a few minutes\./i,
      );
    });
    expect(screen.getByRole('button', { name: /Send/i })).toBeDisabled();
  });

  it('does NOT increment attempts when the parent fire-and-forgets', async () => {
    const onConfirm = vi.fn(); // returns undefined → opaque to the modal
    const { TransactionPinModal } = await import('@/components/wallet/TransactionPinModal');

    render(
      <TransactionPinModal
        isOpen={true}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        title="Confirm transfer"
        confirmButtonText="Send"
      />,
    );

    await userEvent.type(screen.getByPlaceholderText(/Enter transaction pin/i), '1234');
    await userEvent.click(screen.getByRole('button', { name: /Send/i }));
    expect(onConfirm).toHaveBeenCalledWith('1234');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SuccessModal
// ---------------------------------------------------------------------------
describe('SuccessModal', () => {
  it('renders reference, deep-link receipt, and pending hint when status=pending', async () => {
    const { SuccessModal } = await import('@/components/wallet/SuccessModal');

    render(
      <SuccessModal
        isOpen={true}
        onClose={vi.fn()}
        amount="₦5,000.00"
        message="Withdrawal queued."
        isWithdrawal={true}
        transactionId={42}
        reference="WTH-42"
        status="pending"
      />,
    );

    expect(screen.getByText(/-₦5,000\.00/)).toBeInTheDocument();
    expect(screen.getByText(/WTH-42/)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      /Funds may take a few minutes/i,
    );
    expect(screen.getByRole('link', { name: /View receipt/i })).toHaveAttribute(
      'href',
      '/dashboard/wallet?txn=42',
    );
  });

  it('omits the pending hint when the status is not pending', async () => {
    const { SuccessModal } = await import('@/components/wallet/SuccessModal');

    render(
      <SuccessModal
        isOpen={true}
        onClose={vi.fn()}
        amount="₦5,000.00"
        message="Sent."
        status="successful"
      />,
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SetTransactionPinModal
// ---------------------------------------------------------------------------
describe('SetTransactionPinModal', () => {
  it('blocks submission when PINs do not match', async () => {
    const { SetTransactionPinModal } = await import(
      '@/components/wallet/SetTransactionPinModal'
    );

    render(<SetTransactionPinModal isOpen={true} onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/^New PIN$/i), '1234');
    await userEvent.type(screen.getByLabelText(/^Confirm PIN$/i), '5678');
    await userEvent.click(screen.getByRole('button', { name: /Set PIN/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match/i);
    expect(apiMocks.wallet.setPin).not.toHaveBeenCalled();
  });

  it('calls ApiService.wallet.setPin and fires onComplete on success', async () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();
    const { SetTransactionPinModal } = await import(
      '@/components/wallet/SetTransactionPinModal'
    );

    render(
      <SetTransactionPinModal
        isOpen={true}
        onClose={onClose}
        onComplete={onComplete}
      />,
    );

    await userEvent.type(screen.getByLabelText(/^New PIN$/i), '1234');
    await userEvent.type(screen.getByLabelText(/^Confirm PIN$/i), '1234');
    await userEvent.click(screen.getByRole('button', { name: /Set PIN/i }));

    await waitFor(() => {
      expect(apiMocks.wallet.setPin).toHaveBeenCalledWith({ pin: '1234' });
    });
    expect(onComplete).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// SendMoneyModal — save_beneficiary toggle
// ---------------------------------------------------------------------------
describe('SendMoneyModal', () => {
  it('emits save_beneficiary=true when the checkbox is ticked for a fresh recipient', async () => {
    const onSend = vi.fn();
    const { SendMoneyModal } = await import('@/components/wallet/SendMoneyModal');

    render(
      <SendMoneyModal
        isOpen={true}
        onClose={vi.fn()}
        onSend={onSend}
      />,
    );

    await userEvent.type(
      screen.getByPlaceholderText(/Enter account number/i),
      '0011223344',
    );
    await userEvent.type(
      screen.getByPlaceholderText(/Enter account name/i),
      'Trinity Co-op',
    );
    // Select bank — open the radix select trigger.
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByText('GTBank'));
    await userEvent.type(screen.getByPlaceholderText(/Enter amount/i), '5000');

    await userEvent.click(
      screen.getByRole('checkbox', { name: /Save as beneficiary/i }),
    );
    await userEvent.click(screen.getByRole('button', { name: /Continue/i }));

    expect(onSend).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: '5000',
        account_number: '0011223344',
        bank_code: '058',
        bank_name: 'GTBank',
        account_name: 'Trinity Co-op',
        save_beneficiary: true,
      }),
    );
  });

  it('hides the Save-as-beneficiary checkbox when prefilled from an existing recipient', async () => {
    const { SendMoneyModal } = await import('@/components/wallet/SendMoneyModal');

    render(
      <SendMoneyModal
        isOpen={true}
        onClose={vi.fn()}
        onSend={vi.fn()}
        initialRecipient={{
          account_number: '0011223344',
          account_name: 'Trinity Co-op',
          bank_code: '058',
          bank_name: 'GTBank',
        }}
      />,
    );

    expect(
      screen.queryByRole('checkbox', { name: /Save as beneficiary/i }),
    ).not.toBeInTheDocument();
  });
});
