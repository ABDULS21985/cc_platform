'use client';

import * as React from 'react';
import {
  Activity,
  Calendar,
  CreditCard,
  MessageCircle,
  Receipt,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AnimatePresence,
  FadeIn,
  motion,
} from '@/components/ui/motion';
import { cn } from '@/lib/utils';

interface Feature {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  headline: string;
  body: string;
  bullets: string[];
  stat: { value: string; label: string };
  /** Renders a small product mockup specific to this feature. */
  mockup: React.ReactNode;
}

function WalletMockup() {
  return (
    <div className="space-y-3 rounded-2xl bg-gradient-to-br from-brand to-[oklch(0.18_0.025_220)] p-5 text-white shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
          Lekki Runners · Pool
        </p>
        <span className="rounded-md bg-white/15 px-2 py-0.5 text-[9px] font-bold">
          NGN
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-base font-semibold text-white/70">₦</span>
        <span className="text-4xl font-black tabular-nums tracking-tight">
          428,500
        </span>
        <span className="text-base font-semibold text-white/70">.00</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 text-[11px] font-semibold">
        {['Send', 'Fund', 'Pay'].map((label) => (
          <span
            key={label}
            className="grid h-8 place-items-center rounded-lg border border-white/15 bg-white/10"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function BillsMockup() {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Estate dues · April
        </p>
        <Badge variant="successSoft" size="sm">
          92% paid
        </Badge>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[92%] rounded-full bg-gradient-to-r from-brand to-brand-bright" />
      </div>
      <ul className="mt-3 space-y-1.5 text-xs">
        {[
          { name: 'Block 1 · A. Lovelace', state: 'Paid', tone: 'success' },
          { name: 'Block 2 · K. Adekunle', state: 'Paid', tone: 'success' },
          { name: 'Block 3 · O. Bello', state: 'Pending', tone: 'warning' },
        ].map((row) => (
          <li
            key={row.name}
            className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5"
          >
            <span className="truncate text-foreground">{row.name}</span>
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-widest',
                row.tone === 'success' && 'text-success',
                row.tone === 'warning' && 'text-warning'
              )}
            >
              {row.state}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EventsMockup() {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-xl">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-accent-foreground">
          <Calendar className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold tracking-tight">
            Lagos Half Marathon
          </p>
          <p className="text-[11px] text-muted-foreground">Sat 14 Jun · 06:00</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Sold', value: '184' },
          { label: 'Pending', value: '23' },
          { label: 'Capacity', value: '300' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-muted/40 p-2">
            <p className="text-base font-extrabold tabular-nums tracking-tight">
              {s.value}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PostsMockup() {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-xl">
      <div className="flex items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground text-xs font-black">
          A
        </span>
        <div className="flex-1 space-y-1.5">
          <p className="text-xs font-semibold">Ada Lovelace</p>
          <div className="space-y-1">
            <div className="h-2 w-full rounded-full bg-muted" />
            <div className="h-2 w-3/4 rounded-full bg-muted" />
          </div>
          <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MessageCircle className="size-3" aria-hidden="true" />
              12
            </span>
            <span className="inline-flex items-center gap-1">
              <Activity className="size-3" aria-hidden="true" />
              48 reactions
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditMockup() {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-card p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold tracking-tight">Audit log</p>
        <Badge variant="infoSoft" size="sm">
          Tamper-proof
        </Badge>
      </div>
      <ul className="space-y-1.5 text-xs">
        {[
          { who: 'A. Lovelace', what: 'Created bill', when: '14:02' },
          { who: 'K. Adekunle', what: 'Approved transfer', when: '14:08' },
          { who: 'System', what: 'Settled to Bell MFB', when: '14:09' },
        ].map((row) => (
          <li
            key={row.when}
            className="flex items-center gap-3 rounded-md bg-muted/40 px-2.5 py-1.5"
          >
            <span className="grid size-6 place-items-center rounded-full bg-success/15 text-success">
              <Receipt className="size-3" aria-hidden="true" />
            </span>
            <span className="flex-1 text-foreground">
              <span className="font-semibold">{row.who}</span>{' '}
              <span className="text-muted-foreground">{row.what}</span>
            </span>
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {row.when}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const FEATURES: Feature[] = [
  {
    id: 'wallet',
    icon: Wallet,
    label: 'Wallet',
    headline: 'A wallet built for groups, not just individuals.',
    body:
      'Every community gets its own NGN wallet with multi-signer approvals, role-based permissions, and instant settlement to Bell MFB.',
    bullets: [
      'Multi-signer transfers above any threshold',
      'Role-based access — treasurer, member, observer',
      'Instant settlement, 24/7',
    ],
    stat: { value: '<2s', label: 'Settlement' },
    mockup: <WalletMockup />,
  },
  {
    id: 'bills',
    icon: Receipt,
    label: 'Bills',
    headline: 'Send a bill once. Watch it pay itself in.',
    body:
      'Each member gets a unique payment link. CCPay tracks who has paid, who is pending, and reconciles the wallet the moment funds clear.',
    bullets: [
      'Per-member payment links + reminders',
      'Auto-reconciliation into the pool',
      'Receipt PDF for every contribution',
    ],
    stat: { value: '92%', label: 'On-time pay rate' },
    mockup: <BillsMockup />,
  },
  {
    id: 'events',
    icon: Calendar,
    label: 'Events',
    headline: 'Run events end-to-end without leaving the app.',
    body:
      'Sell tickets, collect deposits, manage RSVPs, and settle vendors — all under one event with a single ledger.',
    bullets: [
      'Capped tickets with waitlist',
      'Vendor settlement from event escrow',
      'QR check-in at the door',
    ],
    stat: { value: '1.1k', label: 'Events / mo' },
    mockup: <EventsMockup />,
  },
  {
    id: 'posts',
    icon: MessageCircle,
    label: 'Posts',
    headline: 'A community feed your members actually open.',
    body:
      'Share announcements, polls, photos, and milestones. Members get push notifications for the things they care about — not for everything.',
    bullets: [
      'Smart notifications respect quiet hours',
      'Polls and reactions, no spam',
      'Pinned announcements stay visible',
    ],
    stat: { value: '4.6×', label: 'Engagement uplift' },
    mockup: <PostsMockup />,
  },
  {
    id: 'audit',
    icon: CreditCard,
    label: 'Audit',
    headline: 'A tamper-proof ledger every member can trust.',
    body:
      'Every credit, debit, role change, and login is hashed into an append-only audit log. Treasurers can prove the books at any time.',
    bullets: [
      'Cryptographic hash chain',
      'Exportable CSV for end-of-year review',
      'Member-level access controls',
    ],
    stat: { value: '100%', label: 'Money events logged' },
    mockup: <AuditMockup />,
  },
];

export function FeatureTabs() {
  const [activeId, setActiveId] = React.useState<string>(FEATURES[0].id);
  const active = FEATURES.find((f) => f.id === activeId) ?? FEATURES[0];

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="relative px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <Badge variant="soft" size="lg">
            One platform · Five surfaces
          </Badge>
        </FadeIn>
        <FadeIn delay={0.05}>
          <h2
            id="features-heading"
            className="mt-4 max-w-2xl text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
          >
            Everything a community needs in one place.
          </h2>
        </FadeIn>

        {/* Tablist */}
        <div
          role="tablist"
          aria-label="Feature areas"
          className="mt-10 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0"
        >
          <div className="inline-flex gap-2 rounded-full border border-border bg-card p-1 shadow-xs">
            {FEATURES.map((f) => {
              const isActive = f.id === activeId;
              return (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`feature-panel-${f.id}`}
                  id={`feature-tab-${f.id}`}
                  onClick={() => setActiveId(f.id)}
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
                      layoutId="feature-tab-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                      transition={{
                        type: 'spring',
                        stiffness: 400,
                        damping: 32,
                      }}
                    />
                  )}
                  <f.icon className="size-4" aria-hidden="true" />
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel */}
        <div
          role="tabpanel"
          id={`feature-panel-${active.id}`}
          aria-labelledby={`feature-tab-${active.id}`}
          className="mt-10"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2"
            >
              <div>
                <h3 className="text-balance text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
                  {active.headline}
                </h3>
                <p className="mt-3 max-w-md text-pretty text-base text-muted-foreground">
                  {active.body}
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {active.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-foreground">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Card variant="flat" density="compact" className="mt-6 max-w-xs">
                  <CardContent className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {active.stat.label}
                    </span>
                    <span className="text-2xl font-black tracking-tight tabular-nums text-foreground">
                      {active.stat.value}
                    </span>
                  </CardContent>
                </Card>
              </div>
              <div className="relative">
                <div
                  aria-hidden="true"
                  className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand/10 to-brand-bright/10 blur-2xl"
                />
                <div className="relative">{active.mockup}</div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
