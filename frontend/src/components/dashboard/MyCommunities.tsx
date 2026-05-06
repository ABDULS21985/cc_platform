'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { ApiService } from '@/services/api';
import { motion, FadeIn } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

interface CommunitySummary {
  id: number;
  name: string;
  description?: string;
  avatar?: string | null;
  role: 'owner' | 'admin' | 'member';
  member_count: number;
  is_private?: boolean;
}

function roleTone(role: CommunitySummary['role']): {
  variant: 'soft' | 'successSoft' | 'infoSoft';
  label: string;
} {
  switch (role) {
    case 'owner':
      return { variant: 'successSoft', label: 'Owner' };
    case 'admin':
      return { variant: 'infoSoft', label: 'Admin' };
    default:
      return { variant: 'soft', label: 'Member' };
  }
}

export function MyCommunities() {
  const [communities, setCommunities] = React.useState<CommunitySummary[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.communities.joined({ limit: 8 });
        const list = res.data?.data?.communities ?? [];
        if (cancelled) return;
        setCommunities(
          list.map(
            (c: {
              id: number;
              name: string;
              description?: string;
              avatar?: string | null;
              community_profile_picture?: string | null;
              role?: string;
              members_count?: number;
              member_count?: number;
              is_private?: boolean;
              visibility?: string;
            }) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              avatar: c.community_profile_picture ?? c.avatar ?? null,
              role: (c.role === 'owner'
                ? 'owner'
                : c.role === 'admin'
                  ? 'admin'
                  : 'member') as CommunitySummary['role'],
              member_count: c.members_count ?? c.member_count ?? 0,
              is_private:
                c.is_private ?? (c.visibility === 'private' ? true : undefined),
            })
          )
        );
      } catch {
        // No data — let the empty state render.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <FadeIn>
      <section
        aria-labelledby="my-communities-heading"
        className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6"
      >
        <header className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2
              id="my-communities-heading"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              Your circles
            </h2>
            <p className="text-xs text-muted-foreground">
              Communities you&apos;re part of
            </p>
          </div>
          <Link
            href="/dashboard/community"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
          >
            View all
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </header>

        {loading ? (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border p-3.5"
              >
                <Skeleton className="size-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </li>
            ))}
          </ul>
        ) : communities.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" aria-hidden="true" />}
            title="No communities yet"
            description="Join a circle or create your own to start pooling funds, splitting bills, and running events."
            action={
              <Link href="/dashboard/community?new=1">
                <Button leadingIcon={<Plus className="size-4" />}>
                  Create your first community
                </Button>
              </Link>
            }
          />
        ) : (
          <ul
            role="list"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {communities.map((c, i) => {
              const tone = roleTone(c.role);
              return (
                <motion.li
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.04 * i,
                    duration: 0.3,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <Link
                    href={`/dashboard/community/${c.id}`}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl border border-border bg-background p-3.5 transition-all',
                      'hover:border-input hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                    )}
                  >
                    <Avatar className="size-11 rounded-xl">
                      <AvatarImage src={c.avatar || undefined} alt="" />
                      <AvatarFallback className="rounded-xl bg-primary text-primary-foreground font-bold">
                        {(c.name?.trim()?.charAt(0) || 'C').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                        {c.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <Badge variant={tone.variant} size="sm">
                          {tone.label}
                        </Badge>
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3" aria-hidden="true" />
                          {c.member_count.toLocaleString()}
                        </span>
                        {c.is_private && (
                          <span
                            className="inline-flex items-center gap-1"
                            title="Private"
                          >
                            <ShieldCheck className="size-3" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>
    </FadeIn>
  );
}
