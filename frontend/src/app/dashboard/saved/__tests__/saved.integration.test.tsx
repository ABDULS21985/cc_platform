/**
 * /dashboard/saved integration tests
 * --------------------------------------------------------------------------
 * Verifies the bookmarks data flow:
 *   1. fetches /v2/bookmarks on mount,
 *   2. renders real bookmarks (mapped via mapApiBookmark),
 *   3. falls back to MOCK when the API returns an empty list,
 *   4. clicking trash on a server-id row calls /v2/bookmarks DELETE,
 *   5. mock-mode rows never hit the delete endpoint.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const apiMocks = {
  bookmarks: {
    list: vi.fn(),
    delete: vi.fn(),
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
  usePathname: () => '/dashboard/saved',
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
  const mod = await import('@/app/dashboard/saved/page');
  return mod.default;
}

const fakeBookmark = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  user_id: 50,
  kind: 'post',
  target_ref: 'post:1',
  title: 'Saved post',
  description: 'A bookmark',
  source: 'Cryptos NG',
  href: '/dashboard',
  amount: null,
  community: { id: '6', name: 'Cryptos NG' },
  savedAt: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: null,
  ...overrides,
});

beforeEach(() => {
  apiMocks.bookmarks.list.mockResolvedValue({
    data: { data: { bookmarks: [], pagination: { total: 0, limit: 100, offset: 0 } } },
  });
  apiMocks.bookmarks.delete.mockResolvedValue({ data: { data: { deleted: true } } });
  window.localStorage.setItem('user_data', JSON.stringify({ id: 50 }));
});

afterEach(() => {
  for (const fn of Object.values(apiMocks.bookmarks)) {
    (fn as ReturnType<typeof vi.fn>).mockReset();
  }
});

describe('/dashboard/saved', () => {
  it('hits /v2/bookmarks on mount', async () => {
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(apiMocks.bookmarks.list).toHaveBeenCalledWith({ limit: 100 });
    });
  });

  it('renders bookmarks from the API (mapped through mapApiBookmark)', async () => {
    apiMocks.bookmarks.list.mockResolvedValue({
      data: {
        data: {
          bookmarks: [
            fakeBookmark({ id: 11, kind: 'event', title: 'Lekki run · Saturday' }),
            fakeBookmark({ id: 12, kind: 'bill', title: 'May co-op contribution', amount: '8,000' }),
          ],
        },
      },
    });

    const Page = await importPage();
    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Lekki run · Saturday')).toBeInTheDocument();
    });
    expect(screen.getByText('May co-op contribution')).toBeInTheDocument();
    expect(screen.getByText('₦8,000')).toBeInTheDocument();
    // The MOCK fixture's first item should NOT render (real list takes over).
    expect(screen.queryByText(/Week 4 reading list/)).not.toBeInTheDocument();
  });

  it('falls back to MOCK when /v2/bookmarks returns an empty list', async () => {
    const Page = await importPage();
    render(<Page />);
    // First MOCK title
    await waitFor(() => {
      expect(screen.getByText(/Week 4 reading list/)).toBeInTheDocument();
    });
  });

  it('deleting a server-side bookmark fires /v2/bookmarks DELETE', async () => {
    apiMocks.bookmarks.list.mockResolvedValue({
      data: {
        data: {
          bookmarks: [fakeBookmark({ id: 77, title: 'Server bookmark' })],
        },
      },
    });

    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Server bookmark')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const trash = screen.getByRole('button', {
      name: /Remove Server bookmark from bookmarks/i,
    });
    await user.click(trash);

    await waitFor(() => {
      expect(apiMocks.bookmarks.delete).toHaveBeenCalledWith(77);
    });
  });

  it('deleting in mock-fallback mode never hits the delete endpoint', async () => {
    // Empty list → page falls back to MOCK
    const Page = await importPage();
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText(/Week 4 reading list/)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const trash = screen.getByRole('button', {
      name: /Remove Week 4 reading list — DeFi basics from bookmarks/i,
    });
    await user.click(trash);

    // Removed locally but no DELETE call.
    await waitFor(() => {
      expect(screen.queryByText(/Week 4 reading list/)).not.toBeInTheDocument();
    });
    expect(apiMocks.bookmarks.delete).not.toHaveBeenCalled();
  });
});
