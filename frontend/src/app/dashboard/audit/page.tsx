'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Crown,
  Download,
  FileLock2,
  Filter,
  Globe,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Search,
  Sparkles,
  User,
  Users,
  Wallet,
  XCircle,
  type LucideIcon,
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
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  motion,
  AnimatePresence,
  FadeIn,
  SlideUp,
} from '@/components/ui/motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type AuditCategory = 'money' | 'security' | 'admin' | 'system';
type AuditSeverity = 'info' | 'warning' | 'critical';

interface AuditEvent {
  id: string;
  category: AuditCategory;
  severity: AuditSeverity;
  /** Short title — what happened. */
  action: string;
  /** Free-form details. */
  details: string;
  /** Who triggered the event. "System" or a person's name. */
  actor: string;
  /** "you" / "Bell MFB" / "Adaeze Mbakwe" — what was acted on. */
  target?: string;
  /** ISO timestamp. */
  timestamp: string;
  /** IP shown for security-relevant events. */
  ip?: string;
  /** Device / user agent label. */
  device?: string;
  /** Hash chain prefix to signal immutability (visual only). */
  hashPrefix?: string;
}

const CATEGORY_CONFIG: Record<
  AuditCategory,
  { label: string; icon: LucideIcon; tone: string }
> = {
  money: {
    label: 'Money',
    icon: Wallet,
    tone: 'bg-success/15 text-success',
  },
  security: {
    label: 'Security',
    icon: ShieldCheck,
    tone: 'bg-destructive/15 text-destructive',
  },
  admin: {
    label: 'Admin',
    icon: Crown,
    tone: 'bg-warning/15 text-warning',
  },
  system: {
    label: 'System',
    icon: Sparkles,
    tone: 'bg-info/15 text-info',
  },
};

const SEVERITY_CONFIG: Record<
  AuditSeverity,
  {
    label: string;
    badge: 'soft' | 'warningSoft' | 'destructiveSoft';
    icon: LucideIcon;
  }
> = {
  info: { label: 'Info', badge: 'soft', icon: CheckCircle2 },
  warning: { label: 'Notable', badge: 'warningSoft', icon: AlertTriangle },
  critical: { label: 'Critical', badge: 'destructiveSoft', icon: ShieldAlert },
};

const fmt = (n: number) => n.toLocaleString();
const now = new Date();
const minsAgo = (m: number) => new Date(now.getTime() - m * 60_000).toISOString();
const hoursAgo = (h: number) => minsAgo(h * 60);
const daysAgo = (d: number) => hoursAgo(d * 24);

// 18 realistic audit events covering the 4 categories.
const MOCK: AuditEvent[] = [
  {
    id: 'a1',
    category: 'security',
    severity: 'info',
    action: 'Sign-in successful',
    details: 'Signed in with email and password',
    actor: 'You',
    timestamp: minsAgo(5),
    ip: '105.112.40.18',
    device: 'Chrome 134 · macOS 26.0',
    hashPrefix: 'ab4f9d2',
  },
  {
    id: 'a2',
    category: 'money',
    severity: 'info',
    action: 'Transfer initiated',
    details: 'Sent ₦8,000 to Trinity Co-op',
    actor: 'You',
    target: 'Trinity Co-op (·· 0418)',
    timestamp: hoursAgo(3),
    hashPrefix: '7c1e208',
  },
  {
    id: 'a3',
    category: 'admin',
    severity: 'warning',
    action: 'Member promoted to admin',
    details: 'Funmi Ojo was given admin permissions',
    actor: 'You',
    target: 'Trinity Co-op',
    timestamp: hoursAgo(5),
    hashPrefix: '4d3afa1',
  },
  {
    id: 'a4',
    category: 'security',
    severity: 'warning',
    action: 'New device sign-in',
    details: 'A new device accessed your account',
    actor: 'You',
    timestamp: hoursAgo(8),
    ip: '197.210.45.6',
    device: 'iPhone 15 · Safari · iOS 26',
    hashPrefix: 'b9c0712',
  },
  {
    id: 'a5',
    category: 'money',
    severity: 'info',
    action: 'Wallet funded',
    details: 'Top-up of ₦40,000 from Bell MFB ·· 8421',
    actor: 'System',
    target: 'CCPay wallet',
    timestamp: hoursAgo(20),
    hashPrefix: 'e2f5081',
  },
  {
    id: 'a6',
    category: 'admin',
    severity: 'info',
    action: 'Bill created',
    details: 'Created "Estate maintenance · pothole repair" for ₦145,000',
    actor: 'You',
    target: 'Lekki Block 3 HOA',
    timestamp: daysAgo(1),
    hashPrefix: '8a2bbcf',
  },
  {
    id: 'a7',
    category: 'security',
    severity: 'critical',
    action: 'Failed sign-in attempt',
    details: 'Wrong password · 1 of 5 attempts. Account not locked.',
    actor: 'Unknown',
    timestamp: daysAgo(1),
    ip: '102.89.78.15',
    device: 'Chrome · Android 16',
    hashPrefix: 'c4d8217',
  },
  {
    id: 'a8',
    category: 'money',
    severity: 'info',
    action: 'Bill paid',
    details: 'Estate dues — March settled (₦18,500)',
    actor: 'You',
    target: 'Lekki Block 3 HOA',
    timestamp: daysAgo(2),
    hashPrefix: '1f0e9d3',
  },
  {
    id: 'a9',
    category: 'system',
    severity: 'info',
    action: 'BVN verified',
    details: 'Identity verification completed — daily limit raised to ₦5M',
    actor: 'System',
    target: 'You',
    timestamp: daysAgo(3),
    hashPrefix: '6b7a394',
  },
  {
    id: 'a10',
    category: 'security',
    severity: 'warning',
    action: 'Password changed',
    details: 'You updated your password. All other sessions were signed out.',
    actor: 'You',
    timestamp: daysAgo(4),
    ip: '105.112.40.18',
    device: 'Chrome 134 · macOS 26.0',
    hashPrefix: 'd5e823a',
  },
  {
    id: 'a11',
    category: 'admin',
    severity: 'info',
    action: 'Standing instruction created',
    details: 'Co-op contribution rule — ₦8,000 monthly to Trinity Co-op',
    actor: 'You',
    target: 'Trinity Co-op',
    timestamp: daysAgo(5),
    hashPrefix: '92c6018',
  },
  {
    id: 'a12',
    category: 'money',
    severity: 'info',
    action: 'Refund received',
    details: 'AGM streaming · Q&A refund of ₦1,500',
    actor: 'System',
    target: 'CCPay wallet',
    timestamp: daysAgo(6),
    hashPrefix: 'a0b9442',
  },
  {
    id: 'a13',
    category: 'admin',
    severity: 'info',
    action: 'Joined community',
    details: 'You joined "UI/UX Africa"',
    actor: 'You',
    target: 'UI/UX Africa',
    timestamp: daysAgo(8),
    hashPrefix: '5e1cb87',
  },
  {
    id: 'a14',
    category: 'system',
    severity: 'info',
    action: 'Privacy policy updated',
    details: 'Terms refreshed — community treasury rules clarified',
    actor: 'System',
    target: 'You',
    timestamp: daysAgo(10),
    hashPrefix: '3f7d925',
  },
  {
    id: 'a15',
    category: 'security',
    severity: 'info',
    action: 'MFA recovery codes regenerated',
    details: 'You generated a new set of 10 recovery codes',
    actor: 'You',
    timestamp: daysAgo(12),
    ip: '105.112.40.18',
    device: 'Chrome 134 · macOS 26.0',
    hashPrefix: 'fa44671',
  },
  {
    id: 'a16',
    category: 'money',
    severity: 'critical',
    action: 'Transfer reversed',
    details: 'Transfer to wrong account caught and reversed (₦4,500)',
    actor: 'System',
    target: 'CCPay wallet',
    timestamp: daysAgo(15),
    hashPrefix: '8b2dde3',
  },
  {
    id: 'a17',
    category: 'admin',
    severity: 'info',
    action: 'Member invited',
    details: 'You invited Sherifat Mobolaji to UI/UX Africa',
    actor: 'You',
    target: 'UI/UX Africa',
    timestamp: daysAgo(18),
    hashPrefix: '7a99af1',
  },
  {
    id: 'a18',
    category: 'system',
    severity: 'info',
    action: 'Account created',
    details: 'Welcome to CCPay',
    actor: 'System',
    target: 'You',
    timestamp: daysAgo(220),
    hashPrefix: '0000000',
  },
];

type TabValue = 'all' | AuditCategory;
const TABS: Array<{
  value: TabValue;
  label: string;
  icon: LucideIcon;
}> = [
  { value: 'all', label: 'All', icon: Layers },
  { value: 'money', label: 'Money', icon: Wallet },
  { value: 'security', label: 'Security', icon: ShieldCheck },
  { value: 'admin', label: 'Admin', icon: Crown },
  { value: 'system', label: 'System', icon: Sparkles },
];

type Period = '24h' | '7d' | '30d' | 'all';
const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
];

function periodCutoff(p: Period): number {
  const day = 86_400_000;
  if (p === '24h') return Date.now() - day;
  if (p === '7d') return Date.now() - 7 * day;
  if (p === '30d') return Date.now() - 30 * day;
  return 0;
}

type Bucket = 'today' | 'yesterday' | 'this-week' | 'earlier';
const BUCKET_LABEL: Record<Bucket, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  'this-week': 'This week',
  earlier: 'Earlier',
};
const BUCKET_ORDER: Bucket[] = ['today', 'yesterday', 'this-week', 'earlier'];

function bucketOf(iso: string): Bucket {
  const d = new Date(iso);
  const startOfDay = (date: Date) => {
    const c = new Date(date);
    c.setHours(0, 0, 0, 0);
    return c;
  };
  const dayDiff = Math.round(
    (startOfDay(new Date()).getTime() - startOfDay(d).getTime()) / 86_400_000
  );
  if (dayDiff <= 0) return 'today';
  if (dayDiff === 1) return 'yesterday';
  if (dayDiff <= 7) return 'this-week';
  return 'earlier';
}

function exportCsv(items: AuditEvent[]): void {
  const header = [
    'timestamp',
    'category',
    'severity',
    'action',
    'details',
    'actor',
    'target',
    'ip',
    'device',
    'hash',
  ];
  const rows = items.map((e) => [
    e.timestamp,
    e.category,
    e.severity,
    e.action.replace(/"/g, '""'),
    e.details.replace(/"/g, '""'),
    e.actor,
    e.target ?? '',
    e.ip ?? '',
    e.device ?? '',
    e.hashPrefix ?? '',
  ]);
  const csv = [
    header.join(','),
    ...rows.map((r) => r.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ccpay-audit-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  });
}

export default function AuditPage() {
  const [tab, setTab] = useState<TabValue>('all');
  const [period, setPeriod] = useState<Period>('7d');
  const [search, setSearch] = useState('');
  const [actor, setActor] = useState<'all' | 'you' | 'system' | 'others'>('all');

  const stats = useMemo(() => {
    const cutoff24 = Date.now() - 86_400_000;
    const last24 = MOCK.filter((e) => new Date(e.timestamp).getTime() >= cutoff24);
    return {
      last24: last24.length,
      moneyEvents: MOCK.filter((e) => e.category === 'money').length,
      securityEvents: MOCK.filter((e) => e.category === 'security').length,
      criticalEvents: MOCK.filter((e) => e.severity === 'critical').length,
    };
  }, []);

  const counts = useMemo<Record<TabValue, number>>(() => {
    const cutoff = periodCutoff(period);
    const inWindow = MOCK.filter(
      (e) => new Date(e.timestamp).getTime() >= cutoff
    );
    return {
      all: inWindow.length,
      money: inWindow.filter((e) => e.category === 'money').length,
      security: inWindow.filter((e) => e.category === 'security').length,
      admin: inWindow.filter((e) => e.category === 'admin').length,
      system: inWindow.filter((e) => e.category === 'system').length,
    };
  }, [period]);

  const filtered = useMemo(() => {
    const cutoff = periodCutoff(period);
    const q = search.trim().toLowerCase();
    return MOCK.filter((e) => {
      if (cutoff > 0 && new Date(e.timestamp).getTime() < cutoff) return false;
      if (tab !== 'all' && e.category !== tab) return false;
      if (actor === 'you' && e.actor !== 'You') return false;
      if (actor === 'system' && e.actor !== 'System') return false;
      if (actor === 'others' && (e.actor === 'You' || e.actor === 'System'))
        return false;
      if (!q) return true;
      return (
        e.action.toLowerCase().includes(q) ||
        e.details.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        (e.target?.toLowerCase().includes(q) ?? false) ||
        (e.ip?.toLowerCase().includes(q) ?? false) ||
        (e.device?.toLowerCase().includes(q) ?? false)
      );
    }).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [tab, period, search, actor]);

  const grouped = useMemo(() => {
    const map = new Map<Bucket, AuditEvent[]>();
    for (const e of filtered) {
      const b = bucketOf(e.timestamp);
      const list = map.get(b) ?? [];
      list.push(e);
      map.set(b, list);
    }
    return BUCKET_ORDER.filter((b) => map.has(b)).map((b) => ({
      bucket: b,
      label: BUCKET_LABEL[b],
      items: map.get(b) ?? [],
    }));
  }, [filtered]);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error('Nothing to export with the current filters.');
      return;
    }
    exportCsv(filtered);
    toast.success(`Exported ${filtered.length} audit events`);
  };

  return (
    <DashboardLayout pageTitle="Audit log">
      <div className="space-y-6">
        {/* Hero */}
        <section
          aria-labelledby="audit-hero-heading"
          className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card to-brand-soft/30 p-6 shadow-xs sm:p-8"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-brand/15 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-16 h-56 w-56 rounded-full bg-info/10 blur-3xl"
          />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <FadeIn>
              <div>
                <Badge variant="soft" size="lg" className="gap-1.5">
                  <FileLock2 className="size-3" aria-hidden="true" />
                  Audit log
                </Badge>
                <h1
                  id="audit-hero-heading"
                  className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
                >
                  Every action, immutably logged.
                </h1>
                <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
                  <Sparkles
                    className="mr-1 inline-block size-3"
                    aria-hidden="true"
                  />
                  Money, security, and admin events with a tamper-evident hash
                  chain. Export anytime for accounting or compliance.
                </p>
              </div>
            </FadeIn>

            <SlideUp delay={0.05}>
              <Button
                type="button"
                size="default"
                variant="outline"
                onClick={handleExport}
                leadingIcon={<Download className="size-4" />}
              >
                Export CSV
              </Button>
            </SlideUp>
          </div>

          <SlideUp delay={0.1}>
            <dl className="relative mt-6 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
              {[
                {
                  label: 'Last 24 hours',
                  value: fmt(stats.last24),
                  icon: Activity,
                  tone: 'bg-brand-soft text-accent-foreground',
                },
                {
                  label: 'Money events',
                  value: fmt(stats.moneyEvents),
                  icon: Wallet,
                  tone: 'bg-success/15 text-success',
                },
                {
                  label: 'Security events',
                  value: fmt(stats.securityEvents),
                  icon: ShieldCheck,
                  tone: 'bg-info/15 text-info',
                },
                {
                  label: 'Critical alerts',
                  value: fmt(stats.criticalEvents),
                  icon: ShieldAlert,
                  tone: 'bg-destructive/15 text-destructive',
                },
              ].map((it) => (
                <div
                  key={it.label}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card/80 p-3.5 backdrop-blur-sm"
                >
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-xl',
                      it.tone
                    )}
                    aria-hidden="true"
                  >
                    <it.icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {it.label}
                    </dt>
                    <dd className="text-lg font-extrabold tabular-nums tracking-tight text-foreground sm:text-xl">
                      {it.value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </SlideUp>
        </section>

        {/* Tabs */}
        <div role="tablist" aria-label="Audit categories" className="-mx-1 overflow-x-auto px-1">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-xs">
            {TABS.map((t) => {
              const isActive = tab === t.value;
              const Icon = t.icon;
              const count = counts[t.value];
              return (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(t.value)}
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
                      layoutId="audit-tab-pill"
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

        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search action, target, IP, device…"
              className="h-11 rounded-xl pl-11"
              aria-label="Search audit events"
            />
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as Period)}
            >
              <SelectTrigger
                className="h-11 w-full rounded-xl px-3 sm:w-44"
                aria-label="Filter by period"
              >
                <span className="inline-flex items-center gap-2">
                  <Filter
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <SelectValue placeholder="Period" />
                </span>
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={actor}
              onValueChange={(v) => setActor(v as typeof actor)}
            >
              <SelectTrigger
                className="h-11 w-full rounded-xl px-3 sm:w-40"
                aria-label="Filter by actor"
              >
                <span className="inline-flex items-center gap-2">
                  <User
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <SelectValue placeholder="Actor" />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actors</SelectItem>
                <SelectItem value="you">You</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="others">Others</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* List */}
        <Card variant="default" density="compact">
          <CardContent className="space-y-6 px-3 sm:px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${tab}-${period}-${search}-${actor}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={<FileLock2 className="size-5" aria-hidden="true" />}
                    title="No events match"
                    description="Try a wider period, a different category, or clear the actor filter."
                  />
                ) : (
                  grouped.map((group) => (
                    <section
                      key={group.bucket}
                      aria-labelledby={`bucket-${group.bucket}`}
                      className="space-y-2"
                    >
                      <div className="flex items-center gap-2 px-1">
                        <h2
                          id={`bucket-${group.bucket}`}
                          className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
                        >
                          {group.label}
                        </h2>
                        <span aria-hidden="true" className="h-px flex-1 bg-border" />
                        <Badge variant="soft" size="sm" className="tabular-nums">
                          {group.items.length}
                        </Badge>
                      </div>
                      <ul role="list" className="space-y-1">
                        {group.items.map((e) => {
                          const cfg = CATEGORY_CONFIG[e.category];
                          const sev = SEVERITY_CONFIG[e.severity];
                          const Icon = cfg.icon;
                          const SevIcon = sev.icon;
                          return (
                            <motion.li
                              key={e.id}
                              layout
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.25,
                                ease: [0.16, 1, 0.3, 1],
                              }}
                              className={cn(
                                'flex items-start gap-3 rounded-xl border p-3 transition-colors',
                                e.severity === 'critical'
                                  ? 'border-destructive/30 bg-destructive/5'
                                  : e.severity === 'warning'
                                    ? 'border-warning/30 bg-warning/5'
                                    : 'border-transparent hover:border-border hover:bg-muted/40'
                              )}
                            >
                              <span
                                className={cn(
                                  'grid size-10 shrink-0 place-items-center rounded-xl',
                                  cfg.tone
                                )}
                                aria-hidden="true"
                              >
                                <Icon className="size-5" />
                              </span>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                                        {e.action}
                                      </p>
                                      <Badge variant={sev.badge} size="sm" className="gap-1">
                                        <SevIcon
                                          className="size-2.5"
                                          aria-hidden="true"
                                        />
                                        {sev.label}
                                      </Badge>
                                      <Badge variant="soft" size="sm">
                                        {cfg.label}
                                      </Badge>
                                    </div>
                                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                      {e.details}
                                    </p>
                                  </div>
                                  <time
                                    dateTime={e.timestamp}
                                    className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground"
                                  >
                                    {timeOnly(e.timestamp)}
                                  </time>
                                </div>

                                <ul
                                  className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground"
                                  aria-label="Event metadata"
                                >
                                  <li className="inline-flex items-center gap-1">
                                    {e.actor === 'You' ? (
                                      <Users
                                        className="size-2.5"
                                        aria-hidden="true"
                                      />
                                    ) : e.actor === 'System' ? (
                                      <Sparkles
                                        className="size-2.5"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <User
                                        className="size-2.5"
                                        aria-hidden="true"
                                      />
                                    )}
                                    <span className="font-medium text-foreground">
                                      {e.actor}
                                    </span>
                                    {e.target && (
                                      <>
                                        <span aria-hidden="true">→</span>
                                        <span>{e.target}</span>
                                      </>
                                    )}
                                  </li>
                                  {e.ip && (
                                    <li className="inline-flex items-center gap-1">
                                      <Globe
                                        className="size-2.5"
                                        aria-hidden="true"
                                      />
                                      <span className="font-mono">{e.ip}</span>
                                    </li>
                                  )}
                                  {e.device && (
                                    <li className="truncate">{e.device}</li>
                                  )}
                                  {e.hashPrefix && (
                                    <li
                                      className="font-mono text-muted-foreground/60"
                                      title="Tamper-evident hash chain prefix"
                                    >
                                      hash {e.hashPrefix}
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </motion.li>
                          );
                        })}
                      </ul>
                    </section>
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Footer note */}
        <div className="flex flex-col items-center gap-2 text-[11px] text-muted-foreground sm:flex-row sm:justify-center">
          <span className="inline-flex items-center gap-1.5">
            <FileLock2 className="size-3" aria-hidden="true" />
            Append-only · Cryptographic hash chain · Verifiable by your treasurer
          </span>
          <span className="hidden sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="inline-flex items-center gap-1.5">
            <XCircle className="size-3 text-muted-foreground" aria-hidden="true" />
            Events cannot be edited or deleted from this view.
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
