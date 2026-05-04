'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Minus,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, FadeIn, SlideUp } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

const PRESETS = [5_000, 12_500, 25_000, 75_000, 150_000];

function formatNgn(n: number): string {
  return n.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function SplitWidget() {
  const [amount, setAmount] = React.useState(45_000);
  const [people, setPeople] = React.useState(6);

  const perPerson = amount / Math.max(1, people);
  const platformFee = 0;
  const transferFee = 0;

  return (
    <section
      id="split"
      aria-labelledby="split-heading"
      className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/2 h-[480px] w-[680px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-soft/40 blur-[120px]" />
      </div>

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div>
          <FadeIn>
            <Badge variant="soft" size="lg" className="gap-1.5">
              <Sparkles className="size-3" aria-hidden="true" />
              Try it live
            </Badge>
          </FadeIn>
          <SlideUp delay={0.05}>
            <h2
              id="split-heading"
              className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
            >
              Split any bill in seconds.{' '}
              <span className="bg-gradient-to-br from-brand to-brand-bright bg-clip-text text-transparent">
                ₦0 fee.
              </span>
            </h2>
          </SlideUp>
          <SlideUp delay={0.1}>
            <p className="mt-3 max-w-md text-pretty text-base text-muted-foreground">
              Estate dues, marathon t-shirts, that group dinner — every member
              pays their share into the community wallet, and CCPay handles the
              math.
            </p>
          </SlideUp>
          <FadeIn delay={0.2}>
            <ul className="mt-6 space-y-2 text-sm">
              {[
                'Members pay individually — no manual collection.',
                'Real-time progress bar so you see who’s in.',
                'Auto-reconciles into the community pool the moment funds clear.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2 text-foreground">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-success"
                    aria-hidden="true"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </FadeIn>
          <FadeIn delay={0.3}>
            <Link href="/get-started" className="mt-7 inline-block">
              <Button size="lg" trailingIcon={<ArrowRight className="size-4" />}>
                Try it with your community
              </Button>
            </Link>
          </FadeIn>
        </div>

        {/* Widget */}
        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand/10 to-brand-bright/10 blur-2xl"
          />
          <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-7">
            <header className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold tracking-tight text-foreground">
                Bill split calculator
              </p>
              <Badge variant="successSoft" size="sm">
                Live
              </Badge>
            </header>

            {/* Amount */}
            <fieldset className="mb-5">
              <legend className="mb-2 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Total amount
              </legend>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
                <span className="text-xl font-bold text-muted-foreground">₦</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={amount.toLocaleString()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    const next = Math.min(10_000_000, parseInt(raw || '0', 10));
                    setAmount(next);
                  }}
                  className="w-full bg-transparent text-2xl font-extrabold tabular-nums tracking-tight text-foreground outline-none"
                  aria-label="Total amount"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAmount(p)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      amount === p
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-input hover:text-foreground'
                    )}
                  >
                    ₦{p.toLocaleString()}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* People */}
            <fieldset className="mb-5">
              <legend className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" aria-hidden="true" />
                  Members
                </span>
                <span className="font-mono text-foreground tabular-nums normal-case tracking-normal">
                  {people}
                </span>
              </legend>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPeople((p) => Math.max(1, p - 1))}
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-input hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Decrease members"
                >
                  <Minus className="size-4" />
                </button>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={people}
                  onChange={(e) => setPeople(parseInt(e.target.value, 10))}
                  aria-label="Number of members"
                  className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
                />
                <button
                  type="button"
                  onClick={() => setPeople((p) => Math.min(50, p + 1))}
                  className="grid size-10 shrink-0 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-input hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Increase members"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </fieldset>

            {/* Output */}
            <motion.div
              key={`${amount}-${people}`}
              initial={{ opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl border border-border bg-gradient-to-br from-brand-soft/70 to-card p-5"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Each member pays
              </p>
              <p className="mt-1 flex items-baseline gap-1 text-foreground">
                <span className="text-base font-bold text-muted-foreground">₦</span>
                <span className="text-4xl font-black tabular-nums tracking-tight">
                  {formatNgn(perPerson)}
                </span>
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-background/60 p-3">
                  <dt className="font-semibold uppercase tracking-widest text-muted-foreground">
                    Platform fee
                  </dt>
                  <dd className="mt-1 inline-flex items-center gap-1 font-bold text-success">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    ₦{platformFee.toFixed(2)}
                  </dd>
                </div>
                <div className="rounded-lg bg-background/60 p-3">
                  <dt className="font-semibold uppercase tracking-widest text-muted-foreground">
                    Transfer fee
                  </dt>
                  <dd className="mt-1 inline-flex items-center gap-1 font-bold text-success">
                    <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    ₦{transferFee.toFixed(2)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 text-[11px] text-muted-foreground">
                You and your members keep <span className="font-semibold text-foreground">100% of every Naira</span>.
                CCPay&apos;s revenue comes from optional premium tools, never from member contributions.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
