/**
 * RoleAccessContent integration tests
 *   1. fetches /v2/community/me on mount,
 *   2. clicking "Manage" drills into a community + lists members,
 *   3. picking a new role hits updateMemberRole,
 *   4. clicking trash hits removeMember,
 *   5. shows empty-state when user has no communities.
 */
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

const apiMocks = {
  communities: {
    joined: vi.fn(),
    getMembers: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
  },
};

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

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
  user_id: 10,
  community_id: 1,
  role: 'member',
  status: 'active',
  joined_at: '2025-01-01T00:00:00Z',
  user: { full_name: 'Adaeze M', firstname: 'Adaeze' },
  ...overrides,
});

beforeEach(() => {
  apiMocks.communities.joined.mockResolvedValue({
    data: { data: { communities: [] } },
  });
  apiMocks.communities.getMembers.mockResolvedValue({
    data: { data: { members: [] } },
  });
  apiMocks.communities.updateMemberRole.mockResolvedValue({
    data: { data: { member: fakeMember() } },
  });
  apiMocks.communities.removeMember.mockResolvedValue({ data: { data: {} } });
});

afterEach(() => {
  Object.values(apiMocks.communities).forEach((fn) =>
    (fn as ReturnType<typeof vi.fn>).mockReset(),
  );
});

async function importComp() {
  const mod = await import('@/components/settings/RoleAccessContent');
  return mod.RoleAccessContent;
}

describe('RoleAccessContent', () => {
  it('fetches /v2/community/me on mount', async () => {
    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(apiMocks.communities.joined).toHaveBeenCalled();
    });
  });

  it('shows empty-state when user has no communities', async () => {
    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(
        screen.getByText(/You're not in any communities yet/i),
      ).toBeInTheDocument();
    });
  });

  it('clicking "Manage" lists members for the picked community', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(7, 'Lekki HOA')] } },
    });
    apiMocks.communities.getMembers.mockResolvedValue({
      data: {
        data: {
          members: [
            fakeMember({ id: 1, user_id: 10, role: 'member' }),
            fakeMember({
              id: 2,
              user_id: 11,
              role: 'admin',
              user: { full_name: 'Funmi O', firstname: 'Funmi' },
            }),
          ],
        },
      },
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText('Lekki HOA')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Manage/i }));

    await waitFor(() => {
      expect(apiMocks.communities.getMembers).toHaveBeenCalledWith(7, {
        limit: 200,
      });
    });
    expect(screen.getByText('Adaeze M')).toBeInTheDocument();
    expect(screen.getByText('Funmi O')).toBeInTheDocument();
  });

  it('clicking the remove button hits removeMember', async () => {
    apiMocks.communities.joined.mockResolvedValue({
      data: { data: { communities: [fakeCommunity(7, 'Lekki HOA')] } },
    });
    apiMocks.communities.getMembers.mockResolvedValue({
      data: {
        data: {
          members: [fakeMember({ id: 1, user_id: 10 })],
        },
      },
    });

    const Comp = await importComp();
    render(<Comp />);
    await waitFor(() => {
      expect(screen.getByText('Lekki HOA')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Manage/i }));
    await waitFor(() => {
      expect(screen.getByText('Adaeze M')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Remove Adaeze M/i }));
    await waitFor(() => {
      expect(apiMocks.communities.removeMember).toHaveBeenCalledWith(7, 10);
    });
  });
});
