/**
 * EventsRightRail integration tests
 *   1. fetches both scope=live and scope=suggested in parallel,
 *   2. renders live events when present,
 *   3. renders suggested events when present,
 *   4. shows empty-state copy when both responses are empty.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const apiMocks = {
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

const fakeEvent = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  community_id: 10,
  creator_id: 99,
  title: 'AGM live',
  description: '',
  category: null,
  starts_at: new Date(Date.now() - 5 * 60_000).toISOString(),
  ends_at: null,
  duration_label: null,
  location: 'Online',
  is_online: true,
  is_private: false,
  capacity: 0,
  ticket_price: null,
  cover_image: null,
  community_name: 'Lekki HOA',
  community_initial: 'L',
  status: 'live',
  attendees: 12,
  is_attending: false,
  is_hosting: false,
  created_at: new Date().toISOString(),
  updated_at: null,
  ...overrides,
});

beforeEach(() => {
  apiMocks.events.list.mockImplementation((params: { scope?: string } = {}) =>
    Promise.resolve({ data: { data: { events: [] } } }),
  );
});

afterEach(() => {
  apiMocks.events.list.mockReset();
});

async function importComp() {
  const mod = await import('@/components/events/EventsRightRail');
  return mod.EventsRightRail;
}

describe('EventsRightRail', () => {
  it('fetches scope=live and scope=suggested on mount', async () => {
    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(apiMocks.events.list).toHaveBeenCalledWith({ scope: 'live', limit: 5 });
    });
    expect(apiMocks.events.list).toHaveBeenCalledWith({ scope: 'suggested', limit: 5 });
  });

  it('renders live events when present', async () => {
    apiMocks.events.list.mockImplementation((params: { scope?: string } = {}) => {
      if (params.scope === 'live') {
        return Promise.resolve({
          data: { data: { events: [fakeEvent({ id: 1, title: 'Crypto class · Live' })] } },
        });
      }
      return Promise.resolve({ data: { data: { events: [] } } });
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText(/Crypto class · Live/)).toBeInTheDocument();
    });
  });

  it('renders suggested events when present', async () => {
    apiMocks.events.list.mockImplementation((params: { scope?: string } = {}) => {
      if (params.scope === 'suggested') {
        return Promise.resolve({
          data: {
            data: {
              events: [
                fakeEvent({
                  id: 2,
                  title: 'Designers mixer',
                  status: 'upcoming',
                  starts_at: new Date(Date.now() + 86_400_000 * 14).toISOString(),
                }),
              ],
            },
          },
        });
      }
      return Promise.resolve({ data: { data: { events: [] } } });
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText('Designers mixer')).toBeInTheDocument();
    });
  });

  it('shows empty copy when both lists are empty', async () => {
    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText(/Nothing live right now/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Nothing to suggest right now/i)).toBeInTheDocument();
  });
});
