'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService, type CommunityData } from '@/services/api';
import { useDemoData } from '@/lib/demo-mode';
import { Skeleton } from '@/components/ui/skeleton';
import { toastAxiosError } from '@/hooks/useAxiosError';
import {
  Crown,
  Filter,
  Layers,
  Search,
  Sparkles,
  Star,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { MembersHero } from '@/components/members/MembersHero';
import { MemberCard } from '@/components/members/MemberCard';
import type { MemberItem } from '@/components/members/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type TabValue = 'all' | 'online' | 'recent' | 'mine';

interface TabMeta {
  value: TabValue;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const TABS: TabMeta[] = [
  {
    value: 'all',
    label: 'Everyone',
    icon: Users,
    description: 'Every person across every circle you’re in.',
  },
  {
    value: 'online',
    label: 'Online',
    icon: Zap,
    description: 'People active in the last 5 minutes.',
  },
  {
    value: 'recent',
    label: 'Recently joined',
    icon: UserPlus,
    description: 'People who joined a shared circle in the last 30 days.',
  },
  {
    value: 'mine',
    label: 'In your circles',
    icon: Crown,
    description: 'People in communities where you are an owner or admin.',
  },
];

// Mock members — relative timestamps so "online" / "recent" filters stay accurate.
const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
const daysAgo = (d: number) => minsAgo(d * 60 * 24);

const COMMUNITY_REFS = [
  { id: '1', name: 'Lekki Block 3 HOA', initials: 'LB' },
  { id: '2', name: 'Lekki Runners', initials: 'LR' },
  { id: '3', name: 'Trinity Co-op', initials: 'TC' },
  { id: '4', name: 'Grace Assembly', initials: 'GA' },
  { id: '5', name: 'Lagos Devs', initials: 'LD' },
  { id: '6', name: 'Cryptos NG', initials: 'CN' },
  { id: '7', name: 'UI/UX Africa', initials: 'UU' },
];

const MOCK_MEMBERS: MemberItem[] = [
  {
    id: 'm1',
    name: 'Adaeze Mbakwe',
    initials: 'AM',
    username: 'adaeze.m',
    bio: 'Treasurer at Crown Estate. Marathon runner. Coffee snob.',
    location: 'Lekki, Lagos',
    isOnline: true,
    lastSeenAt: minsAgo(2),
    joinedAt: daysAgo(120),
    postsCount: 84,
    isFavorite: true,
    avatarTone: 'bg-brand text-primary-foreground',
    communities: [
      { ...COMMUNITY_REFS[0], role: 'owner' },
      { ...COMMUNITY_REFS[1], role: 'member' },
      { ...COMMUNITY_REFS[6], role: 'admin' },
    ],
  },
  {
    id: 'm2',
    name: 'Kunle Adeyemi',
    initials: 'KA',
    username: 'kunle',
    bio: 'Race director · 7-time marathon finisher. Building community through running.',
    location: 'Lekki, Lagos',
    isOnline: true,
    lastSeenAt: minsAgo(1),
    joinedAt: daysAgo(180),
    postsCount: 42,
    avatarTone: 'bg-info/30 text-info',
    communities: [
      { ...COMMUNITY_REFS[1], role: 'owner' },
      { ...COMMUNITY_REFS[4], role: 'member' },
    ],
  },
  {
    id: 'm3',
    name: 'Pastor Bisi Ojo',
    initials: 'BO',
    username: 'pastorbisi',
    bio: 'Senior pastor at Grace Assembly. Faith, family, finance.',
    location: 'Yaba, Lagos',
    isOnline: false,
    lastSeenAt: minsAgo(45),
    joinedAt: daysAgo(220),
    postsCount: 31,
    avatarTone: 'bg-warning/30 text-warning',
    communities: [{ ...COMMUNITY_REFS[3], role: 'owner' }],
  },
  {
    id: 'm4',
    name: 'Funmi Ojo',
    initials: 'FO',
    username: 'funmi',
    bio: 'Co-op secretary · Loves spreadsheets and long walks.',
    location: 'Ikoyi, Lagos',
    isOnline: true,
    lastSeenAt: minsAgo(3),
    joinedAt: daysAgo(60),
    postsCount: 18,
    isFavorite: true,
    avatarTone: 'bg-success/30 text-success',
    communities: [
      { ...COMMUNITY_REFS[2], role: 'admin' },
      { ...COMMUNITY_REFS[0], role: 'member' },
    ],
  },
  {
    id: 'm5',
    name: 'Sherifat Mobolaji',
    initials: 'SM',
    username: 'sherifat',
    bio: 'UI/UX designer at Andela. Open to collabs.',
    location: 'Surulere, Lagos',
    isOnline: false,
    lastSeenAt: minsAgo(180),
    joinedAt: daysAgo(15),
    postsCount: 9,
    avatarTone: 'bg-brand-bright/30 text-primary',
    communities: [
      { ...COMMUNITY_REFS[6], role: 'member' },
      { ...COMMUNITY_REFS[4], role: 'member' },
    ],
  },
  {
    id: 'm6',
    name: 'John Smith',
    initials: 'JS',
    username: 'johns',
    bio: 'Frontend engineer. React, Next.js, Tailwind.',
    location: 'Ikeja, Lagos',
    isOnline: false,
    lastSeenAt: minsAgo(820),
    joinedAt: daysAgo(8),
    postsCount: 5,
    avatarTone: 'bg-info/30 text-info',
    communities: [{ ...COMMUNITY_REFS[4], role: 'member' }],
  },
  {
    id: 'm7',
    name: 'Sarah Wilson',
    initials: 'SW',
    username: 'sarahw',
    bio: 'Product manager. Building tools for community treasurers.',
    location: 'Lagos',
    isOnline: true,
    lastSeenAt: minsAgo(0),
    joinedAt: daysAgo(45),
    postsCount: 27,
    avatarTone: 'bg-warning/30 text-warning',
    communities: [
      { ...COMMUNITY_REFS[5], role: 'admin' },
      { ...COMMUNITY_REFS[4], role: 'member' },
    ],
  },
  {
    id: 'm8',
    name: 'Mike Johnson',
    initials: 'MJ',
    username: 'mikej',
    bio: 'Backend engineer · Lover of clean APIs.',
    location: 'Abuja',
    isOnline: false,
    lastSeenAt: minsAgo(2400),
    joinedAt: daysAgo(20),
    postsCount: 12,
    avatarTone: 'bg-success/30 text-success',
    communities: [
      { ...COMMUNITY_REFS[4], role: 'member' },
      { ...COMMUNITY_REFS[5], role: 'member' },
    ],
  },
  {
    id: 'm9',
    name: 'Tunde Bakare',
    initials: 'TB',
    username: 'tunde',
    bio: 'Crypto trader · DeFi maximalist.',
    location: 'Port Harcourt',
    isOnline: true,
    lastSeenAt: minsAgo(4),
    joinedAt: daysAgo(150),
    postsCount: 56,
    avatarTone: 'bg-brand text-primary-foreground',
    communities: [{ ...COMMUNITY_REFS[5], role: 'owner' }],
  },
  {
    id: 'm10',
    name: 'Amaka Eze',
    initials: 'AE',
    username: 'amaka',
    bio: 'Estate manager · 20+ years in property mgmt.',
    location: 'Lekki, Lagos',
    isOnline: false,
    lastSeenAt: minsAgo(60),
    joinedAt: daysAgo(95),
    postsCount: 22,
    avatarTone: 'bg-info/30 text-info',
    communities: [
      { ...COMMUNITY_REFS[0], role: 'admin' },
      { ...COMMUNITY_REFS[1], role: 'member' },
    ],
  },
  {
    id: 'm11',
    name: 'Chinedu Okafor',
    initials: 'CO',
    username: 'chinedu',
    bio: 'Software engineer · Lagos Devs organizer.',
    location: 'Lagos',
    isOnline: false,
    lastSeenAt: minsAgo(720),
    joinedAt: daysAgo(75),
    postsCount: 19,
    avatarTone: 'bg-warning/30 text-warning',
    communities: [
      { ...COMMUNITY_REFS[4], role: 'admin' },
      { ...COMMUNITY_REFS[6], role: 'member' },
    ],
  },
  {
    id: 'm12',
    name: 'Damilola Akin',
    initials: 'DA',
    username: 'dami',
    bio: 'Co-op member, weekend cyclist.',
    location: 'Ibadan',
    isOnline: false,
    lastSeenAt: minsAgo(160),
    joinedAt: daysAgo(28),
    postsCount: 4,
    avatarTone: 'bg-success/30 text-success',
    communities: [{ ...COMMUNITY_REFS[2], role: 'member' }],
  },
];

const ONLINE_THRESHOLD_MIN = 5;

function isOnlineNow(item: MemberItem): boolean {
  if (item.isOnline) return true;
  if (!item.lastSeenAt) return false;
  return (
    (Date.now() - new Date(item.lastSeenAt).getTime()) / 60_000 <=
    ONLINE_THRESHOLD_MIN
  );
}

function isRecent(item: MemberItem): boolean {
  const d = (Date.now() - new Date(item.joinedAt).getTime()) / 86_400_000;
  return d <= 30;
}

function isInYourCircles(item: MemberItem): boolean {
  return item.communities.some(
    (c) => c.role === 'owner' || c.role === 'admin'
  );
}

interface ApiMember {
  id?: number;
  user_id?: number;
  community_id?: number;
  role?: string;
  status?: string;
  joined_at?: string;
  user?: {
    id?: number;
    email?: string;
    firstname?: string;
    lastname?: string;
    full_name?: string;
    profile_photo?: string | null;
    bio?: string | null;
    /** Number of active posts this user has authored in the community. */
    posts_count?: number;
    /** ISO timestamp; null when the user has never been seen. */
    last_seen_at?: string | null;
  };
}

const ONLINE_WINDOW_MS = 5 * 60 * 1000;

function lastSeenIsOnline(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= ONLINE_WINDOW_MS;
}

const TONE_PALETTE = [
  'bg-brand text-primary-foreground',
  'bg-info/30 text-info',
  'bg-warning/30 text-warning',
  'bg-success/30 text-success',
  'bg-brand-bright/30 text-primary',
];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Aggregate members across all communities the user has joined. Backend has
 * no /me/people endpoint yet, so we walk joined() → getMembers(id) per
 * community and dedupe by user_id, building a community list per person.
 */
async function fetchAggregatedMembers(): Promise<MemberItem[]> {
  const joinedRes = await ApiService.communities.joined({ limit: 100 });
  const joined = joinedRes.data?.data?.communities ?? [];
  if (joined.length === 0) return [];

  // Fan out — one members fetch per community, in parallel.
  const memberLists = await Promise.all(
    joined.map(async (c: CommunityData) => {
      try {
        const res = await ApiService.communities.getMembers(c.id, { limit: 200 });
        const items = (res.data?.data?.members ?? []) as unknown as ApiMember[];
        return items.map((m) => ({ ...m, _community: c }));
      } catch {
        return [];
      }
    })
  );

  type Enriched = ApiMember & { _community: CommunityData };
  const flat = memberLists.flat() as Enriched[];

  // Dedupe by user_id, building communities[] per person.
  const byUser = new Map<number, MemberItem>();
  for (const row of flat) {
    const uid = row.user_id ?? row.user?.id;
    if (!uid) continue;
    const u = row.user ?? {};
    const fullName =
      u.full_name ||
      [u.firstname, u.lastname].filter(Boolean).join(' ') ||
      u.email ||
      'Member';
    const role = (row.role === 'owner'
      ? 'owner'
      : row.role === 'admin'
        ? 'admin'
        : 'member') as MemberItem['communities'][number]['role'];
    const communityRef = {
      id: String(row._community.id),
      name: row._community.name,
      initials: initialsFor(row._community.name),
      role,
    };
    const memberPostsHere = u.posts_count ?? 0;
    const existing = byUser.get(uid);
    if (existing) {
      existing.communities.push(communityRef);
      // Sum posts across the communities this user shares with us.
      existing.postsCount = (existing.postsCount ?? 0) + memberPostsHere;
    } else {
      const lastSeen = u.last_seen_at ?? undefined;
      byUser.set(uid, {
        id: String(uid),
        name: fullName,
        initials: initialsFor(fullName),
        avatar: u.profile_photo ?? undefined,
        username: (u.firstname || u.email?.split('@')[0] || `user${uid}`).toLowerCase(),
        bio: u.bio ?? undefined,
        location: undefined,
        communities: [communityRef],
        // Real presence: online if last_seen_at is within the 5-min window.
        isOnline: lastSeenIsOnline(lastSeen),
        lastSeenAt: lastSeen,
        joinedAt: row.joined_at ?? new Date().toISOString(),
        postsCount: memberPostsHere,
        isFavorite: false,
        avatarTone: TONE_PALETTE[uid % TONE_PALETTE.length],
      });
    }
  }
  return [...byUser.values()];
}

const memberTargetRef = (id: string | number) => `member:${id}`;

async function fetchMemberBookmarkMap(): Promise<Map<string, number>> {
  const res = await ApiService.bookmarks.list({ kind: 'member', limit: 200 });
  const bookmarks = res.data?.data?.bookmarks ?? [];
  return new Map(
    bookmarks
      .filter((b) => b.kind === 'member')
      .map((b) => [b.target_ref, b.id])
  );
}

function applyMemberBookmarks(
  items: MemberItem[],
  bookmarks: Map<string, number>
): MemberItem[] {
  return items.map((member) => {
    const bookmarkId =
      bookmarks.get(memberTargetRef(member.id)) ?? bookmarks.get(member.id);
    return {
      ...member,
      isFavorite: bookmarkId !== undefined,
      favoriteBookmarkId: bookmarkId ?? null,
    };
  });
}

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');
  const [communityFilter, setCommunityFilter] = useState<string>('all');
  const [sort, setSort] = useState<'recent' | 'name' | 'most-active'>('recent');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [real, memberBookmarks] = await Promise.all([
          fetchAggregatedMembers(),
          fetchMemberBookmarkMap().catch(() => new Map<string, number>()),
        ]);
        if (cancelled) return;
        if (real.length === 0) {
          setMembers(useDemoData() ? MOCK_MEMBERS : []);
          setUsingMock(useDemoData());
        } else {
          setMembers(applyMemberBookmarks(real, memberBookmarks));
          setUsingMock(false);
        }
      } catch (err) {
        if (cancelled) return;
        toastAxiosError(err, 'Failed to load members.');
        setMembers(useDemoData() ? MOCK_MEMBERS : []);
        setUsingMock(useDemoData());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: members.length,
      online: members.filter(isOnlineNow).length,
      newThisMonth: members.filter(isRecent).length,
      topContributors: members.filter((m) => (m.postsCount ?? 0) >= 20).length,
    }),
    [members]
  );

  // Set of unique communities the user is in (derived from member shared circles).
  const communities = useMemo(() => {
    const seen = new Map<string, string>();
    for (const m of members) {
      for (const c of m.communities) seen.set(c.id, c.name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [members]);

  const counts = useMemo<Record<TabValue, number>>(
    () => ({
      all: members.length,
      online: members.filter(isOnlineNow).length,
      recent: members.filter(isRecent).length,
      mine: members.filter(isInYourCircles).length,
    }),
    [members]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members
      .filter((m) => {
        if (activeTab === 'online') return isOnlineNow(m);
        if (activeTab === 'recent') return isRecent(m);
        if (activeTab === 'mine') return isInYourCircles(m);
        return true;
      })
      .filter((m) =>
        communityFilter === 'all'
          ? true
          : m.communities.some((c) => c.id === communityFilter)
      )
      .filter((m) => {
        if (!q) return true;
        return (
          m.name.toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q) ||
          (m.bio?.toLowerCase().includes(q) ?? false) ||
          (m.location?.toLowerCase().includes(q) ?? false) ||
          m.communities.some((c) => c.name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sort === 'name') return a.name.localeCompare(b.name);
        if (sort === 'most-active')
          return (b.postsCount ?? 0) - (a.postsCount ?? 0);
        // recent = newest joined first
        return (
          new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
        );
      });
  }, [members, activeTab, search, communityFilter, sort]);

  const toggleFavorite = async (id: string) => {
    const m = members.find((m) => m.id === id);
    if (!m) return;

    if (usingMock) {
      setMembers((prev) =>
        prev.map((member) =>
          member.id === id ? { ...member, isFavorite: !member.isFavorite } : member
        )
      );
      toast.success(
        m.isFavorite ? `Removed ${m.name} from favorites` : `Saved ${m.name}`
      );
      return;
    }

    if (m.isFavorite) {
      if (!m.favoriteBookmarkId) {
        toast.error('Could not identify this favorite');
        return;
      }
      setMembers((prev) =>
        prev.map((member) =>
          member.id === id
            ? { ...member, isFavorite: false, favoriteBookmarkId: null }
            : member
        )
      );
      try {
        await ApiService.bookmarks.delete(m.favoriteBookmarkId);
        toast.success(`Removed ${m.name} from favorites`);
      } catch (err) {
        setMembers((prev) =>
          prev.map((member) =>
            member.id === id
              ? {
                  ...member,
                  isFavorite: true,
                  favoriteBookmarkId: m.favoriteBookmarkId,
                }
              : member
          )
        );
        toastAxiosError(err, 'Failed to remove favorite.');
      }
      return;
    }

    setMembers((prev) =>
      prev.map((member) =>
        member.id === id ? { ...member, isFavorite: true } : member
      )
    );
    try {
      const primaryCommunity = m.communities[0];
      const res = await ApiService.bookmarks.create({
        kind: 'member',
        target_ref: memberTargetRef(m.id),
        title: m.name,
        description: m.bio ?? `@${m.username}`,
        source: primaryCommunity?.name ?? 'Members',
        href: `/dashboard/members?member=${m.id}`,
        community_id: primaryCommunity ? Number(primaryCommunity.id) : null,
        community_name: primaryCommunity?.name ?? null,
      });
      const bookmark = res.data?.data?.bookmark;
      setMembers((prev) =>
        prev.map((member) =>
          member.id === id
            ? {
                ...member,
                isFavorite: true,
                favoriteBookmarkId: bookmark?.id ?? null,
              }
            : member
        )
      );
      toast.success(`Saved ${m.name}`);
    } catch (err) {
      setMembers((prev) =>
        prev.map((member) =>
          member.id === id
            ? { ...member, isFavorite: false, favoriteBookmarkId: null }
            : member
        )
      );
      toastAxiosError(err, 'Failed to save favorite.');
    }
  };

  const handleInvite = async (id: string) => {
    const m = members.find((m) => m.id === id);
    if (!m) {
      router.push('/dashboard/community');
      return;
    }

    const community = m.communities[0];
    const communityId = community ? Number(community.id) : NaN;
    if (!community || !Number.isFinite(communityId)) {
      router.push('/dashboard/community');
      return;
    }
    if (usingMock) {
      router.push(`/dashboard/community/${communityId}`);
      return;
    }
    try {
      const res = await ApiService.communities.createInvite(communityId, {
        expires_in_days: 7,
        max_uses: 1,
      });
      const inviteCode = res.data?.data?.invite_code;
      if (inviteCode && navigator.clipboard) {
        await navigator.clipboard.writeText(`${window.location.origin}/join/${inviteCode}`);
      }
      toast.success(`Invite link created for ${community.name}`);
    } catch (err) {
      toastAxiosError(err, 'Failed to create invite link.');
    }
  };

  const handleMessage = (id: string) => {
    router.push(`/dashboard/inbox?member=${id}`);
  };

  return (
    <DashboardLayout pageTitle="Members">
      <div className="space-y-6">
        <MembersHero
          stats={stats}
          circleCount={communities.length}
          onInvite={() => router.push('/dashboard/community')}
        />

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Member sections"
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
                  onClick={() => setActiveTab(t.value)}
                  className={cn(
                    'relative inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <motion.span
                      layoutId="members-tab-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon className="size-4" aria-hidden="true" />
                  {t.label}
                  {count > 0 && (
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
          {TABS.find((t) => t.value === activeTab)?.description}
        </p>

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:p-4">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, @handle, bio, location, or community…"
              className="h-11 rounded-xl pl-11"
              aria-label="Search members"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={communityFilter} onValueChange={setCommunityFilter}>
              <SelectTrigger
                className="h-11 w-full rounded-xl px-3 sm:w-52"
                aria-label="Filter by community"
              >
                <span className="inline-flex items-center gap-2">
                  <Layers
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <SelectValue placeholder="All communities" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All communities</SelectItem>
                {communities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
              <SelectTrigger
                className="h-11 w-full rounded-xl px-3 sm:w-44"
                aria-label="Sort members"
              >
                <span className="inline-flex items-center gap-2">
                  <Filter
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <SelectValue placeholder="Sort" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently joined</SelectItem>
                <SelectItem value="most-active">Most active</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${search}-${communityFilter}-${sort}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Users className="size-5" aria-hidden="true" />}
                title="No matches"
                description={
                  search ||
                  communityFilter !== 'all' ||
                  activeTab !== 'all'
                    ? 'Try a different filter combination, or clear the search.'
                    : 'Members will show here once they join your circles.'
                }
              />
            ) : (
              <ul
                role="list"
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {filtered.map((m) => (
                  <li key={m.id}>
                    <MemberCard
                      item={m}
                      onMessage={handleMessage}
                      onInvite={handleInvite}
                      onToggleFavorite={toggleFavorite}
                    />
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Footer microcopy */}
        <p className="text-center text-[11px] text-muted-foreground">
          Showing {filtered.length} of {members.length} people across {communities.length}{' '}
          {communities.length === 1 ? 'community' : 'communities'} ·{' '}
          <button
            type="button"
            onClick={() => {
              setActiveTab('all');
              setSearch('');
              setCommunityFilter('all');
              setSort('recent');
            }}
            className={cn(
              'rounded-md px-1 font-semibold text-primary hover:underline underline-offset-4',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            Reset filters
          </button>
        </p>

        {/* Trust note */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Star className="size-3 text-warning" aria-hidden="true" />
          <span>
            Privacy-first: only people who share a community with you appear here.
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
