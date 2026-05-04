/**
 * Dashboard integration tests
 * --------------------------------------------------------------------------
 * Mounts every component on /dashboard with mocked ApiService responses and
 * asserts that
 *   1. the right backend endpoints get called,
 *   2. the data those endpoints return ends up rendered.
 *
 * Each component is mounted in isolation here (rather than the whole
 * DashboardPage) so we don't have to bring up the full layout chain
 * (Protected → NotificationProvider → Sidebar etc.) for tests that are
 * really just about API contract.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------
const apiMocks = {
  wallet: {
    getSummary: vi.fn(),
    getTransactions: vi.fn(),
  },
  communities: {
    joined: vi.fn(),
    getBills: vi.fn(),
    getPosts: vi.fn(),
    getMembers: vi.fn(),
  },
  verification: {
    getStatus: vi.fn(),
  },
  events: {
    list: vi.fn(),
  },
  discovery: {
    trending: vi.fn(),
  },
};

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

// next/link → bare anchor; next/navigation → no-op router/path
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));

// useUserData reads from localStorage; provide a stub so WelcomeHero shows
// a real name.
vi.mock('@/hooks/useUserData', () => ({
  default: () => ({ firstname: 'Sam', full_name: 'Sam Tester', avatar: null }),
}));

// Lazy import the components AFTER mocks are wired.
async function importComponents() {
  const [
    verificationMod,
    welcomeMod,
    overviewMod,
    pendingMod,
    myCommunitiesMod,
    postFeedMod,
    trendingMod,
    ongoingMod,
    newMembersMod,
  ] = await Promise.all([
    import('@/components/dashboard/VerificationNotice'),
    import('@/components/dashboard/WelcomeHero'),
    import('@/components/dashboard/OverviewMetrics'),
    import('@/components/dashboard/PendingActions'),
    import('@/components/dashboard/MyCommunities'),
    import('@/components/dashboard/PostFeed'),
    import('@/components/dashboard/TrendingTopics'),
    import('@/components/dashboard/OngoingEvents'),
    import('@/components/dashboard/NewMembers'),
  ]);
  return {
    VerificationNotice: verificationMod.default,
    WelcomeHero: welcomeMod.WelcomeHero,
    OverviewMetrics: overviewMod.OverviewMetrics,
    PendingActions: pendingMod.PendingActions,
    MyCommunities: myCommunitiesMod.MyCommunities,
    PostFeed: postFeedMod.default,
    TrendingTopics: trendingMod.default,
    OngoingEvents: ongoingMod.default,
    NewMembers: newMembersMod.default,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const fakeCommunity = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  name: 'Lekki HOA',
  description: 'Test community',
  visibility: 'public',
  is_joined: true,
  member_count: 12,
  ...overrides,
});

const fakeBill = (overrides: Record<string, unknown> = {}) => ({
  id: 100,
  community_id: 10,
  creator_id: 1,
  title: 'Estate dues',
  amount: 18500,
  status: 'active',
  due_date: new Date(Date.now() - 2 * 86_400_000).toISOString(), // 2 days ago
  is_recurring: false,
  ...overrides,
});

beforeEach(() => {
  // Default-quiet responses so individual tests only override what matters.
  apiMocks.wallet.getSummary.mockResolvedValue({
    data: { data: { wallet: { balance: 0, currency: 'NGN' } } },
  });
  apiMocks.wallet.getTransactions.mockResolvedValue({
    data: { data: { transactions: [] } },
  });
  apiMocks.communities.joined.mockResolvedValue({
    data: { data: { communities: [] } },
  });
  apiMocks.communities.getBills.mockResolvedValue({
    data: { data: { bills: [] } },
  });
  apiMocks.communities.getPosts.mockResolvedValue({
    data: { data: { posts: [] } },
  });
  apiMocks.communities.getMembers.mockResolvedValue({
    data: { data: { members: [] } },
  });
  apiMocks.verification.getStatus.mockResolvedValue({
    data: { data: { verified: false, verification_type: null, status: 'not_started' } },
  });
  apiMocks.events.list.mockResolvedValue({
    data: { data: { events: [] } },
  });
  apiMocks.discovery.trending.mockResolvedValue({
    data: { data: { topics: [] } },
  });
  pushMock.mockReset();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  for (const group of Object.values(apiMocks)) {
    for (const fn of Object.values(group)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
});

// ---------------------------------------------------------------------------
// VerificationNotice
// ---------------------------------------------------------------------------
describe('VerificationNotice', () => {
  it('hits /v2/verification/status on mount', async () => {
    // Seed localStorage to ensure the banner shows before the API resolves.
    window.localStorage.setItem(
      'verification_data',
      JSON.stringify({ bvn_verified: false, nin_verified: false }),
    );
    const { VerificationNotice } = await importComponents();
    render(<VerificationNotice />);
    await waitFor(() => {
      expect(apiMocks.verification.getStatus).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the banner with both BVN and NIN unverified when API says not_started', async () => {
    window.localStorage.setItem(
      'verification_data',
      JSON.stringify({ bvn_verified: false, nin_verified: false }),
    );
    const { VerificationNotice } = await importComponents();
    render(<VerificationNotice />);
    await waitFor(() => {
      expect(screen.getByText(/Complete your verification/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /Verify BVN/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Verify NIN/i })).toBeEnabled();
  });

  it('hides the banner when API confirms BVN+NIN both verified', async () => {
    window.localStorage.setItem(
      'verification_data',
      JSON.stringify({ bvn_verified: true, nin_verified: true }),
    );
    apiMocks.verification.getStatus.mockResolvedValue({
      data: { data: { verified: true, verification_type: 'bvn', status: 'verified' } },
    });
    const { VerificationNotice } = await importComponents();
    const { container } = render(<VerificationNotice />);
    // Should render nothing when both flags are true (component returns null).
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// OverviewMetrics
// ---------------------------------------------------------------------------
describe('OverviewMetrics', () => {
  it('calls wallet summary, transactions, and joined communities in parallel', async () => {
    const { OverviewMetrics } = await importComponents();
    render(<OverviewMetrics />);
    await waitFor(() => {
      expect(apiMocks.wallet.getSummary).toHaveBeenCalledTimes(1);
      expect(apiMocks.wallet.getTransactions).toHaveBeenCalledWith({ limit: 200 });
      expect(apiMocks.communities.joined).toHaveBeenCalledWith({ limit: 50 });
    });
  });

  it('renders the wallet balance returned by the API', async () => {
    apiMocks.wallet.getSummary.mockResolvedValue({
      data: { data: { wallet: { balance: '42500.00', currency: 'NGN' } } },
    });
    const { OverviewMetrics } = await importComponents();
    render(<OverviewMetrics />);
    await waitFor(() => {
      expect(screen.getByText('42,500.00')).toBeInTheDocument();
    });
  });

  it('sums weekly in/out from transactions in the last 7 days only', async () => {
    const recent = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1d ago
    const old = new Date(Date.now() - 30 * 86_400_000).toISOString(); // 30d ago
    apiMocks.wallet.getTransactions.mockResolvedValue({
      data: {
        data: {
          transactions: [
            { signed_amount: 50000, status: 'successful', completed_at: recent },
            { signed_amount: -20000, status: 'successful', completed_at: recent },
            { signed_amount: 99999, status: 'successful', completed_at: old }, // ignored — outside window
            { signed_amount: 1000, status: 'pending', completed_at: recent }, // ignored — not successful
          ],
        },
      },
    });
    const { OverviewMetrics } = await importComponents();
    render(<OverviewMetrics />);
    await waitFor(() => {
      expect(screen.getByText('+₦50,000.00')).toBeInTheDocument();
    });
    expect(screen.getByText('−₦20,000.00')).toBeInTheDocument();
  });

  it('aggregates bills_due across joined communities, ignoring paid/cancelled', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity({ id: 10 }), fakeCommunity({ id: 11, name: 'Runners' })] } },
    });
    apiMocks.communities.getBills.mockImplementation(async (id: number) => ({
      data: {
        data: {
          bills:
            id === 10
              ? [fakeBill({ id: 100, amount: 5000 }), fakeBill({ id: 101, amount: 3000, status: 'paid' })]
              : [fakeBill({ id: 102, amount: 2000 })],
        },
      },
    }));
    const { OverviewMetrics } = await importComponents();
    render(<OverviewMetrics />);
    // 5000 + 2000 = 7000 across 2 active bills
    await waitFor(() => {
      expect(screen.getByText('7,000.00')).toBeInTheDocument();
    });
    expect(screen.getByText('2 pending')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// PendingActions
// ---------------------------------------------------------------------------
describe('PendingActions', () => {
  it('shows verification CTA when /v2/verification/status returns verified=false', async () => {
    apiMocks.verification.getStatus.mockResolvedValue({
      data: { data: { verified: false, status: 'not_started' } },
    });
    const { PendingActions } = await importComponents();
    render(<PendingActions />);
    await waitFor(() => {
      expect(
        screen.getByText(/Verify your identity to unlock the wallet/i),
      ).toBeInTheDocument();
    });
  });

  it('lists overdue bills aggregated across joined communities', async () => {
    apiMocks.verification.getStatus.mockResolvedValue({
      data: { data: { verified: true, status: 'verified' } },
    });
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity({ id: 10, name: 'Lekki HOA' })] } },
    });
    apiMocks.communities.getBills.mockResolvedValue({
      data: {
        data: {
          bills: [fakeBill({ id: 100, title: 'April dues', amount: 18500 })],
        },
      },
    });
    const { PendingActions } = await importComponents();
    render(<PendingActions />);
    await waitFor(() => {
      expect(screen.getByText(/April dues/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Lekki HOA/)).toBeInTheDocument();
    expect(screen.getByText(/18,500.00/)).toBeInTheDocument();
  });

  it('renders nothing when verified + no overdue bills + nothing dismissed', async () => {
    apiMocks.verification.getStatus.mockResolvedValue({
      data: { data: { verified: true, status: 'verified' } },
    });
    const { PendingActions } = await importComponents();
    const { container } = render(<PendingActions />);
    // After loading completes, the section should hide entirely.
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
// MyCommunities
// ---------------------------------------------------------------------------
describe('MyCommunities', () => {
  it('calls /v2/community/joined and renders the returned circles', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: {
        data: {
          communities: [
            fakeCommunity({ id: 10, name: 'Lekki HOA' }),
            fakeCommunity({ id: 11, name: 'Cryptos NG' }),
          ],
        },
      },
    });
    const { MyCommunities } = await importComponents();
    render(<MyCommunities />);
    await waitFor(() => {
      expect(apiMocks.communities.joined).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByText('Lekki HOA')).toBeInTheDocument();
    });
    expect(screen.getByText('Cryptos NG')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// PostFeed
// ---------------------------------------------------------------------------
describe('PostFeed', () => {
  it('walks joined communities and fetches posts for each', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: {
        data: {
          communities: [fakeCommunity({ id: 10 }), fakeCommunity({ id: 11 })],
        },
      },
    });
    apiMocks.communities.getPosts.mockResolvedValue({
      data: { data: { posts: [] } },
    });
    const { PostFeed } = await importComponents();
    render(<PostFeed />);
    await waitFor(() => {
      expect(apiMocks.communities.joined).toHaveBeenCalled();
    });
    // One getPosts call per joined community.
    await waitFor(() => {
      expect(apiMocks.communities.getPosts).toHaveBeenCalledTimes(2);
    });
    expect(apiMocks.communities.getPosts).toHaveBeenCalledWith(
      10,
      expect.objectContaining({}),
    );
    expect(apiMocks.communities.getPosts).toHaveBeenCalledWith(
      11,
      expect.objectContaining({}),
    );
  });
});

// ---------------------------------------------------------------------------
// TrendingTopics
// ---------------------------------------------------------------------------
describe('TrendingTopics', () => {
  it('renders the topics returned by /v2/discovery/trending', async () => {
    apiMocks.discovery.trending.mockResolvedValue({
      data: {
        data: {
          topics: [
            { tag: 'estate-dues', category: 'Real estate', posts: 184, velocity: 'rising', community_ids: [] },
            { tag: 'crypto-academy', category: 'Finance', posts: 96, velocity: 'steady', community_ids: [] },
          ],
        },
      },
    });
    const { TrendingTopics } = await importComponents();
    render(<TrendingTopics />);
    await waitFor(() => {
      expect(apiMocks.discovery.trending).toHaveBeenCalledWith({ limit: 5 });
    });
    await waitFor(() => {
      expect(screen.getByText(/estate-dues/)).toBeInTheDocument();
    });
    expect(screen.getByText(/crypto-academy/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// OngoingEvents
// ---------------------------------------------------------------------------
describe('OngoingEvents', () => {
  it('renders events returned by /v2/events/?scope=all', async () => {
    apiMocks.events.list.mockResolvedValue({
      data: {
        data: {
          events: [
            {
              id: 1,
              community_id: 10,
              creator_id: 1,
              title: 'Crypto academy week 5',
              description: 'desc',
              category: 'Education',
              starts_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
              ends_at: null,
              duration_label: '2 hr',
              location: 'Online',
              is_online: true,
              is_private: false,
              capacity: 150,
              ticket_price: null,
              cover_image: null,
              community_name: 'Cryptos NG',
              community_initial: 'C',
              status: 'upcoming',
              attendees: 12,
              is_attending: false,
              is_hosting: false,
              created_at: new Date().toISOString(),
              updated_at: null,
            },
          ],
        },
      },
    });
    const { OngoingEvents } = await importComponents();
    render(<OngoingEvents />);
    await waitFor(() => {
      expect(apiMocks.events.list).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'all' }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/Crypto academy week 5/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// NewMembers (regression: was rendering MOCK constant instead of fetched list)
// ---------------------------------------------------------------------------
describe('NewMembers', () => {
  it('renders the members fetched from joined communities (not the seed)', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity({ id: 10, name: 'Real Circle' })] } },
    });
    apiMocks.communities.getMembers.mockResolvedValue({
      data: {
        data: {
          members: [
            {
              user_id: 99,
              joined_at: new Date().toISOString(),
              community_id: 10,
              user: { id: 99, firstname: 'Adaeze', lastname: 'Mbakwe', bio: null, profile_photo: null },
            },
          ],
        },
      },
    });
    const { NewMembers } = await importComponents();
    render(<NewMembers />);
    await waitFor(() => {
      expect(apiMocks.communities.getMembers).toHaveBeenCalled();
    });
    await waitFor(() => {
      // Real fetched name shows up.
      expect(screen.getByText(/Adaeze Mbakwe/)).toBeInTheDocument();
    });
    // Hardcoded MOCK names ("Sherifat Mobolaji", etc.) should NOT appear when API returns real data.
    expect(screen.queryByText(/Sherifat Mobolaji/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// WelcomeHero — no API call, just user-data + navigation; smoke test.
// ---------------------------------------------------------------------------
describe('WelcomeHero', () => {
  it('renders the user firstname from useUserData', async () => {
    const { WelcomeHero } = await importComponents();
    render(<WelcomeHero />);
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(within(heading).getByText(/Sam/)).toBeInTheDocument();
    });
  });
});
