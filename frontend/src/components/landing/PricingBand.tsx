'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/ui/motion';

const PILLARS = [
  { value: '₦0', label: 'To join' },
  { value: '₦0', label: 'Platform fee' },
  { value: '₦25', label: 'Flat per outbound transfer' },
  { value: '0%', label: 'Of member contributions' },
] as const;

export function PricingBand() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-1/2 top-1/2 h-[480px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-[3rem] bg-gradient-to-br from-brand/15 via-brand-bright/10 to-info/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl rounded-3xl border border-border bg-gradient-to-br from-brand to-[oklch(0.20_0.025_210)] p-8 text-white shadow-2xl sm:p-12">
        <FadeIn>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <Badge variant="outline" className="border-white/30 bg-white/10 text-white backdrop-blur-md">
                Pricing
              </Badge>
              <h2
                id="pricing-heading"
                className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
              >
                Pricing that doesn&apos;t nibble at your circle.
              </h2>
              <p className="mt-3 text-pretty text-base text-white/80">
                We don&apos;t take a cut of member contributions. We don&apos;t bury fees.
                One flat ₦25 per outbound transfer covers Bell MFB&apos;s settlement —
                that&apos;s it.
              </p>
            </div>
            <Link href="/get-started">
              <Button
                size="xl"
                className="h-12 bg-white text-foreground shadow-md hover:bg-white/90"
                trailingIcon={<ArrowRight className="size-4" />}
              >
                Start free
              </Button>
            </Link>
          </div>
        </FadeIn>

        <FadeIn delay={0.15}>
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 lg:grid-cols-4">
            {PILLARS.map((p) => (
              <div
                key={p.label}
                className="flex flex-col gap-1 bg-white/5 p-5 text-white backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                <dt className="text-[11px] font-semibold uppercase tracking-widest text-white/70">
                  {p.label}
                </dt>
                <dd className="text-3xl font-black tabular-nums tracking-tight">
                  {p.value}
                </dd>
              </div>
            ))}
          </dl>
        </FadeIn>

        <FadeIn delay={0.25}>
          <ul className="mt-8 grid gap-3 text-sm text-white/85 sm:grid-cols-2 lg:grid-cols-3">
            {[
              'Unlimited members per community',
              'Unlimited communities per account',
              'Audit log + CSV export included',
              'Multi-signer transfers included',
              'Live settlement, 24/7',
              'Cancel anytime — no lock-in',
            ].map((line) => (
              <li key={line} className="flex items-center gap-2">
                <CheckCircle2
                  className="size-4 shrink-0 text-success"
                  aria-hidden="true"
                />
                {line}
              </li>
            ))}
          </ul>
        </FadeIn>
      </div>
    </section>
  );
}
