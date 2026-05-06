'use client';

import * as React from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import WalletBalanceCard from '@/components/wallet/WalletBalanceCard';
import RecentTransactions from '@/components/wallet/RecentTransactions';
import UpcomingPayments from '@/components/wallet/UpcomingPayments';
import { WalletStatsStrip } from '@/components/wallet/WalletStatsStrip';
import { Beneficiaries, type Beneficiary } from '@/components/wallet/Beneficiaries';
import { FundingSources } from '@/components/wallet/FundingSources';
import { SpendingInsights } from '@/components/wallet/SpendingInsights';
import { MakePaymentModal, type WalletFundDraft } from '@/components/wallet/MakePaymentModal';
import { AccountDetailsModal, type WalletAccountDetails } from '@/components/wallet/AccountDetailsModal';
import {
  SendMoneyModal,
  type WalletTransferDraft,
  type WalletTransferPrefill,
} from '@/components/wallet/SendMoneyModal';
import { WithdrawMoneyModal } from '@/components/wallet/WithdrawMoneyModal';
import { TransactionPinModal } from '@/components/wallet/TransactionPinModal';
import { SuccessModal } from '@/components/wallet/SuccessModal';
import { ApiService } from '@/services/api';
import { toastAxiosError } from '@/hooks/useAxiosError';

export const dynamic = 'force-dynamic';

type WalletAction = 'fund' | 'send' | 'withdraw' | 'account';
type PendingTransfer = {
  mode: 'send' | 'withdraw';
  draft: WalletTransferDraft;
};

function parseMoney(value: string): number {
  const amount = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(amount) ? amount : 0;
}

function accountDetailsFromDeposit(data: {
  bank_details: {
    account_number: string;
    account_name: string;
    bank_name: string;
  };
  reference: string;
  amount: string;
  status: string;
  instructions?: string;
  message?: string;
}): WalletAccountDetails {
  return {
    account_number: data.bank_details.account_number,
    account_name: data.bank_details.account_name,
    bank_name: data.bank_details.bank_name,
    reference: data.reference,
    amount: data.amount,
    status: data.status,
    instructions: data.instructions,
    message: data.message,
  };
}

export default function WalletPage() {
  const [fundOpen, setFundOpen] = React.useState(false);
  const [accountOpen, setAccountOpen] = React.useState(false);
  const [sendOpen, setSendOpen] = React.useState(false);
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [pinOpen, setPinOpen] = React.useState(false);
  const [successOpen, setSuccessOpen] = React.useState(false);
  const [fundLoading, setFundLoading] = React.useState(false);
  const [transferLoading, setTransferLoading] = React.useState(false);
  const [walletRefreshKey, setWalletRefreshKey] = React.useState(0);
  const [accountDetails, setAccountDetails] = React.useState<WalletAccountDetails | null>(null);
  const [sendPrefill, setSendPrefill] = React.useState<WalletTransferPrefill | null>(null);
  const [pendingTransfer, setPendingTransfer] = React.useState<PendingTransfer | null>(null);
  const [successState, setSuccessState] = React.useState({
    amount: '₦0.00',
    message: '',
  });

  const openFund = React.useCallback(() => setFundOpen(true), []);

  const openAccount = React.useCallback(async () => {
    try {
      const response = await ApiService.wallet.getDetails();
      const wallet = response.data.data;
      setAccountDetails({
        account_number: wallet.account_number,
        account_name: wallet.account_name,
        bank_name: wallet.bank_name || 'Wallet account',
      });
      setAccountOpen(true);
    } catch (error) {
      toastAxiosError(error, 'Failed to load account details.');
    }
  }, []);

  const openSend = React.useCallback((prefill: WalletTransferPrefill | null = null) => {
    setSendPrefill(prefill);
    setSendOpen(true);
  }, []);

  const handleWalletAction = React.useCallback(
    (id: WalletAction) => {
      if (id === 'fund') openFund();
      if (id === 'send') openSend();
      if (id === 'withdraw') setWithdrawOpen(true);
      if (id === 'account') void openAccount();
    },
    [openAccount, openFund, openSend],
  );

  const handleFundSubmit = React.useCallback(async (draft: WalletFundDraft) => {
    const amount = parseMoney(draft.amount);
    if (amount < 50) {
      toast.error('Minimum wallet funding amount is ₦50.');
      return;
    }

    setFundLoading(true);
    try {
      const response = await ApiService.wallet.deposit({
        amount,
        description: draft.note || 'Wallet deposit',
      });
      setAccountDetails(accountDetailsFromDeposit(response.data.data));
      setFundOpen(false);
      setAccountOpen(true);
    } catch (error) {
      toastAxiosError(error, 'Failed to initiate wallet funding.');
    } finally {
      setFundLoading(false);
    }
  }, []);

  const handleTransferDraft = React.useCallback(
    (mode: PendingTransfer['mode']) => (draft: WalletTransferDraft) => {
      const amount = parseMoney(draft.amount);
      if (amount < 100) {
        toast.error('Minimum withdrawal amount is ₦100.');
        return;
      }
      setPendingTransfer({ mode, draft });
      setSendOpen(false);
      setWithdrawOpen(false);
      setPinOpen(true);
    },
    [],
  );

  const handlePinConfirm = React.useCallback(async (pin: string) => {
    if (!pendingTransfer) return;

    setTransferLoading(true);
    try {
      const response = await ApiService.wallet.withdraw({
        amount: parseMoney(pendingTransfer.draft.amount),
        bank_code: pendingTransfer.draft.bank_code,
        bank_name: pendingTransfer.draft.bank_name,
        account_number: pendingTransfer.draft.account_number,
        account_name: pendingTransfer.draft.account_name,
        note: pendingTransfer.draft.note,
        pin,
      });
      const result = response.data.data;
      setSuccessState({
        amount: `₦${Number(result.amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}`,
        message: result.message || 'Withdrawal request submitted.',
      });
      setPinOpen(false);
      setSuccessOpen(true);
      setPendingTransfer(null);
      setWalletRefreshKey((key) => key + 1);
    } catch (error) {
      toastAxiosError(error, 'Failed to submit withdrawal request.');
    } finally {
      setTransferLoading(false);
    }
  }, [pendingTransfer]);

  const handleBeneficiarySelect = React.useCallback(
    (beneficiary: Beneficiary) => {
      openSend({
        account_number: beneficiary.accountNumber,
        account_name: beneficiary.accountName || beneficiary.name,
        bank_code: beneficiary.bankCode,
        bank_name: beneficiary.bank,
      });
    },
    [openSend],
  );

  return (
    <DashboardLayout pageTitle="Wallet">
      <div className="space-y-6">
        {/* Hero balance + monthly stats */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(360px,_420px)]">
          <div className="space-y-6">
            <WalletStatsStrip />
            <Beneficiaries
              onCreate={() => openSend()}
              onSelect={handleBeneficiarySelect}
            />
          </div>
          <div>
            <WalletBalanceCard
              onAction={handleWalletAction}
              refreshKey={walletRefreshKey}
            />
          </div>
        </div>

        {/* Two-column main + side */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-6 lg:col-span-2">
            <RecentTransactions />
            <SpendingInsights />
          </div>

          {/* Side column */}
          <div className="space-y-6">
            <UpcomingPayments />
            <FundingSources onAdd={openFund} />
          </div>
        </div>
      </div>

      <MakePaymentModal
        isOpen={fundOpen}
        onClose={() => setFundOpen(false)}
        onSubmit={handleFundSubmit}
        loading={fundLoading}
      />

      <AccountDetailsModal
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        details={accountDetails}
      />

      <SendMoneyModal
        isOpen={sendOpen}
        onClose={() => setSendOpen(false)}
        onSend={handleTransferDraft('send')}
        initialRecipient={sendPrefill}
      />

      <WithdrawMoneyModal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        onConfirm={handleTransferDraft('withdraw')}
      />

      <TransactionPinModal
        isOpen={pinOpen}
        onClose={() => setPinOpen(false)}
        onConfirm={handlePinConfirm}
        title={pendingTransfer?.mode === 'send' ? 'Confirm transfer' : 'Withdraw funds'}
        confirmButtonText={pendingTransfer?.mode === 'send' ? 'Send' : 'Withdraw'}
        loading={transferLoading}
      />

      <SuccessModal
        isOpen={successOpen}
        onClose={() => setSuccessOpen(false)}
        amount={successState.amount}
        message={successState.message}
        isWithdrawal={true}
      />
    </DashboardLayout>
  );
}
