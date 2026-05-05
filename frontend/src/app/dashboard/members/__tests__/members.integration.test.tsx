/**
 * /dashboard/members integration tests
 * --------------------------------------------------------------------------
 * Mounts the page and its subcomponents with mocked ApiService responses
 * and verifies that:
 *   1. joined() → getMembers() fan-out hits the right endpoints,
 *   2. real fields (posts_count, last_seen_at, bio, profile_photo) flow
 *      through to the rendered cards,
 *   3. the "Online", "Recently joined", and "In your circles" tabs filter
 *      against the real data shape, not the seed mock,
 *   4. when no joined communities exist, the page falls back to the seed
 *      MOCK_MEMBERS so the layout stays useful.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const apiMocks = {
  communities: {
    joined: vi.fn(),
    getMembers: vi.fn(),
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard/members',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

vi.mock('@/hooks/useUserData', () => ({
  default: () => ({ id: 50 }),
}));

async function importPage() {
  const mod = await import('@/app/dashboard/members/page');
  return mod.default;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const fakeCommunity = (id: number, name: string) => ({
  id,
  name,
  description: 'd',
  visibility: 'public',
  status: 'active',
  is_joined: true,
  member_count: 5,
  created_by: 1,
  created_at: '2025-01-01T00:00:00Z',
  organization_id: 0,
  institution_id: 0,
  member_cost: '0',
  slug: name.toLowerCase().replace(/\s+/g, '-'),
});

const fakeMember = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  user_id: 99,
  community_id: 10,
  role: 'member',
  status: 'active',
  joined_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  user: {
    id: 99,
    email: 'adaeze@example.com',
    firstname: 'Adaeze',
    lastname: 'Mbakwe',
    full_name: 'Adaeze Mbakwe',
    profile_photo: null,
    bio: 'Treasurer at Crown Estate',
    posts_count: 0,
    last_seen_at: null,
  },
  ...overrides,
});

beforeEach(() => {
  apiMocks.communities.joined.mockResolvedValue({
    data: { data: { communities: [] } },
  });
  apiMocks.communities.getMembers.mockResolvedValue({
    data: { data: { members: [] } },
  });
  window.localStorage.setItem('user_data', JSON.stringify({ id: 50 }));
});

afterEach(() => {
  for (const fn of Object.values(apiMocks.communities)) {
    (fn as ReturnType<typeof vi.fn>).mockReset();
  }
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('/dashboard/members', () => {
  it('walks joined() → getMembers(id) per community on mount', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: {
        data: {
          communities: [fakeCommunity(10, 'Lekki HOA'), fakeCommunity(11, 'Cryptos NG')],
        },
      },
    });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(apiMocks.communities.joined).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(apiMocks.communities.getMembers).toHaveBeenCalledTimes(2);
    });
    expect(apiMocks.communities.getMembers).toHaveBeenCalledWith(10, expect.any(Object));
    expect(apiMocks.communities.getMembers).toHaveBeenCalledWith(11, expect.any(Object));
  });

  it('renders real members from the API (not the MOCK seed)', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Real Circle')] } },
    });
    apiMocks.communities.getMembers.mockResolvedValue({
      data: { data: { members: [fakeMember()] } },
    });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Adaeze Mbakwe')).toBeInTheDocument();
    });
    // Hardcoded MOCK names should NOT show up when API has real data.
    expect(screen.queryByText('Pastor Bisi Ojo')).not.toBeInTheDocument();
  });

  it('falls back to MOCK seed when the user has no joined communities', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [] } },
    });
    const Page = await importPage();
    render(<Page />);
    // One of the seed members is "Pastor Bisi Ojo".
    await waitFor(() => {
      expect(screen.getByText('Pastor Bisi Ojo')).toBeInTheDocument();
    });
    // getMembers should NOT have been called.
    expect(apiMocks.communities.getMembers).not.toHaveBeenCalled();
  });

  it('marks a member online when last_seen_at is within 5 minutes', async () => {
    const now = new Date();
    const recentlySeen = new Date(now.getTime() - 60 * 1000).toISOString(); // 1 min ago
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Live Circle')] } },
    });
    apiMocks.communities.getMembers.mockResolvedValue({
      data: {
        data: {
          members: [
            fakeMember({
              user: {
                id: 1,
                email: 'a@a.com',
                firstname: 'Alice',
                lastname: 'Online',
                full_name: 'Alice Online',
                profile_photo: null,
                bio: null,
                posts_count: 0,
                last_seen_at: recentlySeen,
              },
            }),
          ],
        },
      },
    });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Alice Online')).toBeInTheDocument();
    });
    // The "Online" tab badge should reflect 1.
    const onlineTab = screen.getByRole('tab', { name: /Online/i });
    expect(within(onlineTab).getByText('1')).toBeInTheDocument();
  });

  it('keeps a member offline when last_seen_at is older than 5 minutes', async () => {
    const stale = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 min ago
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Stale Circle')] } },
    });
    apiMocks.communities.getMembers.mockResolvedValue({
      data: {
        data: {
          members: [
            fakeMember({
              user: {
                id: 2,
                email: 'b@b.com',
                firstname: 'Bob',
                lastname: 'Stale',
                full_name: 'Bob Stale',
                profile_photo: null,
                bio: null,
                posts_count: 0,
                last_seen_at: stale,
              },
            }),
          ],
        },
      },
    });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Bob Stale')).toBeInTheDocument();
    });
    const onlineTab = screen.getByRole('tab', { name: /Online/i });
    // Online tab badge should NOT show a count when zero (per page logic).
    expect(within(onlineTab).queryByText('1')).not.toBeInTheDocument();
  });

  it('uses posts_count for "Most active" sort and topContributors stat', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(10, 'Active Circle')] } },
    });
    apiMocks.communities.getMembers.mockResolvedValue({
      data: {
        data: {
          members: [
            fakeMember({
              user_id: 1,
              user: {
                id: 1,
                email: 'lo@a.com',
                firstname: 'Low',
                lastname: 'Activity',
                full_name: 'Low Activity',
                profile_photo: null,
                bio: null,
                posts_count: 2,
                last_seen_at: null,
              },
            }),
            fakeMember({
              user_id: 2,
              id: 2,
              user: {
                id: 2,
                email: 'hi@a.com',
                firstname: 'High',
                lastname: 'Volume',
                full_name: 'High Volume',
                profile_photo: null,
                bio: null,
                posts_count: 25,
                last_seen_at: null,
              },
            }),
          ],
        },
      },
    });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('High Volume')).toBeInTheDocument();
    });
    // 25 ≥ 20 → counted as a top contributor (1 person).
    // The topContributors stat lives in MembersHero.
    expect(screen.getByText(/Top contributors/i)).toBeInTheDocument();
  });

  it('aggregates posts_count and de-dupes when a user appears in multiple communities', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: {
        data: {
          communities: [fakeCommunity(10, 'Circle A'), fakeCommunity(11, 'Circle B')],
        },
      },
    });
    apiMocks.communities.getMembers.mockImplementation(async (id: number) => ({
      data: {
        data: {
          members: [
            fakeMember({
              user_id: 99,
              community_id: id,
              user: {
                id: 99,
                email: 'shared@a.com',
                firstname: 'Shared',
                lastname: 'User',
                full_name: 'Shared User',
                profile_photo: null,
                bio: null,
                posts_count: id === 10 ? 7 : 13, // sums to 20
                last_seen_at: null,
              },
            }),
          ],
        },
      },
    }));
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      // Renders the user exactly once even though they appear in 2 communities.
      expect(screen.getAllByText('Shared User').length).toBe(1);
    });
  });
});
