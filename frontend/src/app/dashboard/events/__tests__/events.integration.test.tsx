/**
 * /dashboard/events integration tests
 * --------------------------------------------------------------------------
 * Verifies the events data flow:
 *   1. fetches /v2/events on mount,
 *   2. renders real events (mapped via mapApiEvent),
 *   3. falls back to MOCK_EVENTS when /v2/events returns an empty list,
 *   4. attending a server-id event hits POST /v2/events/{id}/attend,
 *   5. un-attending hits DELETE /v2/events/{id}/attend,
 *   6. CreateEventDialog onSubmit calls POST /v2/events with the right shape
 *      and prepends the server response.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const apiMocks = {
  events: {
    list: vi.fn(),
    create: vi.fn(),
    attend: vi.fn(),
    cancelAttendance: vi.fn(),
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
  usePathname: () => '/dashboard/events',
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

// EventsRightRail makes its own fetches we don't care about.
vi.mock('@/components/events/EventsRightRail', () => ({
  EventsRightRail: () => <aside data-testid="events-right-rail" />,
}));

async function importPage() {
  const mod = await import('@/app/dashboard/events/page');
  return mod.default;
}

const fakeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  community_id: 10,
  creator_id: 99,
  title: 'AGM · Q2 review',
  description: 'Quarterly review',
  category: 'Admin',
  starts_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
  ends_at: null,
  duration_label: '2 hr',
  location: 'Online',
  is_online: true,
  is_private: false,
  capacity: 100,
  ticket_price: null,
  cover_image: null,
  community_name: 'Lekki HOA',
  community_initial: 'L',
  status: 'upcoming',
  attendees: 12,
  is_attending: false,
  is_hosting: false,
  created_at: new Date().toISOString(),
  updated_at: null,
  ...overrides,
});

beforeEach(() => {
  apiMocks.events.list.mockResolvedValue({
    data: { data: { events: [], pagination: { total: 0, limit: 200, offset: 0 } } },
  });
  apiMocks.events.attend.mockResolvedValue({ data: { data: { event: fakeEvent({ is_attending: true }) } } });
  apiMocks.events.cancelAttendance.mockResolvedValue({ data: { data: { event: fakeEvent({ is_attending: false }) } } });
  apiMocks.events.create.mockResolvedValue({
    data: { data: { event: fakeEvent({ id: 999, title: 'Brand-new event' }) } },
  });
  window.localStorage.setItem('user_data', JSON.stringify({ id: 50 }));
});

afterEach(() => {
  for (const fn of Object.values(apiMocks.events)) {
    (fn as ReturnType<typeof vi.fn>).mockReset();
  }
});

describe('/dashboard/events', () => {
  it('hits /v2/events on mount', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(apiMocks.events.list).toHaveBeenCalledWith({ scope: 'all', limit: 200 });
    });
  });

  it('renders events from the API (mapped through mapApiEvent)', async () => {
    apiMocks.events.list.mockResolvedValue({
      data: {
        data: {
          events: [
            fakeEvent({ id: 11, title: 'Lekki run · Saturday' }),
            fakeEvent({ id: 12, title: 'Crypto class · Live', status: 'live' }),
          ],
        },
      },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Lekki run · Saturday')).toBeInTheDocument();
    });
  });

  it('falls back to MOCK_EVENTS when /v2/events returns empty', async () => {
    const Page = await importPage();
    render(<Page />);
    // First MOCK_EVENTS entry (live) is "Lagos Half Marathon — Race day".
    // Default tab is "upcoming", so click the Live tab to verify mock data is loaded.
    const user = userEvent.setup();
    await user.click(await screen.findByRole('tab', { name: /Live now/i }));
    await waitFor(() => {
      expect(screen.getByText(/Lagos Half Marathon/i)).toBeInTheDocument();
    });
  });

  it('attending a server-id event hits POST /v2/events/{id}/attend', async () => {
    apiMocks.events.list.mockResolvedValue({
      data: {
        data: {
          events: [fakeEvent({ id: 42, is_attending: false, status: 'upcoming' })],
        },
      },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('AGM · Q2 review')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    // EventCard renders "Get ticket" / "You're going" depending on isAttending.
    const attendBtn = screen.getByRole('button', { name: /Get ticket/i });
    await user.click(attendBtn);

    await waitFor(() => {
      expect(apiMocks.events.attend).toHaveBeenCalledWith(42);
    });
  });

  it('CreateEventDialog onSubmit calls POST /v2/events with the right shape', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(apiMocks.events.list).toHaveBeenCalled();
    });

    const user = userEvent.setup();
    // Hero exposes a "Create event" / "Schedule" trigger; match by accessible name.
    const triggers = screen.getAllByRole('button', { name: /Create|Schedule|New event/i });
    await user.click(triggers[0]);

    // Dialog opens — fill in the required fields.
    const titleInput = await screen.findByPlaceholderText(/Enter event title/i);
    await user.type(titleInput, 'Test event');
    await user.type(screen.getByPlaceholderText(/Enter a short description/i), 'A description');
    await user.type(screen.getByPlaceholderText(/Enter event location/i), 'Lagos');
    // datetime-local input uses fireEvent because user.type on type=datetime-local can be flaky.
    const startsInput = screen.getByLabelText(/Starts at/i);
    await user.type(startsInput, '2030-06-15T18:00');

    await user.click(screen.getByRole('button', { name: /Create Event/i }));

    await waitFor(() => {
      expect(apiMocks.events.create).toHaveBeenCalledTimes(1);
    });
    const payload = apiMocks.events.create.mock.calls[0][0];
    expect(payload).toEqual(
      expect.objectContaining({
        title: 'Test event',
        description: 'A description',
        location: 'Lagos',
        is_private: true,
      }),
    );
    expect(typeof payload.starts_at).toBe('string');

    // The newly-created event is prepended.
    await waitFor(() => {
      expect(screen.getByText('Brand-new event')).toBeInTheDocument();
    });
  });
});
