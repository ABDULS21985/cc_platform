'use client';

import * as React from 'react';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight, Settings as SettingsIcon, SlidersHorizontal } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AnimatePresence, motion } from '@/components/ui/motion';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { SubscriptionsSidebar } from '@/components/settings/SubscriptionsSidebar';
import { SecuritySidebar } from '@/components/settings/SecuritySidebar';
import { ProfileCompletion } from '@/components/settings/ProfileCompletion';
import { AccountInformationForm } from '@/components/settings/AccountInformationForm';
import { SubscriptionsContent } from '@/components/settings/SubscriptionsContent';
import { StandingInstructionsContent } from '@/components/settings/StandingInstructionsContent';
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm';
import { LoginHistoryContent } from '@/components/settings/LoginHistoryContent';
import { NotificationPreferencesContent } from '@/components/settings/NotificationPreferencesContent';
import { VerificationContent } from '@/components/settings/VerificationContent';
import { RoleAccessContent } from '@/components/settings/RoleAccessContent';
import { DeactivateAccountContent } from '@/components/settings/DeactivateAccountContent';
import { PlaceholderContent } from '@/components/settings/PlaceholderContent';

export const dynamic = 'force-dynamic';

interface TabMeta {
  title: string;
  description: string;
  /** The "section" used to pick which sidebar variant renders. */
  section: 'general' | 'subscriptions' | 'security';
}

const TABS: Record<string, TabMeta> = {
  'account-info': {
    title: 'Personal information',
    description: 'Your name, photo, contact details, and bio.',
    section: 'general',
  },
  verification: {
    title: 'Identity verification',
    description: 'BVN, NIN, and KYC status. Required for transfers above ₦200k.',
    section: 'general',
  },
  notification: {
    title: 'Notifications',
    description: 'Choose what reaches you over email, SMS, and push.',
    section: 'general',
  },
  subscriptions: {
    title: 'Subscriptions',
    description: 'Recurring payments and standing instructions.',
    section: 'subscriptions',
  },
  'standing-instructions': {
    title: 'Standing instructions',
    description: 'Scheduled transfers that run automatically.',
    section: 'subscriptions',
  },
  'change-password': {
    title: 'Password',
    description: 'Update the password used to sign in.',
    section: 'security',
  },
  'login-history': {
    title: 'Login history',
    description: 'Devices and sessions that have accessed your account recently.',
    section: 'security',
  },
  'role-access': {
    title: 'Admin management',
    description: 'Manage admin permissions across your communities.',
    section: 'security',
  },
  deactivate: {
    title: 'Deactivate account',
    description: 'Permanently remove your account and associated data.',
    section: 'general',
  },
};

const SECURITY_TAB_IDS = new Set(['change-password', 'login-history', 'role-access']);

function resolveTabFromQuery(
  tab: string | null,
  subtab: string | null
): string {
  if (!tab) return 'account-info';
  if (tab === 'security') return subtab || 'change-password';
  return tab;
}

function tabHref(tabId: string): string {
  if (SECURITY_TAB_IDS.has(tabId)) {
    return `/dashboard/settings?tab=security&subtab=${tabId}`;
  }
  return `/dashboard/settings?tab=${tabId}`;
}

function SettingsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('account-info');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const subtab = searchParams.get('subtab');
    setActiveTab(resolveTabFromQuery(tab, subtab));
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.push(tabHref(tab));
    setMobileNavOpen(false);
  };

  const meta = TABS[activeTab] ?? TABS['account-info'];

  const renderSidebar = () => {
    switch (meta.section) {
      case 'subscriptions':
        return (
          <SubscriptionsSidebar
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        );
      case 'security':
        return (
          <SecuritySidebar activeTab={activeTab} onTabChange={handleTabChange} />
        );
      default:
        return (
          <SettingsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        );
    }
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
        return <RoleAccessContent />;
      case 'notification':
        return <NotificationPreferencesContent />;
      case 'deactivate':
        return <DeactivateAccountContent />;
      case 'verification':
        return <VerificationContent />;
      default:
        return <AccountInformationForm />;
    }
  };

  return (
    <DashboardLayout pageTitle="Settings">
      <div className="space-y-6">
        {/* Profile completion */}
        <ProfileCompletion onJumpTo={handleTabChange} />

        {/* Mobile section switcher */}
        <div className="lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMobileNavOpen(true)}
            leadingIcon={<SlidersHorizontal className="size-4" />}
            block
          >
            Settings sections · {meta.title}
          </Button>
        </div>

        <div className="flex gap-6">
          <aside className="hidden lg:block" aria-label="Settings sections">
            <div className="sticky top-6">{renderSidebar()}</div>
          </aside>

          <div className="min-w-0 flex-1">
            <Card variant="default" className="min-h-[600px]">
              <CardContent className="space-y-6">
                {/* Breadcrumb + heading */}
                <header className="space-y-3 border-b border-border pb-5">
                  <nav
                    aria-label="Breadcrumb"
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <SettingsIcon
                        className="size-3.5"
                        aria-hidden="true"
                      />
                      Settings
                    </span>
                    <ChevronRight className="size-3" aria-hidden="true" />
                    <span className="text-foreground">{meta.title}</span>
                  </nav>
                  <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                      {meta.title}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {meta.description}
                    </p>
                  </div>
                </header>

                {/* Animated tab content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {renderContent()}
                  </motion.div>
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="left"
          title="Settings"
          description="Choose a section"
        >
          {renderSidebar()}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}

function SettingsLoadingFallback() {
  return (
    <DashboardLayout pageTitle="Settings">
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="flex gap-6">
          <div className="hidden w-72 space-y-3 lg:block">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <Skeleton className="h-8 w-1/3 rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="h-72 rounded-2xl" />
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
