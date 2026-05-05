/**
 * /dashboard/settings integration tests
 * --------------------------------------------------------------------------
 * The settings page is glue: it reads ?tab=&subtab= from the URL and renders
 * the matching sub-component. These tests pin the routing behavior:
 *   1. default route renders "Personal information",
 *   2. ?tab=verification renders the verification surface AND fetches /v2/verification/status,
 *   3. ?tab=notification renders the notification preferences AND fetches /v2/notifications/preferences,
 *   4. ?tab=change-password renders the password section,
 *   5. ?tab=security&subtab=login-history renders the login-history section.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const apiMocks = {
  profile: {
    get: vi.fn(),
    update: vi.fn(),
    uploadImage: vi.fn(),
    uploadHeader: vi.fn(),
    changePassword: vi.fn(),
  },
  verification: {
    getStatus: vi.fn(),
    verifyBvn: vi.fn(),
    verifyNin: vi.fn(),
    getTaskStatus: vi.fn(),
  },
  notifications: {
    getPreferences: vi.fn(),
    updatePreferences: vi.fn(),
    listMutedCommunities: vi.fn(),
  },
};

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const searchParamsRef = { current: new URLSearchParams() };
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard/settings',
  useSearchParams: () => searchParamsRef.current,
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock('@/hooks/useUserData', () => ({
  default: () => ({
    id: 50,
    firstname: 'Ada',
    lastname: 'M',
    phone_number: '+234',
    bio: '',
    email: 'a@b.co',
    profile_photo: null,
  }),
}));

async function importPage() {
  const mod = await import('@/app/dashboard/settings/page');
  return mod.default;
}

beforeEach(() => {
  apiMocks.verification.getStatus.mockResolvedValue({
    data: { data: { id: 0, user_id: 50, verification_type: 'bvn', status: 'pending', verified: false, verified_at: null, error_message: null } },
  });
  apiMocks.notifications.getPreferences.mockResolvedValue({
    data: {
      data: {
        preferences: {
          user_id: 50,
          money: true,
          bills: true,
          communities: true,
          events: true,
          security: true,
          system: true,
          digest_frequency: 'daily',
          last_digest_at: null,
          updated_at: null,
        },
      },
    },
  });
  apiMocks.notifications.listMutedCommunities.mockResolvedValue({
    data: { data: { community_ids: [] } },
  });
  searchParamsRef.current = new URLSearchParams();
  window.localStorage.setItem('user_data', JSON.stringify({ id: 50 }));
});

afterEach(() => {
  Object.values(apiMocks).forEach((g) => {
    Object.values(g).forEach((fn) => (fn as ReturnType<typeof vi.fn>).mockReset());
  });
});

describe('/dashboard/settings', () => {
  it('default route renders the "Personal information" section', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { name: /Personal information/i })
          .length,
      ).toBeGreaterThan(0);
    });
  });

  it('?tab=verification renders the verification section and hits /v2/verification/status', async () => {
    searchParamsRef.current = new URLSearchParams('tab=verification');
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { name: /Identity verification/i })
          .length,
      ).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(apiMocks.verification.getStatus).toHaveBeenCalled();
    });
  });

  it('?tab=notification renders preferences AND hits /v2/notifications/preferences', async () => {
    searchParamsRef.current = new URLSearchParams('tab=notification');
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { name: /Notifications/i }).length,
      ).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(apiMocks.notifications.getPreferences).toHaveBeenCalled();
    });
  });

  it('?tab=change-password renders the password section', async () => {
    searchParamsRef.current = new URLSearchParams('tab=change-password');
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { name: /^Password$/i }).length,
      ).toBeGreaterThan(0);
    });
  });

  it('?tab=security&subtab=login-history resolves to the login-history section', async () => {
    searchParamsRef.current = new URLSearchParams(
      'tab=security&subtab=login-history',
    );
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(
        screen.getAllByRole('heading', { name: /Login history/i }).length,
      ).toBeGreaterThan(0);
    });
  });
});
