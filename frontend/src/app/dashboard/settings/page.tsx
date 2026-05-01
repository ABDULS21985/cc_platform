'use client';

import { useState, useEffect, Suspense } from 'react';

export const dynamic = 'force-dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { SubscriptionsSidebar } from '@/components/settings/SubscriptionsSidebar';
import { SecuritySidebar } from '@/components/settings/SecuritySidebar';
import { AccountInformationForm } from '@/components/settings/AccountInformationForm';
import { SubscriptionsContent } from '@/components/settings/SubscriptionsContent';
import { StandingInstructionsContent } from '@/components/settings/StandingInstructionsContent';
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm';
import { LoginHistoryContent } from '@/components/settings/LoginHistoryContent';
import { NotificationPreferencesContent } from '@/components/settings/NotificationPreferencesContent';
import { VerificationContent } from '@/components/settings/VerificationContent';
import { PlaceholderContent } from '@/components/settings/PlaceholderContent';

function SettingsPageContent() {
  const [activeTab, setActiveTab] = useState('account-info');
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const tab = searchParams.get('tab');
    const subtab = searchParams.get('subtab');

    if (tab) {
      if (tab === 'security') {
        // Use subtab if available, otherwise default to change-password
        setActiveTab(subtab || 'change-password');
      } else {
        setActiveTab(tab);
      }
    } else {
      setActiveTab('account-info');
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);

    if (
      tab === 'change-password' ||
      tab === 'login-history' ||
      tab === 'role-access'
    ) {
      router.push(`/dashboard/settings?tab=security&subtab=${tab}`);
    } else {
      router.push(`/dashboard/settings?tab=${tab}`);
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'account-info':
        return 'Account information';
      case 'subscriptions':
        return 'Subscriptions';
      case 'standing-instructions':
        return 'Standing Instructions';
      case 'notification':
        return 'Notifications';
      case 'deactivate':
        return 'Deactivate account';
      case 'change-password':
        return 'Change password';
      case 'login-history':
        return 'Login history';
      case 'role-access':
        return 'Admin Management';
      case 'verification':
        return 'Identity Verification';
      default:
        return 'Account information';
    }
  };

  const renderSidebar = () => {
    if (
      activeTab === 'subscriptions' ||
      activeTab === 'standing-instructions'
    ) {
      return (
        <SubscriptionsSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
      );
    }
    if (
      activeTab === 'change-password' ||
      activeTab === 'login-history' ||
      activeTab === 'role-access'
    ) {
      return (
        <SecuritySidebar activeTab={activeTab} onTabChange={handleTabChange} />
      );
    }
    return (
      <SettingsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'account-info':
        return <AccountInformationForm />;
      case 'subscriptions':
        return <SubscriptionsContent />;
      case 'standing-instructions':
        return <StandingInstructionsContent />;
      case 'change-password':
        return <ChangePasswordForm />;
      case 'login-history':
        return <LoginHistoryContent />;
      case 'role-access':
        return (
          <PlaceholderContent
            title="Role & Access Management"
            description="Role & Access Management content coming soon..."
          />
        );
      case 'notification':
        return <NotificationPreferencesContent />;
      case 'deactivate':
        return (
          <PlaceholderContent
            title="Deactivate Account"
            description="Deactivate account content coming soon..."
          />
        );
      case 'verification':
        return <VerificationContent />;
      default:
        return <AccountInformationForm />;
    }
  };

  return (
    <DashboardLayout pageTitle="Settings">
      <div className="flex gap-6">
        {renderSidebar()}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 border border-white/20 shadow-soft min-h-[600px]">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-50">
               <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                 {getPageTitle()}
               </h1>
               <div className="h-2 w-12 bg-[#0E9DA5] rounded-full" />
            </div>
            {renderContent()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function SettingsLoadingFallback() {
  return (
    <DashboardLayout pageTitle="Settings">
      <div className="flex gap-6">
        {/* Sidebar Loading */}
        <div className="w-64 bg-white rounded-lg p-6 border border-gray-100">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 bg-gray-200 rounded animate-pulse"
              ></div>
            ))}
          </div>
        </div>

        {/* Main Content Loading */}
        <div className="flex-1">
          <div className="bg-white rounded-lg p-6 border border-gray-100">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6 animate-pulse"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsLoadingFallback />}>
      <SettingsPageContent />
    </Suspense>
  );
}
