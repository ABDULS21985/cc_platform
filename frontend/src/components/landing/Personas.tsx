'use client';

import * as React from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  Church,
  HeartHandshake,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn, StaggerList, StaggerItem } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

interface Persona {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  stat: string;
  /** Tailwind tone class for the icon tile background. */
  tone: string;
}

const PERSONAS: Persona[] = [
  {
    icon: Building2,
    title: 'Estate & HOA',
    description: 'Collect dues, fund repairs, and post receipts — every block sees the same ledger.',
    stat: '~840 estates',
    tone: 'bg-info/15 text-info',
  },
  {
    icon: Church,
    title: 'Church & ministry',
    description: 'Tithes, offerings, mission funds — separate wallets, one transparent treasury.',
    stat: '~430 ministries',
    tone: 'bg-warning/15 text-warning',
  },
  {
    icon: HeartHandshake,
    title: 'Friends & family',
    description: 'Group savings, gift pools, target funds — split anything in seconds.',
    stat: '~2.8k circles',
    tone: 'bg-success/15 text-success',
  },
  {
    icon: Users,
    title: 'Cooperatives',
    description: 'Members contribute, payouts rotate, audit log keeps everyone honest.',
    stat: '~620 co-ops',
    tone: 'bg-brand/15 text-primary',
  },
  {
    icon: Calendar,
    title: 'Event organizers',
    description: 'Sell tickets, collect deposits, settle vendors — all from one dashboard.',
    stat: '~1.1k events / mo',
    tone: 'bg-info/15 text-info',
  },
  {
    icon: Briefcase,
    title: 'Small business teams',
    description: 'Petty cash, expense pools, vendor settlement — without the bank visit.',
    stat: '~350 teams',
    tone: 'bg-brand-bright/15 text-primary',
  },
];

export function Personas() {
  return (
    <section
      id="built-for"
      aria-labelledby="personas-heading"
      className="relative px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <Badge variant="soft" size="lg">
            Built for
          </Badge>
        </FadeIn>
        <FadeIn delay={0.05}>
          <h2
            id="personas-heading"
            className="mt-4 max-w-2xl text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
          >
            Whatever you call your circle, CCPay fits.
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="mt-3 max-w-xl text-pretty text-base text-muted-foreground">
            From estate associations to running clubs, every group needs a treasurer
            and a ledger. We give you both — without the spreadsheet.
          </p>
        </FadeIn>

        <StaggerList className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map((p) => (
            <StaggerItem key={p.title}>
              <Card variant="default" interactive className="h-full">
                <CardContent className="flex h-full flex-col gap-3 px-5">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'grid size-10 place-items-center rounded-xl',
                        p.tone
                      )}
                    >
                      <p.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {p.stat}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground">
                    {p.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {p.description}
                  </p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}
