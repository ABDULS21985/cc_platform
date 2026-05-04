'use client';

import * as React from 'react';
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { ApiService, type CommunityData } from '@/services/api';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { cn } from '@/lib/utils';

interface PostComment {
  id: number;
  author: string;
  content: string;
  time: string;
}

interface Post {
  id: number;
  author: { name: string; avatar: string; fallback: string };
  group: string;
  content: string;
  timeAgo: string;
  likes: number;
  comments: number;
  hasImages: boolean;
  images: string[];
  commentsList: PostComment[];
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const mins = Math.round((Date.now() - t) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

interface ApiPost {
  id: number;
  community_id: number;
  body?: string | null;
  media_urls?: string[];
  comments_count?: number;
  reactions_count?: number;
  created_at?: string;
  author?: {
    id?: number;
    firstname?: string;
    lastname?: string;
    full_name?: string;
    profile_photo?: string | null;
  };
}

function mapApiPost(p: ApiPost, communityName: string): Post {
  const authorName =
    p.author?.full_name ||
    [p.author?.firstname, p.author?.lastname].filter(Boolean).join(' ') ||
    'Member';
  const initial = (authorName.match(/\b\w/g) ?? ['M', 'B']).slice(0, 2).join('').toUpperCase();
  return {
    id: p.id,
    author: {
      name: `@${(p.author?.firstname ?? authorName).toLowerCase().replace(/\s+/g, '')}`,
      avatar: p.author?.profile_photo ?? '/images/image.png',
      fallback: initial,
    },
    group: communityName,
    content: p.body ?? '',
    timeAgo: relativeTime(p.created_at ?? new Date().toISOString()),
    likes: p.reactions_count ?? 0,
    comments: p.comments_count ?? 0,
    hasImages: (p.media_urls ?? []).length > 0,
    images: p.media_urls ?? [],
    commentsList: [],
  };
}

const INITIAL_POSTS: Post[] = [
  {
    id: 1,
    author: {
      name: '@aishaadwan',
      avatar:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      fallback: 'AA',
    },
    group: 'Crypto academy',
    content:
      'Beautiful day to trade #cryptocurrency #coins #money',
    timeAgo: '20m ago',
    likes: 15,
    comments: 2,
    hasImages: true,
    images: [
      'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600&auto=format&fit=crop',
    ],
    commentsList: [
      { id: 1, author: 'Jane Doe', content: 'Great insights!', time: '5m' },
      { id: 2, author: 'John Smith', content: 'Bullish on this!', time: '10m' },
    ],
  },
  {
    id: 2,
    author: {
      name: '@johnsmith',
      avatar:
        'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150',
      fallback: 'JS',
    },
    group: 'Tech Community',
    content:
      'Just finished building my first React app! #react #javascript #coding',
    timeAgo: '1h ago',
    likes: 8,
    comments: 0,
    hasImages: true,
    images: [
      'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&auto=format&fit=crop',
    ],
    commentsList: [],
  },
  {
    id: 3,
    author: {
      name: '@sarahwilson',
      avatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
      fallback: 'SW',
    },
    group: 'Design Hub',
    content: 'New UI design concepts for mobile apps #design #ui #mobile',
    timeAgo: '2h ago',
    likes: 23,
    comments: 1,
    hasImages: true,
    images: [
      'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1586717791821-3f44a5638d48?w=600&auto=format&fit=crop',
    ],
    commentsList: [
      {
        id: 101,
        author: 'Mike Ross',
        content: 'Love the color palette!',
        time: '1h',
      },
    ],
  },
];

/** Render a post body with hashtags styled as token-driven brand pills. */
function PostBody({ content }: { content: string }) {
  return (
    <p className="text-[15px] leading-relaxed text-foreground">
      {content.split(/(\s+)/).map((word, i) => {
        if (word.startsWith('#') && word.length > 1) {
          return (
            <a
              key={i}
              href="#"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              {word}
            </a>
          );
        }
        return <React.Fragment key={i}>{word}</React.Fragment>;
      })}
    </p>
  );
}

interface PostCardProps {
  post: Post;
  liked: boolean;
  commentsOpen: boolean;
  commentDraft: string;
  onLike: () => void;
  onToggleComments: () => void;
  onCommentChange: (v: string) => void;
  onCommentSubmit: () => void;
}

function PostCard({
  post,
  liked,
  commentsOpen,
  commentDraft,
  onLike,
  onToggleComments,
  onCommentChange,
  onCommentSubmit,
}: PostCardProps) {
  return (
    <Card variant="default">
      <CardContent className="space-y-4 px-5 sm:px-6">
        {/* Header */}
        <header className="flex items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={post.author.avatar} alt="" />
            <AvatarFallback>{post.author.fallback}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              {post.group}
            </p>
            <p className="text-[11px] text-muted-foreground">
              <span className="font-medium">{post.author.name}</span>
              <span aria-hidden="true"> · </span>
              <time>{post.timeAgo}</time>
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Post options"
          >
            <MoreHorizontal className="size-4" aria-hidden="true" />
          </Button>
        </header>

        {/* Body */}
        <PostBody content={post.content} />

        {/* Images */}
        {post.hasImages && post.images.length > 0 && (
          <div
            className={cn(
              'grid gap-2 overflow-hidden rounded-xl',
              post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
            )}
          >
            {post.images.map((img, idx) => (
              <div
                key={idx}
                className="overflow-hidden rounded-xl bg-muted"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img}
                  alt=""
                  className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-1 border-t border-border pt-3"
          role="group"
          aria-label="Post actions"
        >
          <button
            type="button"
            onClick={onLike}
            aria-pressed={liked}
            aria-label={`${liked ? 'Unlike' : 'Like'} (${post.likes} likes)`}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              liked
                ? 'text-destructive hover:bg-destructive/10'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Heart
              className={cn('size-4', liked && 'fill-current')}
              aria-hidden="true"
            />
            <span className="tabular-nums">{post.likes}</span>
          </button>
          <button
            type="button"
            onClick={onToggleComments}
            aria-expanded={commentsOpen}
            aria-controls={`post-${post.id}-comments`}
            aria-label={`${commentsOpen ? 'Hide' : 'Show'} comments (${post.comments})`}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MessageCircle className="size-4" aria-hidden="true" />
            <span className="tabular-nums">{post.comments}</span>
          </button>
          <button
            type="button"
            aria-label="Share post"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Share2 className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Comments */}
        <AnimatePresence initial={false}>
          {commentsOpen && (
            <motion.div
              key="comments"
              id={`post-${post.id}-comments`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              {post.commentsList.length > 0 && (
                <ul
                  role="list"
                  className="custom-scrollbar mb-3 max-h-60 space-y-2 overflow-y-auto"
                >
                  {post.commentsList.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-xl bg-muted/50 px-3 py-2"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">
                          {c.author}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {c.time}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-foreground">
                        {c.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Comment composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCommentSubmit();
          }}
          className="flex items-center gap-2"
          aria-label="Add a comment"
        >
          <Avatar className="size-8">
            <AvatarImage src="/images/image.png" alt="" />
            <AvatarFallback className="text-[10px]">Me</AvatarFallback>
          </Avatar>
          <div className="relative flex-1">
            <input
              type="text"
              value={commentDraft}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="Write a comment…"
              aria-label="Write a comment"
              className="h-10 w-full rounded-full border border-border bg-muted/40 pl-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground transition-colors hover:border-input focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            />
            <button
              type="submit"
              disabled={!commentDraft.trim()}
              aria-label="Post comment"
              className={cn(
                'absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                commentDraft.trim()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'cursor-not-allowed bg-muted text-muted-foreground'
              )}
            >
              <Send className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function PostFeedSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i} variant="default">
          <CardContent className="space-y-4 px-5 sm:px-6">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-2 w-1/4" />
              </div>
            </div>
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PostFeed() {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [likedPosts, setLikedPosts] = React.useState<Set<number>>(new Set());
  const [openComments, setOpenComments] = React.useState<Set<number>>(new Set());
  const [commentInputs, setCommentInputs] = React.useState<Record<number, string>>({});

  // Aggregate posts across the user's joined communities. Backend has no
  // unified feed endpoint yet, so we fan out and flatten.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const joinedRes = await ApiService.communities.joined({ limit: 50 });
        const joined = (joinedRes.data?.data?.communities ?? []) as CommunityData[];
        if (joined.length === 0) {
          if (!cancelled) {
            // No communities yet — show the seed posts so the dashboard feels alive.
            setPosts(INITIAL_POSTS);
          }
          return;
        }
        const lists = await Promise.all(
          joined.map(async (c) => {
            try {
              const res = await ApiService.communities.getPosts(c.id, { limit: 10 });
              const items = (res.data?.data?.posts ?? []) as unknown as ApiPost[];
              return items.map((p) => mapApiPost(p, c.name));
            } catch {
              return [] as Post[];
            }
          })
        );
        const merged = lists.flat().sort((a, b) => {
          // Sort by relative time string is unstable; fall back to id desc as a proxy.
          return b.id - a.id;
        });
        if (!cancelled) setPosts(merged.length > 0 ? merged : INITIAL_POSTS);
      } catch (err) {
        if (!cancelled) {
          toastAxiosError(err, 'Failed to load community feed.');
          setPosts(INITIAL_POSTS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleLike = (id: number) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      const wasLiked = next.has(id);
      setPosts((p) =>
        p.map((post) =>
          post.id === id
            ? { ...post, likes: post.likes + (wasLiked ? -1 : 1) }
            : post
        )
      );
      if (wasLiked) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleComments = (id: number) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitComment = (id: number) => {
    const draft = commentInputs[id];
    if (!draft?.trim()) return;
    setPosts((p) =>
      p.map((post) =>
        post.id === id
          ? {
              ...post,
              comments: post.comments + 1,
              commentsList: [
                ...post.commentsList,
                {
                  id: Date.now(),
                  author: 'You',
                  content: draft,
                  time: 'Just now',
                },
              ],
            }
          : post
      )
    );
    setCommentInputs((s) => ({ ...s, [id]: '' }));
    // Auto-open comments after posting if they were collapsed.
    setOpenComments((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          liked={likedPosts.has(post.id)}
          commentsOpen={openComments.has(post.id)}
          commentDraft={commentInputs[post.id] || ''}
          onLike={() => toggleLike(post.id)}
          onToggleComments={() => toggleComments(post.id)}
          onCommentChange={(v) =>
            setCommentInputs((s) => ({ ...s, [post.id]: v }))
          }
          onCommentSubmit={() => submitComment(post.id)}
        />
      ))}
    </div>
  );
}
