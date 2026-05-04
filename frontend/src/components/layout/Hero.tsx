'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { FadeIn, motion, SlideUp } from '../ui/motion';

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-6 pb-16 sm:px-6 lg:px-8 lg:pt-10 lg:pb-24">
      {/* Ambient brand glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-32 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-brand/15 blur-[140px]" />
        <div className="absolute -right-40 top-40 h-[480px] w-[480px] rounded-full bg-brand-bright/15 blur-[140px]" />
        <div className="absolute -bottom-40 left-0 h-[360px] w-[360px] rounded-full bg-info/10 blur-[140px]" />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        {/* Copy column */}
        <div className="relative z-10">
          <FadeIn>
            <Link
              href="/get-started"
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs transition-all hover:border-input hover:shadow-sm"
            >
              <Badge variant="successSoft" size="sm" className="px-2 py-0">
                New
              </Badge>
              Communities now settle in seconds via Bell MFB
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </FadeIn>

          <SlideUp delay={0.05}>
            <h1 className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              Run your community&apos;s money.{' '}
              <span className="bg-gradient-to-br from-brand to-brand-bright bg-clip-text text-transparent">
                Together.
              </span>
            </h1>
          </SlideUp>

          <SlideUp delay={0.1}>
            <p className="mt-5 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
              CCPay gives every community a wallet built for groups — pool funds,
              split bills, run events, and settle in seconds. No spreadsheets, no
              chasing, no fees that nibble.
            </p>
          </SlideUp>

          <SlideUp delay={0.15}>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/get-started" className="contents">
                <Button
                  size="xl"
                  block
                  className="h-12 sm:w-auto sm:px-7"
                  trailingIcon={<ArrowRight className="size-4" />}
                >
                  Get started — it&apos;s free
                </Button>
              </Link>
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:border-input hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="grid size-7 place-items-center rounded-full bg-brand-soft text-accent-foreground">
                  <Play className="size-3.5 translate-x-px" aria-hidden="true" />
                </span>
                Watch 90-second demo
              </button>
            </div>
          </SlideUp>

          <FadeIn delay={0.25}>
            <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {[
                { icon: CheckCircle2, label: 'Free to join' },
                { icon: ShieldCheck, label: 'CBN-compliant settlement' },
                { icon: Users, label: 'Built for groups' },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-1.5">
                  <Icon className="size-4 text-success" aria-hidden="true" />
                  {label}
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>

        {/* Visual column — animated product mockup */}
        <HeroMockup />
      </div>
    </section>
  );
}

/**
 * The animated product surface that lives in the right column on desktop and
 * stacks below on mobile. Uses framer-motion for layered card entrance and
 * subtle continuous parallax.
 */
function HeroMockup() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-[4/5] w-full max-w-[480px] lg:max-w-[520px]"
    >
      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-brand via-brand to-[oklch(0.18_0.025_220)] shadow-2xl" />
      <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full bg-white/10 blur-2xl" />

      {/* Card 1 — Wallet balance */}
      <motion.div
        initial={{ opacity: 0, y: 24, rotate: -4 }}
        animate={{ opacity: 1, y: 0, rotate: -4 }}
        transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-6 top-12 w-[68%] rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
            Lekki Runners · Pool
          </span>
          <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[9px] font-bold">
            NGN
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-base font-semibold text-white/70">₦</span>
          <span className="text-3xl font-black tabular-nums tracking-tight">
            428,500
          </span>
          <span className="text-base font-semibold text-white/70">.00</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px] font-semibold">
          {['Send', 'Fund', 'Pay'].map((label) => (
            <span
              key={label}
              className="grid h-7 place-items-center rounded-lg border border-white/15 bg-white/10"
            >
              {label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Card 2 — Activity feed */}
      <motion.div
        initial={{ opacity: 0, y: 24, rotate: 5 }}
        animate={{ opacity: 1, y: 0, rotate: 5 }}
        transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute right-3 top-44 w-[62%] rounded-2xl border border-white/15 bg-white/15 p-4 text-white shadow-xl backdrop-blur-xl"
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
          Just settled
        </p>
        <ul className="mt-2 space-y-2 text-[11px]">
          <li className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-success/30">
              <ArrowDownLeft className="size-3" />
            </span>
            <span className="flex-1 truncate">Estate dues · Block 3</span>
            <span className="font-bold text-success-foreground">+₦18.5k</span>
          </li>
          <li className="flex items-center gap-2 opacity-90">
            <span className="grid size-6 place-items-center rounded-full bg-white/20">
              <ArrowUpRight className="size-3" />
            </span>
            <span className="flex-1 truncate">Marathon T-shirts</span>
            <span className="font-bold">−₦12.0k</span>
          </li>
          <li className="flex items-center gap-2 opacity-75">
            <span className="grid size-6 place-items-center rounded-full bg-success/30">
              <ArrowDownLeft className="size-3" />
            </span>
            <span className="flex-1 truncate">Bell MFB top-up</span>
            <span className="font-bold text-success-foreground">+₦40.0k</span>
          </li>
        </ul>
      </motion.div>

      {/* Card 3 — Live pulse */}
      <motion.div
        initial={{ opacity: 0, y: 24, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -3 }}
        transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-12 left-8 w-[80%] rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-info/30">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              42 transfers · last 60s
            </p>
            <p className="text-[10px] text-white/70">Across 17 communities</p>
          </div>
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
            <span className="relative inline-flex size-2.5 rounded-full bg-success" />
          </span>
        </div>
      </motion.div>
    </div>
  );
}
