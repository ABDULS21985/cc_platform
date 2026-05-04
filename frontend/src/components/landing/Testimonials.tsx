'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence, FadeIn } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  community: string;
  /** 1-5 */
  rating: number;
  /** initials shown in the fallback avatar */
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "Estate dues used to take three reminder rounds and a spreadsheet. Now it's a link, a notification, and the wallet shows 92% paid by Tuesday.",
    name: 'Adaeze Mbakwe',
    role: 'Treasurer',
    community: 'Crown Estate, Lekki',
    rating: 5,
    initials: 'AM',
  },
  {
    quote:
      "We collected ₦4.2M in three days for the marathon. Vendors got paid out of escrow the same day. No bank visits.",
    name: 'Kunle Adeyemi',
    role: 'Race director',
    community: 'Lagos Half Marathon',
    rating: 5,
    initials: 'KA',
  },
  {
    quote:
      "Audit log is the killer feature for me. Every credit, every approval, who-did-what at AGM time. The board finally trusts the books.",
    name: 'Pastor Bisi Ojo',
    role: 'Senior pastor',
    community: 'Grace Assembly',
    rating: 5,
    initials: 'BO',
  },
  {
    quote:
      "Our co-op rotates payouts monthly. CCPay does the math, posts the receipt, and reconciles before I close my laptop. We replaced two part-time roles.",
    name: 'Funmi Ojo',
    role: 'Secretary',
    community: 'Trinity Co-op',
    rating: 5,
    initials: 'FO',
  },
];

const AUTOPLAY_MS = 6000;

export function Testimonials() {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [paused]);

  const current = TESTIMONIALS[index];
  const prev = () =>
    setIndex((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  const next = () => setIndex((i) => (i + 1) % TESTIMONIALS.length);

  return (
    <section
      aria-labelledby="testimonials-heading"
      className="relative px-4 py-20 sm:px-6 lg:px-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="mx-auto max-w-5xl">
        <FadeIn>
          <div className="text-center">
            <Badge variant="soft" size="lg">
              Loved by treasurers
            </Badge>
            <h2
              id="testimonials-heading"
              className="mt-4 text-balance text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"
            >
              The numbers speak. So do the people.
            </h2>
          </div>
        </FadeIn>

        <div className="relative mt-12 rounded-2xl border border-border bg-card p-8 shadow-xl sm:p-10">
          <Quote
            className="absolute -top-5 left-8 size-10 rounded-xl bg-card p-2 text-primary shadow-md"
            aria-hidden="true"
          />
          <AnimatePresence mode="wait">
            <motion.figure
              key={index}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <div
                className="flex items-center gap-1"
                role="img"
                aria-label={`${current.rating} out of 5 stars`}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'size-4',
                      i < current.rating
                        ? 'fill-warning text-warning'
                        : 'fill-muted text-muted'
                    )}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <blockquote className="text-balance text-xl font-medium leading-relaxed text-foreground sm:text-2xl">
                “{current.quote}”
              </blockquote>
              <figcaption className="flex items-center gap-3">
                <Avatar className="size-11">
                  <AvatarFallback className="bg-brand text-primary-foreground font-bold">
                    {current.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    {current.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {current.role} · {current.community}
                  </p>
                </div>
              </figcaption>
            </motion.figure>
          </AnimatePresence>

          <div className="mt-8 flex items-center justify-between">
            <ol className="flex items-center gap-1.5" aria-label="Testimonial navigation">
              {TESTIMONIALS.map((_, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={`Go to testimonial ${i + 1}`}
                    aria-current={i === index ? 'true' : undefined}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === index ? 'w-6 bg-primary' : 'w-1.5 bg-muted hover:bg-muted-foreground/40'
                    )}
                  />
                </li>
              ))}
            </ol>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prev}
                aria-label="Previous testimonial"
                className="grid size-9 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-input hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Next testimonial"
                className="grid size-9 place-items-center rounded-full border border-border bg-background text-foreground transition-colors hover:border-input hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
