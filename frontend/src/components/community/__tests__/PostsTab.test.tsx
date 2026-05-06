import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = {
  communities: {
    getPosts: vi.fn(),
    deletePost: vi.fn(),
    getPostComments: vi.fn(),
    createPostComment: vi.fn(),
    deletePostComment: vi.fn(),
    togglePostReaction: vi.fn(),
    uploadPostMedia: vi.fn(),
    getMembers: vi.fn(),
    createPost: vi.fn(),
  },
  bookmarks: {
    create: vi.fn(),
  },
};

vi.mock('@/services/api', () => ({
  ApiService: apiMocks,
}));

vi.mock('@/hooks/useAxiosError', () => ({
  toastAxiosError: vi.fn(),
}));

vi.mock('@/hooks/useUserData', () => ({
  default: () => ({ id: 99, firstname: 'Test', full_name: 'Test User' }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const fakePost = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  community_id: 10,
  author_user_id: 1,
  body: 'hello world',
  media_urls: [],
  post_type: 'post',
  status: 'active',
  is_pinned: false,
  comments_enabled: true,
  edited_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  mention_count: 0,
  comments_count: 0,
  reactions_count: 0,
  current_user_reacted: false,
  current_user_reaction_type: null,
  mentioned_user_ids: [],
  author: {
    id: 1,
    firstname: 'A',
    lastname: 'B',
    full_name: 'A B',
    profile_photo: '',
  },
  mentions: [],
  ...overrides,
});

async function importComponent() {
  const mod = await import('@/components/community/PostsTab');
  return mod.PostsTab;
}

describe('PostsTab pagination + sort', () => {
  beforeEach(() => {
    Object.values(apiMocks.communities).forEach((fn) =>
      (fn as ReturnType<typeof vi.fn>).mockReset(),
    );
    apiMocks.bookmarks.create.mockReset();
    apiMocks.communities.getPosts.mockResolvedValue({
      data: {
        data: {
          posts: [fakePost({ id: 1, body: 'one' })],
          pagination: { has_more: false, total: 1, limit: 20, offset: 0 },
        },
      },
    });
  });

  it('passes sort=recent and offset=0 on first load', async () => {
    const Comp = await importComponent();
    render(<Comp communityId={10} communityName="Lekki" />);
    await waitFor(() => {
      expect(apiMocks.communities.getPosts).toHaveBeenCalled();
    });
    expect(apiMocks.communities.getPosts).toHaveBeenLastCalledWith(10, {
      sort: 'recent',
      limit: 20,
      offset: 0,
    });
  });

  it('re-fetches from offset 0 when sort changes to popular', async () => {
    const Comp = await importComponent();
    render(<Comp communityId={10} communityName="Lekki" />);
    await waitFor(() => {
      expect(apiMocks.communities.getPosts).toHaveBeenCalledTimes(1);
    });
    const user = userEvent.setup();
    // open the sort dropdown then pick "Popular"
    await user.click(screen.getByRole('combobox'));
    const popularOption = await screen.findByText('Popular');
    await user.click(popularOption);
    await waitFor(() => {
      expect(apiMocks.communities.getPosts).toHaveBeenLastCalledWith(10, {
        sort: 'popular',
        limit: 20,
        offset: 0,
      });
    });
  });

  it('renders Load more when has_more=true and fetches the next page', async () => {
    apiMocks.communities.getPosts
      .mockResolvedValueOnce({
        data: {
          data: {
            posts: [fakePost({ id: 1, body: 'one' })],
            pagination: { has_more: true, total: 25, limit: 20, offset: 0 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            posts: [fakePost({ id: 2, body: 'two' })],
            pagination: { has_more: false, total: 25, limit: 20, offset: 20 },
          },
        },
      });

    const Comp = await importComponent();
    render(<Comp communityId={10} communityName="Lekki" />);
    await waitFor(() => {
      expect(screen.getByText('one')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    const loadMore = await screen.findByRole('button', { name: /Load more posts/i });
    await user.click(loadMore);

    await waitFor(() => {
      expect(apiMocks.communities.getPosts).toHaveBeenLastCalledWith(10, {
        sort: 'recent',
        limit: 20,
        offset: 1,
      });
    });
    await waitFor(() => {
      expect(screen.getByText('two')).toBeInTheDocument();
    });
  });
});
