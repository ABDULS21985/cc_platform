'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Flame, Hash, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { ApiService, type TrendingTopicApi } from '@/services/api';
import { useDemoData } from '@/lib/demo-mode';

interface Topic {
  id: number;
  tag: string;
  category: string;
  posts: number;
  velocity: 'rising' | 'hot' | 'steady';
}

const TOPICS: Topic[] = [
  { id: 1, tag: 'estate-dues',     category: 'Real estate',  posts: 184, velocity: 'rising' },
  { id: 2, tag: 'marathon-2026',   category: 'Events',       posts: 132, velocity: 'hot' },
  { id: 3, tag: 'crypto-academy',  category: 'Finance',      posts: 96,  velocity: 'steady' },
  { id: 4, tag: 'ui-design',       category: 'Technology',   posts: 71,  velocity: 'rising' },
  { id: 5, tag: 'climate-action',  category: 'Environment',  posts: 58,  velocity: 'steady' },
];

const velocityIcon = {
  rising: TrendingUp,
  hot: Flame,
  steady: Hash,
} as const;

const velocityTone = {
  rising: 'text-success',
  hot: 'text-warning',
  steady: 'text-muted-foreground',
} as const;

function mapApiTopic(t: TrendingTopicApi, idx: number): Topic {
  return {
    id: idx + 1,
    tag: t.tag,
    category: t.category,
    posts: t.posts,
    velocity: t.velocity,
  };
}

export default function TrendingTopics({ loading: loadingProp = false }: { loading?: boolean }) {
  const [topics, setTopics] = React.useState<Topic[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ApiService.discovery.trending({ limit: 5 });
        const list = res.data?.data?.topics ?? [];
        if (cancelled) return;
        if (list.length === 0) {
          setTopics(useDemoData() ? TOPICS : []);
        } else {
          setTopics(list.map(mapApiTopic));
        }
      } catch {
        if (!cancelled) setTopics(useDemoData() ? TOPICS : []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  void loadingProp;
  return (
    <Card variant="default" density="compact">
      <CardContent className="space-y-4 px-5">
        <header className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <span className="grid size-7 place-items-center rounded-lg bg-brand-soft text-accent-foreground">
              <TrendingUp className="size-3.5" aria-hidden="true" />
            </span>
            Trending topics
          </h3>
          <Link
            href="#"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
          >
            See all
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </header>

        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3">
                <Skeleton className="size-7 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </li>
            ))}
          </ul>
        ) : topics.length === 0 ? (
          <EmptyState
            icon={<TrendingUp className="size-5" aria-hidden="true" />}
            title="No trending topics yet"
            description="New hashtags will appear here once your communities start posting."
          />
        ) : (
          <ul role="list" className="-mx-2 space-y-0.5">
            {topics.map((t, i) => {
              const Icon = velocityIcon[t.velocity];
              return (
                <li key={t.id}>
                  <Link
                    href="#"
                    className={cn(
                      'group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors',
                      'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                  >
                    <span
                      className="grid size-7 shrink-0 place-items-center rounded-md bg-muted/60 text-xs font-bold tabular-nums text-muted-foreground"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                        <span className="text-muted-foreground">#</span>
                        {t.tag}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {t.category} · {t.posts} posts
                      </p>
                    </div>
                    <Icon
                      className={cn('size-3.5 shrink-0', velocityTone[t.velocity])}
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
