import * as React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { MuteCommunityButton } from '../MuteCommunityButton';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockListMuted = vi.fn();
const mockMuteCommunity = vi.fn();
const mockUnmuteCommunity = vi.fn();

vi.mock('@/services/api', () => ({
  ApiService: {
    notifications: {
      listMutedCommunities: () => mockListMuted(),
      muteCommunity: (id: number) => mockMuteCommunity(id),
      unmuteCommunity: (id: number) => mockUnmuteCommunity(id),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  mockListMuted.mockReset();
  mockMuteCommunity.mockReset();
  mockUnmuteCommunity.mockReset();
  mockListMuted.mockResolvedValue({ data: { data: { community_ids: [] } } });
  mockMuteCommunity.mockResolvedValue({ data: { data: { muted: true } } });
  mockUnmuteCommunity.mockResolvedValue({ data: { data: { muted: false } } });
});

describe('<MuteCommunityButton>', () => {
  it('renders nothing when invisible (non-member)', () => {
    const { container } = render(
      <MuteCommunityButton communityId={5} visible={false} />,
    );
    expect(container.firstChild).toBeNull();
    expect(mockListMuted).not.toHaveBeenCalled();
  });

  it('shows "Mute" when this community is not in the muted list', async () => {
    render(<MuteCommunityButton communityId={5} />);
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent(/^Mute$/),
    );
  });

  it('shows "Muted" when this community is already in the muted list', async () => {
    mockListMuted.mockResolvedValueOnce({
      data: { data: { community_ids: [5, 99] } },
    });
    render(<MuteCommunityButton communityId={5} />);
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent(/^Muted$/),
    );
  });

  it('toggles mute → unmute persists optimistically', async () => {
    const user = userEvent.setup();
    render(<MuteCommunityButton communityId={5} />);
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent(/^Mute$/),
    );

    await user.click(screen.getByRole('button'));
    expect(mockMuteCommunity).toHaveBeenCalledWith(5);
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent(/^Muted$/),
    );

    await user.click(screen.getByRole('button'));
    expect(mockUnmuteCommunity).toHaveBeenCalledWith(5);
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent(/^Mute$/),
    );
  });

  it('reverts state when the API call fails', async () => {
    const user = userEvent.setup();
    mockMuteCommunity.mockRejectedValueOnce(new Error('boom'));
    render(<MuteCommunityButton communityId={5} />);
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent(/^Mute$/),
    );

    await user.click(screen.getByRole('button'));
    // After failure, the optimistic flip is reversed back to "Mute".
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveTextContent(/^Mute$/),
    );
  });
});
