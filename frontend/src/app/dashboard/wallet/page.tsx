'use client';

import * as React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import WalletBalanceCard from '@/components/wallet/WalletBalanceCard';
import RecentTransactions from '@/components/wallet/RecentTransactions';
import UpcomingPayments from '@/components/wallet/UpcomingPayments';
import { WalletStatsStrip } from '@/components/wallet/WalletStatsStrip';
import { Beneficiaries } from '@/components/wallet/Beneficiaries';
import { FundingSources } from '@/components/wallet/FundingSources';
import { SpendingInsights } from '@/components/wallet/SpendingInsights';

export const dynamic = 'force-dynamic';

export default function WalletPage() {
  return (
    <DashboardLayout pageTitle="Wallet">
      <div className="space-y-6">
        {/* Hero balance + monthly stats */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,_1fr)_minmax(360px,_420px)]">
          <div className="space-y-6">
            <WalletStatsStrip />
            <Beneficiaries />
          </div>
          <div>
            <WalletBalanceCard />
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
            <FundingSources />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
