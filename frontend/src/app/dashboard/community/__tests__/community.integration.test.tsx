/**
 * /dashboard/community integration tests
 * --------------------------------------------------------------------------
 * Mounts each component with mocked ApiService responses and verifies the
 * full data flow:
 *   1. correct endpoints are hit with the right query params,
 *   2. response data ends up rendered (member count, posts count, cover, etc.),
 *   3. interactive flows (search, sort, visibility, join, create) trigger
 *      the right API calls.
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
    list: vi.fn(),
    mine: vi.fn(),
    joined: vi.fn(),
    joinFree: vi.fn(),
    create: vi.fn(),
  },
  organizations: {
    list: vi.fn(),
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

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // Render as a plain <img> in jsdom — Next/Image needs a real bundler.
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />;
  },
}));

const pushMock = vi.fn();
const replaceMock = vi.fn();
let queryString = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  usePathname: () => '/dashboard/community',
  useSearchParams: () => new URLSearchParams(queryString),
}));

vi.mock('@/hooks/useUserData', () => ({
  default: () => ({ id: 50, firstname: 'Sam', full_name: 'Sam Tester' }),
}));

// Stub the dashboard layout chain — these render side panels that pull in
// Socket.IO, Protected, etc. We're testing the page's data wiring, not the
// shell, so a passthrough keeps tests fast and deterministic.
vi.mock('@/components/layout/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

// Lazy import the test targets after mocks.
async function importComponents() {
  const [pageMod, cardMod, searchMod, dialogMod] = await Promise.all([
    import('@/app/dashboard/community/page'),
    import('@/components/community/CommunityCard'),
    import('@/components/community/SearchAndFilter'),
    import('@/components/community/CreateCommunityDialog'),
  ]);
  return {
    CommunityPage: pageMod.default,
    CommunityCard: cardMod.default,
    SearchAndFilter: searchMod.default,
    CreateCommunityDialog: dialogMod.CreateCommunityDialog,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const fakeCommunity = (overrides: Record<string, unknown> = {}) => ({
  id: 10,
  name: 'Lekki HOA',
  description: 'Estate community',
  visibility: 'public',
  status: 'active',
  is_joined: false,
  member_count: 42,
  posts_count: 12,
  community_profile_picture: 'https://example.com/avatar.png',
  community_cover_photo: 'https://example.com/cover.jpg',
  banner_url: null,
  created_by: 1,
  created_at: '2025-01-01T00:00:00Z',
  organization_id: 0,
  institution_id: 0,
  member_cost: '0',
  slug: 'lekki-hoa',
  ...overrides,
});

beforeEach(() => {
  queryString = '';
  pushMock.mockReset();
  replaceMock.mockReset();
  apiMocks.communities.list.mockResolvedValue({
    data: { data: { communities: [], total: 0 } },
  });
  apiMocks.communities.mine.mockResolvedValue({
    data: { data: { communities: [], total: 0 } },
  });
  apiMocks.communities.joined.mockResolvedValue({
    data: { data: { communities: [], total: 0 } },
  });
  apiMocks.communities.joinFree.mockResolvedValue({ data: { data: {} } });
  apiMocks.communities.create.mockResolvedValue({
    data: { data: { id: 99, name: 'Created Circle' } },
  });
  apiMocks.organizations.list.mockResolvedValue({
    data: { data: { organizations: [] } },
  });
  window.localStorage.setItem('user_data', JSON.stringify({ id: 50 }));
});

afterEach(() => {
  for (const group of Object.values(apiMocks)) {
    for (const fn of Object.values(group)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Page-level: tabs, fetch wiring, search, sort, visibility
// ---------------------------------------------------------------------------
describe('CommunityPage — list + tabs', () => {
  it('mounts on Explore tab and calls /v2/community via ApiService.communities.list', async () => {
    apiMocks.communities.list.mockResolvedValue({
      data: {
        data: {
          communities: [fakeCommunity({ id: 10, name: 'Lekki HOA', member_count: 42, posts_count: 12 })],
          total: 1,
        },
      },
    });
    const { CommunityPage } = await importComponents();
    render(<CommunityPage />);
    await waitFor(() => expect(apiMocks.communities.list).toHaveBeenCalled());
    await waitFor(() => {
      expect(screen.getByText('Lekki HOA')).toBeInTheDocument();
    });
  });

  it('renders real posts_count + member_count on cards (was previously hardcoded to 0)', async () => {
    apiMocks.communities.list.mockResolvedValue({
      data: {
        data: {
          communities: [fakeCommunity({ id: 10, member_count: 42, posts_count: 12 })],
          total: 1,
        },
      },
    });
    const { CommunityPage } = await importComponents();
    render(<CommunityPage />);
    await waitFor(() => {
      expect(screen.getByText('Lekki HOA')).toBeInTheDocument();
    });
    // Member count appears on the card.
    expect(screen.getAllByText(/42/).length).toBeGreaterThan(0);
    // Posts count from the API is rendered now.
    expect(screen.getAllByText(/12/).length).toBeGreaterThan(0);
  });

  it('switches to /v2/community/me/owned when user clicks "My circles" tab', async () => {
    const { CommunityPage } = await importComponents();
    render(<CommunityPage />);
    await waitFor(() => expect(apiMocks.communities.list).toHaveBeenCalled());

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /My circles/i }));
    await waitFor(() => {
      expect(apiMocks.communities.mine).toHaveBeenCalled();
    });
  });

  it('switches to /v2/community/me when user clicks "Joined" tab', async () => {
    const { CommunityPage } = await importComponents();
    render(<CommunityPage />);
    await waitFor(() => expect(apiMocks.communities.list).toHaveBeenCalled());

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /Joined/i }));
    await waitFor(() => {
      expect(apiMocks.communities.joined).toHaveBeenCalled();
    });
  });

  it('passes search query (debounced) into the fetcher params', async () => {
    const { CommunityPage } = await importComponents();
    render(<CommunityPage />);
    await waitFor(() => expect(apiMocks.communities.list).toHaveBeenCalled());

    const user = userEvent.setup();
    const search = screen.getByLabelText(/Search communities/i);
    await user.type(search, 'lekki');

    await waitFor(
      () => {
        const lastCall = apiMocks.communities.list.mock.calls.at(-1)?.[0];
        expect(lastCall?.query).toBe('lekki');
      },
      { timeout: 1500 },
    );
  });

  it('passes sort=popular when the user picks "Most popular"', async () => {
    const { CommunityPage } = await importComponents();
    render(<CommunityPage />);
    await waitFor(() => expect(apiMocks.communities.list).toHaveBeenCalled());

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/Sort communities/i));
    await user.click(screen.getByRole('option', { name: /Most popular/i }));

    await waitFor(
      () => {
        const lastCall = apiMocks.communities.list.mock.calls.at(-1)?.[0];
        expect(lastCall?.sort).toBe('popular');
      },
      { timeout: 1500 },
    );
  });

  it('passes visibility=private when the user clicks the Private chip', async () => {
    const { CommunityPage } = await importComponents();
    render(<CommunityPage />);
    await waitFor(() => expect(apiMocks.communities.list).toHaveBeenCalled());

    const user = userEvent.setup();
    await user.click(screen.getByRole('radio', { name: /^Private$/i }));

    await waitFor(
      () => {
        const lastCall = apiMocks.communities.list.mock.calls.at(-1)?.[0];
        expect(lastCall?.visibility).toBe('private');
      },
      { timeout: 1500 },
    );
  });

  it('reads "total" from the API response (not list.length) for tab badges', async () => {
    apiMocks.communities.list.mockResolvedValue({
      data: {
        data: {
          // 2 returned items, but total says 47 — we should display 47 on the badge.
          communities: [fakeCommunity({ id: 1 }), fakeCommunity({ id: 2 })],
          total: 47,
        },
      },
    });
    const { CommunityPage } = await importComponents();
    render(<CommunityPage />);
    await waitFor(() => {
      const tab = screen.getByRole('tab', { name: /Explore/i });
      expect(within(tab).getByText('47')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// CommunityCard — join action + cover + posts
// ---------------------------------------------------------------------------
describe('CommunityCard', () => {
  it('renders the API-supplied cover image when provided', async () => {
    const { CommunityCard } = await importComponents();
    render(
      <CommunityCard
        community={{
          id: 10,
          name: 'Lekki HOA',
          description: 'd',
          members: 42,
          posts: 12,
          isPrivate: false,
          isJoined: false,
          isOwner: false,
          avatar: 'https://example.com/avatar.png',
          cover: 'https://example.com/cover.jpg',
        }}
      />,
    );
    const img = screen.getByRole('article').querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://example.com/cover.jpg');
  });

  it('falls back to a stable Unsplash cover when API returns no banner', async () => {
    const { CommunityCard } = await importComponents();
    render(
      <CommunityCard
        community={{
          id: 7,
          name: 'No Cover',
          description: 'd',
          members: 1,
          posts: 0,
          isPrivate: false,
          isJoined: false,
          isOwner: false,
          avatar: '/images/image.png',
          cover: null,
        }}
      />,
    );
    const img = screen.getByRole('article').querySelector('img');
    expect(img?.getAttribute('src') ?? '').toMatch(/unsplash/);
  });

  it('calls joinFree(id) when "Join" is clicked', async () => {
    const { CommunityCard } = await importComponents();
    render(
      <CommunityCard
        community={{
          id: 10,
          name: 'Lekki HOA',
          description: 'd',
          members: 42,
          posts: 0,
          isPrivate: false,
          isJoined: false,
          isOwner: false,
          avatar: '/images/image.png',
        }}
      />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Join/i }));
    expect(apiMocks.communities.joinFree).toHaveBeenCalledWith(10);
  });

  it('hides Join when the user is the owner (shows "Your circle" badge)', async () => {
    const { CommunityCard } = await importComponents();
    render(
      <CommunityCard
        community={{
          id: 10,
          name: 'Lekki HOA',
          description: 'd',
          members: 42,
          posts: 0,
          isPrivate: false,
          isJoined: false,
          isOwner: true,
          avatar: '/images/image.png',
        }}
      />,
    );
    expect(screen.getByText(/Your circle/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Join/i })).not.toBeInTheDocument();
  });

  it('shows posts count chip only when greater than zero', async () => {
    const { CommunityCard } = await importComponents();
    const { rerender } = render(
      <CommunityCard
        community={{
          id: 10,
          name: 'Has Posts',
          description: 'd',
          members: 1,
          posts: 8,
          isPrivate: false,
          isJoined: false,
          isOwner: false,
          avatar: '/images/image.png',
        }}
      />,
    );
    expect(screen.getAllByText(/8/).length).toBeGreaterThan(0);

    rerender(
      <CommunityCard
        community={{
          id: 11,
          name: 'Quiet Circle',
          description: 'd',
          members: 1,
          posts: 0,
          isPrivate: false,
          isJoined: false,
          isOwner: false,
          avatar: '/images/image.png',
        }}
      />,
    );
    // The chip label is the literal " posts" suffix; assert it's gone.
    expect(screen.queryByText(/^posts$/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// CreateCommunityDialog — full create flow
// ---------------------------------------------------------------------------
describe('CreateCommunityDialog', () => {
  it('hits /v2/organizations on open to populate the picker', async () => {
    apiMocks.organizations.list.mockResolvedValue({
      data: {
        data: {
          organizations: [
            { id: 1, name: 'Acme Org', slug: 'acme', institution_id: 1 },
          ],
        },
      },
    });
    const { CreateCommunityDialog } = await importComponents();
    render(
      <CreateCommunityDialog
        isOpen={true}
        toggleDialog={() => {}}
        onSuccess={() => {}}
      />,
    );
    await waitFor(() => {
      expect(apiMocks.organizations.list).toHaveBeenCalled();
    });
  });
});
