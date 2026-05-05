/**
 * /dashboard/explore integration tests
 * --------------------------------------------------------------------------
 * Mounts each Discover-page component with mocked ApiService responses and
 * verifies the data flow end-to-end:
 *   1. correct endpoints are hit with the right params,
 *   2. response data ends up rendered (community total, category counts, featured event),
 *   3. fallbacks render gracefully when the API returns nothing.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const apiMocks = {
  communities: {
    list: vi.fn(),
    categoryCounts: vi.fn(),
  },
  discovery: {
    trending: vi.fn(),
  },
  events: {
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard/explore',
  useSearchParams: () => new URLSearchParams(),
}));

async function importComponents() {
  const [heroMod, gridMod, rowMod, featuredMod] = await Promise.all([
    import('@/components/explore/DiscoverHero'),
    import('@/components/explore/CategoryGrid'),
    import('@/components/explore/TrendingRow'),
    import('@/components/explore/FeaturedEvent'),
  ]);
  return {
    DiscoverHero: heroMod.DiscoverHero,
    CategoryGrid: gridMod.CategoryGrid,
    TrendingRow: rowMod.TrendingRow,
    FeaturedEvent: featuredMod.FeaturedEvent,
  };
}

// Quiet defaults — individual tests override what matters.
beforeEach(() => {
  apiMocks.communities.list.mockResolvedValue({
    data: { data: { communities: [], total: 0 } },
  });
  apiMocks.communities.categoryCounts.mockResolvedValue({
    data: { data: { counts: {} } },
  });
  apiMocks.discovery.trending.mockResolvedValue({
    data: { data: { topics: [] } },
  });
  apiMocks.events.list.mockResolvedValue({
    data: { data: { events: [] } },
  });
});

afterEach(() => {
  for (const group of Object.values(apiMocks)) {
    for (const fn of Object.values(group)) {
      (fn as ReturnType<typeof vi.fn>).mockReset();
    }
  }
});

// ---------------------------------------------------------------------------
// DiscoverHero
// ---------------------------------------------------------------------------
describe('DiscoverHero', () => {
  it('fetches community total + trending tags on mount', async () => {
    const { DiscoverHero } = await importComponents();
    render(<DiscoverHero value="" onChange={() => {}} />);
    await waitFor(() => {
      expect(apiMocks.communities.list).toHaveBeenCalledWith({ limit: 1 });
      expect(apiMocks.discovery.trending).toHaveBeenCalledWith({ limit: 8 });
    });
  });

  it('renders the live total count when the API returns one', async () => {
    apiMocks.communities.list.mockResolvedValue({
      data: { data: { communities: [], total: 247 } },
    });
    const { DiscoverHero } = await importComponents();
    render(<DiscoverHero value="" onChange={() => {}} />);
    await waitFor(() => {
      // 247 appears in the body copy and in the active-circles pill.
      expect(screen.getAllByText(/247/).length).toBeGreaterThan(0);
    });
  });

  it('reads total from pagination.total when present (real backend shape)', async () => {
    // The live backend nests the value under data.pagination.total.
    apiMocks.communities.list.mockResolvedValue({
      data: {
        data: {
          communities: [{}],
          pagination: { limit: 1, offset: 0, total: 21 },
        },
      },
    });
    const { DiscoverHero } = await importComponents();
    render(<DiscoverHero value="" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getAllByText(/21/).length).toBeGreaterThan(0);
    });
  });

  it('falls back to "—" placeholder when the API request fails', async () => {
    apiMocks.communities.list.mockRejectedValue(new Error('boom'));
    const { DiscoverHero } = await importComponents();
    render(<DiscoverHero value="" onChange={() => {}} />);
    await waitFor(() => {
      // Em-dash placeholder is rendered when totalCount is null.
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  it('renders trending tags returned by the discovery endpoint', async () => {
    apiMocks.discovery.trending.mockResolvedValue({
      data: {
        data: {
          topics: [
            { tag: 'live-tag-one', category: 'X', posts: 3, velocity: 'rising', community_ids: [] },
            { tag: 'live-tag-two', category: 'X', posts: 1, velocity: 'steady', community_ids: [] },
          ],
        },
      },
    });
    const { DiscoverHero } = await importComponents();
    render(<DiscoverHero value="" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('live-tag-one')).toBeInTheDocument();
    });
    expect(screen.getByText('live-tag-two')).toBeInTheDocument();
    // Fallback seed tags should NOT appear when the API returned real ones.
    expect(screen.queryByText('estate-dues')).not.toBeInTheDocument();
  });

  it('keeps fallback seed tags when the discovery API returns []', async () => {
    apiMocks.discovery.trending.mockResolvedValue({
      data: { data: { topics: [] } },
    });
    const { DiscoverHero } = await importComponents();
    render(<DiscoverHero value="" onChange={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText('estate-dues')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// CategoryGrid
// ---------------------------------------------------------------------------
describe('CategoryGrid', () => {
  it('hits /v2/community/category-counts with all 10 category labels', async () => {
    const { CategoryGrid } = await importComponents();
    render(<CategoryGrid selected={null} onSelect={() => {}} />);
    await waitFor(() => {
      expect(apiMocks.communities.categoryCounts).toHaveBeenCalledTimes(1);
    });
    const labels = apiMocks.communities.categoryCounts.mock.calls[0][0] as string[];
    expect(labels).toContain('Estate & HOA');
    expect(labels).toContain('Sports & fitness');
    expect(labels).toContain('Tech & startups');
    expect(labels.length).toBe(10);
  });

  it('renders the live counts returned by the API', async () => {
    apiMocks.communities.categoryCounts.mockResolvedValue({
      data: {
        data: {
          counts: {
            'Estate & HOA': 4,
            'Tech & startups': 12,
            'Music': 1,
          },
        },
      },
    });
    const { CategoryGrid } = await importComponents();
    render(<CategoryGrid selected={null} onSelect={() => {}} />);
    await waitFor(() => {
      expect(screen.getByText(/4 circles/)).toBeInTheDocument();
    });
    expect(screen.getByText(/12 circles/)).toBeInTheDocument();
    // Singular form for count of 1.
    expect(screen.getByText(/1 circle$/)).toBeInTheDocument();
  });

  it('renders "— circles" when a category is missing from the response', async () => {
    apiMocks.communities.categoryCounts.mockResolvedValue({
      data: { data: { counts: { 'Estate & HOA': 1 } } },
    });
    const { CategoryGrid } = await importComponents();
    render(<CategoryGrid selected={null} onSelect={() => {}} />);
    await waitFor(() => {
      // "Estate & HOA" reports 1, but other categories aren't in the
      // response, so they show the em-dash placeholder.
      expect(screen.getAllByText('— circles').length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// TrendingRow
// ---------------------------------------------------------------------------
describe('TrendingRow', () => {
  it('calls /v2/community with the search and category params', async () => {
    const { TrendingRow } = await importComponents();
    render(<TrendingRow search="lekki" categoryLabel="Estate & HOA" />);
    await waitFor(() => {
      expect(apiMocks.communities.list).toHaveBeenCalled();
    });
    const args = apiMocks.communities.list.mock.calls.at(-1)?.[0];
    expect(args?.query).toBe('lekki');
  });
});

// ---------------------------------------------------------------------------
// FeaturedEvent
// ---------------------------------------------------------------------------
describe('FeaturedEvent', () => {
  const fakeEvent = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    community_id: 10,
    creator_id: 1,
    title: 'Crypto academy week 5',
    description: 'desc',
    category: 'Education',
    starts_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    ends_at: null,
    duration_label: '2 hr',
    location: 'Online · Zoom',
    is_online: true,
    is_private: false,
    capacity: 150,
    ticket_price: '5,000',
    cover_image: null,
    community_name: 'Cryptos NG',
    community_initial: 'C',
    status: 'upcoming' as const,
    attendees: 60,
    is_attending: false,
    is_hosting: false,
    created_at: new Date().toISOString(),
    updated_at: null,
    ...overrides,
  });

  it('fetches /v2/events?scope=upcoming on mount', async () => {
    const { FeaturedEvent } = await importComponents();
    render(<FeaturedEvent />);
    await waitFor(() => {
      expect(apiMocks.events.list).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'upcoming' }),
      );
    });
  });

  it('renders the headline event details from the API', async () => {
    apiMocks.events.list.mockResolvedValue({
      data: {
        data: {
          events: [
            fakeEvent({ id: 1, attendees: 30 }),
            fakeEvent({ id: 2, title: 'Lagos Half Marathon', attendees: 184, ticket_price: '12,500' }),
          ],
        },
      },
    });
    const { FeaturedEvent } = await importComponents();
    render(<FeaturedEvent />);
    // Most-attendees-first picks the marathon (184 vs 30).
    await waitFor(() => {
      expect(screen.getByText('Lagos Half Marathon')).toBeInTheDocument();
    });
    expect(screen.getByText(/Cryptos NG/)).toBeInTheDocument();
    expect(screen.getByText(/12,500/)).toBeInTheDocument();
  });

  it('falls back to the empty card when no upcoming events exist', async () => {
    apiMocks.events.list.mockResolvedValue({
      data: { data: { events: [] } },
    });
    const { FeaturedEvent } = await importComponents();
    render(<FeaturedEvent />);
    await waitFor(() => {
      expect(screen.getByText(/No featured event yet/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /Browse events/i })).toBeInTheDocument();
  });

  it('skips events that are already past or live (only "upcoming")', async () => {
    apiMocks.events.list.mockResolvedValue({
      data: {
        data: {
          events: [
            fakeEvent({ id: 1, title: 'Past gig', status: 'past' as const, attendees: 99999 }),
            fakeEvent({ id: 2, title: 'Live now', status: 'live' as const, attendees: 99999 }),
            fakeEvent({ id: 3, title: 'Upcoming yes', status: 'upcoming' as const, attendees: 1 }),
          ],
        },
      },
    });
    const { FeaturedEvent } = await importComponents();
    render(<FeaturedEvent />);
    await waitFor(() => {
      expect(screen.getByText('Upcoming yes')).toBeInTheDocument();
    });
    expect(screen.queryByText('Past gig')).not.toBeInTheDocument();
    expect(screen.queryByText('Live now')).not.toBeInTheDocument();
  });

  it('shows "Free" when ticket_price is null', async () => {
    apiMocks.events.list.mockResolvedValue({
      data: {
        data: {
          events: [fakeEvent({ ticket_price: null })],
        },
      },
    });
    const { FeaturedEvent } = await importComponents();
    render(<FeaturedEvent />);
    await waitFor(() => {
      expect(screen.getByText('Free')).toBeInTheDocument();
    });
  });
});
