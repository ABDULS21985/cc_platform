'use client';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

import DashboardLayout from '@/components/layout/DashboardLayout';
import WalletBalanceCard from '@/components/wallet/WalletBalanceCard';
import RecentTransactions from '@/components/wallet/RecentTransactions';
import UpcomingPayments from '@/components/wallet/UpcomingPayments';

export default function WalletPage() {
  return (
    <DashboardLayout pageTitle="Wallet">
      <div className="space-y-6">
        {/* Recent Transactions and Wallet Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions - Takes 2/3 of the space */}
          <div className="lg:col-span-2">
            <RecentTransactions />
          </div>
          
          {/* Wallet Balance and Upcoming Payments - Takes 1/3 of the space */}
          <div className="space-y-6">
            <WalletBalanceCard />
            <UpcomingPayments />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
