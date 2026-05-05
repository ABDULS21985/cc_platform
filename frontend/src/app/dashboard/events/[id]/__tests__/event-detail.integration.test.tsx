/**
 * /dashboard/events/[id] integration tests
 * --------------------------------------------------------------------------
 * Verifies the event-details data flow:
 *   1. reads :id from useParams and fetches /v2/events/{id} on mount,
 *   2. renders the real event title/location/date,
 *   3. shows an empty-state when /v2/events/{id} 404s,
 *   4. clicking "Join event" on a free event hits POST /v2/events/{id}/attend,
 *   5. clicking "You're going" hits DELETE /v2/events/{id}/attend,
 *   6. for paid events, clicking "Get ticket" opens PaymentDialog;
 *      confirming inside the dialog hits attend.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const apiMocks = {
  events: {
    get: vi.fn(),
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
  usePathname: () => '/dashboard/events/42',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ id: '42' }),
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
  const mod = await import('@/app/dashboard/events/[id]/EventDetailsClient');
  return mod.default;
}

const fakeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 42,
  community_id: 10,
  creator_id: 99,
  title: 'AGM · Q2 review',
  description: 'Quarterly review',
  category: 'Admin',
  starts_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
  ends_at: null,
  duration_label: '2 hr',
  location: 'Block 3 Clubhouse',
  is_online: false,
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
  apiMocks.events.get.mockResolvedValue({ data: { data: { event: fakeEvent() } } });
  apiMocks.events.attend.mockResolvedValue({
    data: { data: { event: fakeEvent({ is_attending: true }) } },
  });
  apiMocks.events.cancelAttendance.mockResolvedValue({
    data: { data: { event: fakeEvent({ is_attending: false }) } },
  });
  window.localStorage.setItem('user_data', JSON.stringify({ id: 50 }));
});

afterEach(() => {
  for (const fn of Object.values(apiMocks.events)) {
    (fn as ReturnType<typeof vi.fn>).mockReset();
  }
});

describe('/dashboard/events/[id]', () => {
  it('fetches the event by id from the URL', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(apiMocks.events.get).toHaveBeenCalledWith(42);
    });
  });

  it('renders the real event title/location/host', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('AGM · Q2 review')).toBeInTheDocument();
    });
    expect(screen.getByText('Block 3 Clubhouse')).toBeInTheDocument();
    expect(screen.getAllByText(/Lekki HOA/).length).toBeGreaterThan(0);
  });

  it('shows an empty-state when /v2/events/{id} 404s', async () => {
    apiMocks.events.get.mockRejectedValue({ response: { status: 404 } });
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText(/Could not load event/i)).toBeInTheDocument();
    });
  });

  it('clicking "Join event" on a free event hits attend', async () => {
    apiMocks.events.get.mockResolvedValue({
      data: { data: { event: fakeEvent({ ticket_price: null, is_attending: false }) } },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('AGM · Q2 review')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Join event/i }));

    await waitFor(() => {
      expect(apiMocks.events.attend).toHaveBeenCalledWith(42);
    });
  });

  it('clicking "You\'re going" cancels attendance', async () => {
    apiMocks.events.get.mockResolvedValue({
      data: { data: { event: fakeEvent({ is_attending: true }) } },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('AGM · Q2 review')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /You're going/i }));

    await waitFor(() => {
      expect(apiMocks.events.cancelAttendance).toHaveBeenCalledWith(42);
    });
  });

  it('paid events open PaymentDialog and confirming hits attend', async () => {
    apiMocks.events.get.mockResolvedValue({
      data: {
        data: { event: fakeEvent({ ticket_price: '5000', is_attending: false }) },
      },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('AGM · Q2 review')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Get ticket/i }));

    // PaymentDialog opens; its confirm button drives commitAttendance.
    // The dialog renders a button labeled "Pay" or "Confirm" — match by accessible name.
    const confirm = await screen.findByRole('button', { name: /^Pay|^Confirm|Pay now/i });
    await user.click(confirm);

    await waitFor(() => {
      expect(apiMocks.events.attend).toHaveBeenCalledWith(42);
    });
  });
});
