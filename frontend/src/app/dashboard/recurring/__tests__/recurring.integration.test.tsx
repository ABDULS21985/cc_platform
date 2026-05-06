/**
 * /dashboard/recurring integration tests
 * --------------------------------------------------------------------------
 * Verifies the standing-instruction data flow:
 *   1. list() is called on mount and API data renders,
 *   2. real-mode empty responses stay empty instead of showing demo data,
 *   3. pause/cancel/delete actions call the standing-instruction endpoints,
 *   4. create flow sends every collected form field to the API.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { SubscriptionApi } from '@/services/api';

const { apiMocks, demoModeState } = vi.hoisted(() => ({
  apiMocks: {
    standingInstructions: {
      list: vi.fn(),
      create: vi.fn(),
      verifyPin: vi.fn(),
      setStatus: vi.fn(),
      delete: vi.fn(),
    },
  },
  demoModeState: { enabled: false },
}));

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

vi.mock('@/lib/demo-mode', () => ({
  useDemoData: () => demoModeState.enabled,
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
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

vi.mock('@/components/ui/motion', async () => {
  const ReactMod = await import('react');
  type MotionProps = React.HTMLAttributes<HTMLElement> & {
    children?: React.ReactNode;
    layout?: unknown;
    layoutId?: unknown;
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
  };
  const motionElement =
    (tag: keyof React.JSX.IntrinsicElements) =>
    ({
      children,
      layout,
      layoutId,
      initial,
      animate,
      exit,
      transition,
      ...props
    }: MotionProps) =>
      ReactMod.createElement(tag, props, children);

  return {
    motion: {
      div: motionElement('div'),
      li: motionElement('li'),
      span: motionElement('span'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    FadeIn: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SlideUp: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('@/components/ui/select', () => ({
    Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectContent: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SelectItem: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    SelectTrigger: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
    SelectValue: ({ placeholder }: { placeholder?: string }) => (
      <span>{placeholder}</span>
    ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    className,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    className?: string;
  }) => (
    <button type="button" className={className} onClick={onSelect}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/settings/AddInstructionsModal', () => ({
  AddInstructionsModal: ({
    isOpen,
    onNext,
  }: {
    isOpen: boolean;
    onNext: (data: Record<string, string>) => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="Add instructions">
        <button
          type="button"
          onClick={() =>
            onNext({
              title: 'Water bill auto-pay',
              amount: '12,500',
              frequency: 'monthly',
              startDate: '2026-06-01',
              endDate: '2026-12-31',
              destinationAccountNumber: '1234567890',
              destinationBankCode: '044',
              destinationAccountName: 'Lekki Utilities',
            })
          }
        >
          Mock add next
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/settings/PasswordConfirmModal', () => ({
  PasswordConfirmModal: ({
    isOpen,
    onNext,
  }: {
    isOpen: boolean;
    onNext: (pin: string) => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="Confirm standing instruction">
        <button type="button" onClick={() => onNext('1234')}>
          Mock pin next
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/settings/SplitPaymentModal', () => ({
  SplitPaymentModal: ({
    isOpen,
    onComplete,
  }: {
    isOpen: boolean;
    onComplete: (data: Record<string, string>) => void;
  }) =>
    isOpen ? (
      <div role="dialog" aria-label="Split payment">
        <button
          type="button"
          onClick={() =>
            onComplete({
              splitMemberName: 'Aisha Bello',
              splitPrimaryAmount: '5000',
              splitSecondaryAmount: '7500',
            })
          }
        >
          Mock split complete
        </button>
      </div>
    ) : null,
}));

async function importPage() {
  const mod = await import('@/app/dashboard/recurring/page');
  return mod.default;
}

const fakeInstruction = (
  overrides: Partial<SubscriptionApi> = {},
): SubscriptionApi => ({
  id: 88,
  user_id: 50,
  kind: 'standing_instruction',
  name: 'Lekki dues',
  description: 'Monthly estate maintenance',
  amount: 18500,
  currency: 'NGN',
  cadence: 'monthly',
  start_at: '2026-06-01T07:00:00.000Z',
  end_at: null,
  next_charge_at: '2026-06-01T07:00:00.000Z',
  last_charged_at: '2026-05-01T07:00:00.000Z',
  status: 'active',
  counterparty_type: null,
  counterparty_id: null,
  source_bill_id: null,
  destination_account_number: '1234567890',
  destination_bank_code: '044',
  destination_account_name: 'Lekki HOA',
  split_member_name: null,
  split_primary_amount: null,
  split_secondary_amount: null,
  pin_required: true,
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

const listResponse = (subscriptions: SubscriptionApi[]) => ({
  data: { data: { subscriptions, total: subscriptions.length } },
});

const TEST_TIMEOUT_MS = 20_000;

beforeEach(() => {
  demoModeState.enabled = false;
  apiMocks.standingInstructions.list.mockResolvedValue(listResponse([]));
  apiMocks.standingInstructions.create.mockResolvedValue({
    data: { data: { subscription: fakeInstruction({ id: 99 }) } },
  });
  apiMocks.standingInstructions.verifyPin.mockResolvedValue({
    data: { data: { verified: true } },
  });
  apiMocks.standingInstructions.setStatus.mockImplementation(
    async (id: number, status: SubscriptionApi['status']) => ({
      data: {
        data: {
          subscription: fakeInstruction({ id, status }),
        },
      },
    }),
  );
  apiMocks.standingInstructions.delete.mockResolvedValue({
    data: { data: {} },
  });
});

afterEach(() => {
  for (const fn of Object.values(apiMocks.standingInstructions)) {
    fn.mockReset();
  }
});

describe('/dashboard/recurring', () => {
  it('calls standingInstructions.list on mount and renders API data', async () => {
    apiMocks.standingInstructions.list.mockResolvedValue(
      listResponse([fakeInstruction()]),
    );

    const Page = await importPage();
    render(<Page />);

    await waitFor(() => {
      expect(apiMocks.standingInstructions.list).toHaveBeenCalledWith({
        limit: 200,
      });
    });
    expect(await screen.findByText('Lekki dues')).toBeInTheDocument();
    expect(screen.getByText('To Lekki HOA')).toBeInTheDocument();
    expect(screen.getAllByText('₦18,500')).toHaveLength(2);
  }, TEST_TIMEOUT_MS);

  it('renders the real empty state when demo mode is off', async () => {
    const Page = await importPage();
    render(<Page />);

    expect(await screen.findByText('No active rules')).toBeInTheDocument();
    expect(screen.queryByText('Lekki Block 3 dues')).not.toBeInTheDocument();
  }, TEST_TIMEOUT_MS);

  it('pauses an active instruction through the API', async () => {
    apiMocks.standingInstructions.list.mockResolvedValue(
      listResponse([fakeInstruction()]),
    );

    const Page = await importPage();
    render(<Page />);
    expect(await screen.findByText('Lekki dues')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Pause$/i }));

    await waitFor(() => {
      expect(apiMocks.standingInstructions.setStatus).toHaveBeenCalledWith(
        88,
        'paused',
      );
    });
    fireEvent.click(screen.getByRole('tab', { name: /Paused/i }));
    expect(
      await screen.findByRole('button', { name: /^Resume$/i }),
    ).toBeInTheDocument();
  }, TEST_TIMEOUT_MS);

  it('cancels and deletes instructions through the API', async () => {
    apiMocks.standingInstructions.list
      .mockResolvedValueOnce(
        listResponse([fakeInstruction({ status: 'cancelled' })]),
      )
      .mockResolvedValueOnce(listResponse([]));

    const Page = await importPage();
    render(<Page />);
    fireEvent.click(await screen.findByRole('tab', { name: /Cancelled/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/i }));

    await waitFor(() => {
      expect(apiMocks.standingInstructions.delete).toHaveBeenCalledWith(88);
    });
    expect(apiMocks.standingInstructions.list).toHaveBeenCalledTimes(2);
  }, TEST_TIMEOUT_MS);

  it('sends every collected create field to standingInstructions.create', async () => {
    apiMocks.standingInstructions.create.mockResolvedValue({
      data: {
        data: {
          subscription: fakeInstruction({
            id: 99,
            name: 'Water bill auto-pay',
            amount: 12500,
            destination_account_name: 'Lekki Utilities',
          }),
        },
      },
    });

    const Page = await importPage();
    render(<Page />);

    await screen.findByText('No active rules');
    fireEvent.click(screen.getAllByRole('button', { name: /New rule/i })[0]);
    fireEvent.click(screen.getByRole('button', { name: /Mock add next/i }));
    fireEvent.click(screen.getByRole('button', { name: /Mock pin next/i }));

    await waitFor(() => {
      expect(apiMocks.standingInstructions.verifyPin).toHaveBeenCalledWith({
        pin: '1234',
      });
    });
    fireEvent.click(
      await screen.findByRole('button', { name: /Mock split complete/i }),
    );

    await waitFor(() => {
      expect(apiMocks.standingInstructions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Water bill auto-pay',
          amount: 12500,
          currency: 'NGN',
          cadence: 'monthly',
          start_at: '2026-06-01T07:00:00.000Z',
          end_at: '2026-12-31T07:00:00.000Z',
          next_charge_at: '2026-06-01T07:00:00.000Z',
          destination_account_number: '1234567890',
          destination_bank_code: '044',
          destination_account_name: 'Lekki Utilities',
          split_member_name: 'Aisha Bello',
          split_primary_amount: 5000,
          split_secondary_amount: 7500,
          pin: '1234',
        }),
      );
    });
    expect(await screen.findByText('Water bill auto-pay')).toBeInTheDocument();
  }, TEST_TIMEOUT_MS);
});
