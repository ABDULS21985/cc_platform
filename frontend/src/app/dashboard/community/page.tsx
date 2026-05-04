'use client';

import * as React from 'react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Compass, Plus, ShieldCheck, Sparkles, Users } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SearchAndFilter, {
  CommunityFilters,
} from '@/components/community/SearchAndFilter';
import CommunityCard from '@/components/community/CommunityCard';
import { CommunitySkeleton } from '@/components/community/CommunitySkeleton';
import { CommunityHero } from '@/components/community/CommunityHero';
import { CreateCommunityDialog } from '@/components/community/CreateCommunityDialog';
import { ApiService, CommunityData } from '@/services/api';
import useUserData from '@/hooks/useUserData';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type TabValue = 'all' | 'mine' | 'joined';

interface TabMeta {
  value: TabValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  fetcher: typeof ApiService.communities.list;
}

const TABS: TabMeta[] = [
  {
    value: 'all',
    label: 'Explore',
    icon: Compass,
    description: 'Discover new communities and circles.',
    fetcher: ApiService.communities.list,
  },
  {
    value: 'mine',
    label: 'My circles',
    icon: ShieldCheck,
    description: "Communities you've created and manage.",
    fetcher: ApiService.communities.mine,
  },
  {
    value: 'joined',
    label: 'Joined',
    icon: Users,
    description: "Circles you've become a member of.",
    fetcher: ApiService.communities.joined,
  },
];

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
}

interface UserShape {
  id?: number;
}

function tabFromQuery(value: string | null): TabValue {
  if (value === 'mine' || value === 'joined') return value;
  return 'all';
}

function CommunityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userData = useUserData() as UserShape | null;

  const initialTab = tabFromQuery(searchParams?.get('tab') ?? null);
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  const [communities, setCommunities] = useState<CommunityViewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CommunityFilters>({
    searchValue: '',
    selectedFilter: 'recent',
    visibility: 'all',
  });
  const [counts, setCounts] = useState<Record<TabValue, number | null>>({
    all: null,
    mine: null,
    joined: null,
  });
  const [createOpen, setCreateOpen] = useState(searchParams?.get('new') === '1');

  // Stay in sync with URL when the user navigates via sidebar etc.
  useEffect(() => {
    setActiveTab(tabFromQuery(searchParams?.get('tab') ?? null));
    if (searchParams?.get('new') === '1') setCreateOpen(true);
  }, [searchParams]);

  const activeMeta = useMemo(
    () => TABS.find((t) => t.value === activeTab) ?? TABS[0],
    [activeTab]
  );

  // Fetch the active tab's items.
  useEffect(() => {
    let cancelled = false;
    const fetchCommunities = async () => {
      setLoading(true);
      try {
        const params: {
          query?: string;
          visibility?: string;
          limit?: number;
        } = {};
        if (filters.searchValue?.trim()) params.query = filters.searchValue.trim();
        if (filters.visibility && filters.visibility !== 'all')
          params.visibility = filters.visibility;
        const res = await activeMeta.fetcher(params);
        if (cancelled) return;
        const list = res.data?.data?.communities || [];
        setCommunities(
          list.map(
            (c: CommunityData): CommunityViewItem => ({
              id: c.id,
              name: c.name,
              description:
                c.description || 'No description provided for this circle.',
              members: c.member_count || 0,
              posts: 0,
              isPrivate: c.visibility === 'private',
              isJoined: !!c.is_joined,
              isOwner: c.created_by === userData?.id,
              avatar: '/images/image.png',
            })
          )
        );
        setCounts((prev) => ({ ...prev, [activeTab]: list.length }));
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to fetch communities', err);
        toastAxiosError(err, 'Failed to load communities. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCommunities();
    return () => {
      cancelled = true;
    };
  }, [activeMeta, filters, userData?.id, activeTab]);

  // Best-effort backfill of the other tabs' counts so the tab badges feel real.
  useEffect(() => {
    let cancelled = false;
    const backfill = async () => {
      const others = TABS.filter((t) => t.value !== activeTab);
      await Promise.all(
        others.map(async (t) => {
          if (counts[t.value] != null) return;
          try {
            const res = await t.fetcher({ limit: 1 });
            const total =
              (res.data?.data as { total?: number })?.total ??
              res.data?.data?.communities?.length ??
              0;
            if (!cancelled)
              setCounts((prev) => ({ ...prev, [t.value]: total }));
          } catch {
            /* ignore — tab badge stays empty */
          }
        })
      );
    };
    backfill();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const heroStats = useMemo(() => {
    const owned = counts.mine ?? 0;
    const joined = counts.joined ?? 0;
    return {
      total: owned + joined,
      owned,
      member: joined,
    };
  }, [counts]);

  const handleTabChange = (value: TabValue) => {
    setActiveTab(value);
    const url = value === 'all' ? '/dashboard/community' : `/dashboard/community?tab=${value}`;
    router.replace(url);
  };

  const showCreateTile = activeTab === 'mine' && communities.length > 0 && !loading;

  return (
    <DashboardLayout pageTitle="Communities">
      <div className="space-y-6">
        <CommunityHero
          stats={heroStats}
          loading={
            counts.all === null && counts.mine === null && counts.joined === null
          }
          onCreate={() => setCreateOpen(true)}
        />

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Community sections"
          className="-mx-1 overflow-x-auto px-1"
        >
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-xs">
            {TABS.map((t) => {
              const isActive = activeTab === t.value;
              const Icon = t.icon;
              const count = counts[t.value];
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`community-panel-${t.value}`}
                  id={`community-tab-${t.value}`}
                  onClick={() => handleTabChange(t.value)}
                  className={cn(
                    'relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="community-tab-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className="size-4" aria-hidden="true" />
                  {t.label}
                  {count !== null && (
                    <Badge
                      variant={isActive ? 'outline' : 'soft'}
                      size="sm"
                      className={cn(
                        'tabular-nums',
                        isActive &&
                          'border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground'
                      )}
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <p className="-mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="size-3" aria-hidden="true" />
          {activeMeta.description}
        </p>

        {/* Search + filter bar */}
        <SearchAndFilter onRefresh={setFilters} />

        {/* Grid */}
        <div
          role="tabpanel"
          id={`community-panel-${activeTab}`}
          aria-labelledby={`community-tab-${activeTab}`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${filters.searchValue}-${filters.visibility}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {loading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <CommunitySkeleton key={i} />
                  ))}
                </div>
              ) : communities.length === 0 ? (
                <EmptyCommunities
                  tab={activeTab}
                  hasFilters={!!filters.searchValue?.trim() || filters.visibility !== 'all'}
                  onCreate={() => setCreateOpen(true)}
                />
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {showCreateTile && (
                    <CreateTile onClick={() => setCreateOpen(true)} />
                  )}
                  {communities.map((c, i) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.04 * i,
                        duration: 0.3,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <CommunityCard community={c} />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <CreateCommunityDialog
          isOpen={createOpen}
          toggleDialog={() => setCreateOpen((v) => !v)}
          onSuccess={() => {
            // Bust counts so the badges refetch.
            setCounts({ all: null, mine: null, joined: null });
            setActiveTab('mine');
          }}
        />
      </div>
    </DashboardLayout>
  );
}

interface EmptyCommunitiesProps {
  tab: TabValue;
  hasFilters: boolean;
  onCreate: () => void;
}

function EmptyCommunities({ tab, hasFilters, onCreate }: EmptyCommunitiesProps) {
  if (hasFilters) {
    return (
      <EmptyState
        icon={<Compass className="size-5" aria-hidden="true" />}
        title="No matches"
        description="Try a different search term, change visibility, or switch tabs."
      />
    );
  }
  if (tab === 'mine') {
    return (
      <EmptyState
        icon={<ShieldCheck className="size-5" aria-hidden="true" />}
        title="You haven't started a circle yet"
        description="Create one to pool funds, split bills, and run events with your group."
        action={
          <Button onClick={onCreate} leadingIcon={<Plus className="size-4" />}>
            Create your first community
          </Button>
        }
      />
    );
  }
  if (tab === 'joined') {
    return (
      <EmptyState
        icon={<Users className="size-5" aria-hidden="true" />}
        title="You haven't joined any circles"
        description="Browse the Explore tab to find communities aligned with your interests."
      />
    );
  }
  return (
    <EmptyState
      icon={<Compass className="size-5" aria-hidden="true" />}
      title="No communities yet"
      description="Be the first — start a circle for your estate, church, club, or team."
      action={
        <Button onClick={onCreate} leadingIcon={<Plus className="size-4" />}>
          Create a community
        </Button>
      }
    />
  );
}

interface CreateTileProps {
  onClick: () => void;
}

function CreateTile({ onClick }: CreateTileProps) {
  return (
    <Card
      variant="outline"
      interactive
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className="flex h-full flex-col items-center justify-center gap-3 border-dashed p-6 text-center"
    >
      <CardContent className="flex flex-col items-center gap-3 px-0">
        <span
          className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-accent-foreground"
          aria-hidden="true"
        >
          <Plus className="size-6" />
        </span>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          New community
        </p>
        <p className="max-w-[24ch] text-xs text-muted-foreground">
          Spin up a fresh circle for your estate, club, or team.
        </p>
      </CardContent>
    </Card>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout pageTitle="Communities">
          <div className="space-y-6">
            <div className="h-32 animate-pulse rounded-3xl bg-muted/50" />
            <div className="h-10 w-72 animate-pulse rounded-full bg-muted/50" />
            <div className="h-20 animate-pulse rounded-2xl bg-muted/50" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <CommunitySkeleton key={i} />
              ))}
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <CommunityContent />
    </Suspense>
  );
}
