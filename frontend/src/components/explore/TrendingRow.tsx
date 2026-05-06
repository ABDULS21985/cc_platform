'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import CommunityCard from '@/components/community/CommunityCard';
import { ApiService, CommunityData } from '@/services/api';
import { toastAxiosError } from '@/hooks/useAxiosError';
import useUserData from '@/hooks/useUserData';
import { motion } from '@/components/ui/motion';

interface TrendingRowProps {
  /** Optional category filter (when a category is selected upstream). */
  categoryLabel?: string | null;
  /** Search filter coming from the hero. */
  search?: string;
}

interface UserShape {
  id?: number;
}

interface CommunityViewItem {
  id: number;
  name: string;
  description: string;
  members: number;
  posts: number;
  isPrivate: boolean;
  isJoined: boolean;
  isOwner: boolean;
  avatar: string;
  cover?: string | null;
}

export function TrendingRow({ categoryLabel, search }: TrendingRowProps) {
  const userData = useUserData() as UserShape | null;
  const [items, setItems] = React.useState<CommunityViewItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params: { query?: string; limit: number; sort: 'popular' } = {
          limit: 8,
          sort: 'popular',
        };
        if (search?.trim()) params.query = search.trim();
        const res = await ApiService.communities.list(params);
        if (cancelled) return;
        const list = res.data?.data?.communities || [];
        setItems(
          list.map(
            (c: CommunityData): CommunityViewItem => ({
              id: c.id,
              name: c.name,
              description:
                c.description || 'No description provided for this circle.',
              members: c.member_count || 0,
              posts: c.posts_count ?? 0,
              isPrivate: c.visibility === 'private',
              isJoined: !!c.is_joined,
              isOwner: c.created_by === userData?.id,
              avatar: c.community_profile_picture || '',
              cover: c.community_cover_photo || c.banner_url || null,
            })
          )
        );
      } catch (err) {
        if (cancelled) return;
        toastAxiosError(err, 'Failed to load trending communities.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [search, userData?.id]);

  const scrollBy = (delta: number) => {
    scrollerRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <section aria-labelledby="trending-heading" className="space-y-4">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="trending-heading"
            className="inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground sm:text-lg"
          >
            <span
              className="grid size-7 place-items-center rounded-lg bg-warning/15 text-warning"
              aria-hidden="true"
            >
              <Flame className="size-3.5" />
            </span>
            Trending this week
          </h2>
          <p className="text-xs text-muted-foreground">
            {categoryLabel
              ? `Top circles in ${categoryLabel} right now.`
              : 'Communities growing fastest in the last 7 days.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="hidden items-center gap-1 sm:flex"
            role="group"
            aria-label="Scroll trending row"
          >
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={() => scrollBy(-360)}
              aria-label="Scroll left"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={() => scrollBy(360)}
              aria-label="Scroll right"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <Link
            href="/dashboard/community"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
          >
            See all
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </div>
      </header>

      {loading ? (
        <div
          ref={scrollerRef}
          className="custom-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-[300px] shrink-0 snap-start rounded-2xl border border-border bg-card p-5"
            >
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="mt-3 h-4 w-2/3 rounded-md" />
              <Skeleton className="mt-2 h-3 w-1/2 rounded-md" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Flame className="size-5" aria-hidden="true" />}
          title="Nothing trending right now"
          description="Check back soon — new circles spin up every day."
        />
      ) : (
        <div
          ref={scrollerRef}
          className="custom-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2"
        >
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.04 * i,
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="w-[300px] shrink-0 snap-start sm:w-[320px]"
            >
              <CommunityCard community={item} />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}
