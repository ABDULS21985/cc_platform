'use client';

import * as React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { FadeIn } from '@/components/ui/motion';

const PARTNERS = [
  { name: 'Bell MFB', role: 'Settlement bank' },
  { name: 'SafeHaven', role: 'Settlement partner' },
  { name: 'Paystack', role: 'Card processor' },
  { name: 'Flutterwave', role: 'Payment rail' },
  { name: 'NIBSS', role: 'NIP transfers' },
] as const;

/**
 * Partner / regulator strip — establishes trust at a glance with
 * settlement + processing partner names + a CBN-regulated badge.
 * Logos are intentionally text-rendered (no fake third-party logos
 * shipped in the bundle); replace with real SVG marks later.
 */
export function PartnerStrip() {
  return (
    <section
      aria-label="Trusted partners and regulation"
      className="border-y border-border bg-card/50 px-4 py-10 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6">
        <FadeIn>
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
            Settlement &amp; processing partners
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
            {PARTNERS.map((p) => (
              <li
                key={p.name}
                className="group flex flex-col items-center gap-0.5 text-center"
              >
                <span className="font-display text-base font-extrabold tracking-tight text-muted-foreground transition-colors group-hover:text-foreground sm:text-lg">
                  {p.name}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/70">
                  {p.role}
                </span>
              </li>
            ))}
          </ul>
        </FadeIn>
        <FadeIn delay={0.2}>
          <Badge variant="successSoft" size="lg" className="gap-1.5">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            Settlement bank regulated by the Central Bank of Nigeria
          </Badge>
        </FadeIn>
      </div>
    </section>
  );
}
