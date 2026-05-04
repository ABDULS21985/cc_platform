'use client';

import * as React from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
} from 'framer-motion';
import { Activity, Banknote, Building2, Users } from 'lucide-react';

interface Stat {
  label: string;
  value: number;
  /** Suffix appended after the number (e.g. "k+", "M+", "%"). */
  suffix?: string;
  /** Prefix prepended before the number (e.g. "₦"). */
  prefix?: string;
  /** Decimal places to show (e.g. 2 for "1.20"). */
  decimals?: number;
  icon: React.ComponentType<{ className?: string }>;
  /** Force a specific formatted string regardless of count-up — e.g. "99.97%". */
  format?: (value: number) => string;
}

const STATS: Stat[] = [
  {
    label: 'Active communities',
    value: 5240,
    suffix: '+',
    icon: Building2,
    format: (v) => `${(v / 1000).toFixed(1).replace(/\.0$/, '')}k+`,
  },
  {
    label: 'Members onboarded',
    value: 124000,
    suffix: '+',
    icon: Users,
    format: (v) => `${Math.round(v / 1000)}k+`,
  },
  {
    label: 'Moved monthly',
    value: 1.2,
    prefix: '₦',
    suffix: 'B+',
    icon: Banknote,
    decimals: 1,
  },
  {
    label: 'Settlement uptime',
    value: 99.97,
    suffix: '%',
    icon: Activity,
    decimals: 2,
  },
];

interface AnimatedNumberProps {
  to: number;
  decimals?: number;
  format?: (v: number) => string;
  prefix?: string;
  suffix?: string;
  active: boolean;
}

function AnimatedNumber({
  to,
  decimals = 0,
  format,
  prefix,
  suffix,
  active,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 1500, bounce: 0 });
  const display = useTransform(spring, (v) =>
    format ? format(v) : `${prefix ?? ''}${v.toFixed(decimals)}${suffix ?? ''}`
  );

  React.useEffect(() => {
    motionValue.set(active ? to : 0);
  }, [active, to, motionValue]);

  return <motion.span>{display}</motion.span>;
}

export function StatsStrip() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4, once: true });

  return (
    <section
      ref={ref}
      aria-label="CCPay impact"
      className="relative px-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border/60 sm:grid-cols-4">
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{
                delay: 0.1 + i * 0.08,
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group flex flex-col gap-2 bg-card p-5 transition-colors hover:bg-card/80 sm:p-6"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brand-soft text-accent-foreground transition-transform group-hover:scale-105">
                <stat.icon className="size-4" aria-hidden="true" />
              </span>
              <p className="text-2xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-3xl">
                <AnimatedNumber
                  to={stat.value}
                  decimals={stat.decimals}
                  format={stat.format}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                  active={inView}
                />
              </p>
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
