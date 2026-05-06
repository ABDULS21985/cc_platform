/**
 * LoginHistoryContent integration tests
 * --------------------------------------------------------------------------
 *   1. fetches /v2/auth/sessions on mount,
 *   2. renders real session rows,
 *   3. clicking "Sign out" on a row hits DELETE /v2/auth/sessions/<id>,
 *   4. clicking "Sign out everywhere else" hits DELETE /v2/auth/sessions.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const apiMocks = {
  auth: {
    sessions: {
      list: vi.fn(),
      revoke: vi.fn(),
      revokeAllOthers: vi.fn(),
    },
  },
};

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

const fakeSession = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  user_id: 50,
  device_label: 'macOS computer',
  browser: 'Chrome',
  os: 'macOS',
  ip: '105.112.40.18',
  location: null,
  last_seen_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  revoked_at: null,
  is_active: true,
  ...overrides,
});

beforeEach(() => {
  apiMocks.auth.sessions.list.mockResolvedValue({
    data: { data: { sessions: [], total: 0 } },
  });
  apiMocks.auth.sessions.revoke.mockResolvedValue({ data: { data: {} } });
  apiMocks.auth.sessions.revokeAllOthers.mockResolvedValue({
    data: { data: { revoked_count: 0 } },
  });
});

afterEach(() => {
  Object.values(apiMocks.auth.sessions).forEach((fn) =>
    (fn as ReturnType<typeof vi.fn>).mockReset(),
  );
});

async function importComp() {
  const mod = await import('@/components/settings/LoginHistoryContent');
  return mod.LoginHistoryContent;
}

describe('LoginHistoryContent', () => {
  it('fetches /v2/auth/sessions on mount', async () => {
    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(apiMocks.auth.sessions.list).toHaveBeenCalled();
    });
  });

  it('renders real sessions from the API', async () => {
    apiMocks.auth.sessions.list.mockResolvedValue({
      data: {
        data: {
          sessions: [
            fakeSession({ id: 11, device_label: 'iPhone', os: 'iOS', browser: 'Safari' }),
            fakeSession({ id: 12, device_label: 'Windows computer', browser: 'Edge' }),
          ],
        },
      },
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText(/iPhone/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Windows computer/)).toBeInTheDocument();
  });

  it('clicking "Sign out" on a row hits revoke(id)', async () => {
    apiMocks.auth.sessions.list.mockResolvedValue({
      data: { data: { sessions: [fakeSession({ id: 77 })] } },
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText(/macOS computer/)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /^Sign out$/i }));

    await waitFor(() => {
      expect(apiMocks.auth.sessions.revoke).toHaveBeenCalledWith(77);
    });
  });

  it('clicking "Sign out everywhere else" hits revokeAllOthers()', async () => {
    apiMocks.auth.sessions.list.mockResolvedValue({
      data: { data: { sessions: [fakeSession({ id: 1 })] } },
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText(/macOS computer/)).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Sign out everywhere else/i }));

    await waitFor(() => {
      expect(apiMocks.auth.sessions.revokeAllOthers).toHaveBeenCalled();
    });
  });
});
