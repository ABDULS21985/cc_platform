'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

const APPEAR_AT = 0.4; // Show after 40% page scroll.

/**
 * Mid-scroll CTA bar — appears once the user has read past the hero/widget,
 * and can be dismissed with the X. Persists dismissal in sessionStorage so
 * it doesn't re-appear within the same session.
 */
export function StickyCta() {
  const [visible, setVisible] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const closed = window.sessionStorage.getItem('sticky-cta-dismissed') === '1';
    setDismissed(closed);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? window.scrollY / max : 0;
      // Show in the middle of the page; hide near the very bottom (footer overlap).
      setVisible(ratio >= APPEAR_AT && ratio < 0.92);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('sticky-cta-dismissed', '1');
    }
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4"
        >
          <div
            className={cn(
              'pointer-events-auto flex w-full max-w-2xl items-center gap-3 rounded-full border border-border bg-card/95 p-1.5 pl-4 shadow-2xl backdrop-blur-md',
              'sm:gap-4 sm:p-2 sm:pl-5'
            )}
            role="region"
            aria-label="Promotional call-to-action"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-accent-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              <span className="hidden sm:inline">
                Free to start. Set up your community in under 2 minutes.
              </span>
              <span className="sm:hidden">Free to start · 2 min setup</span>
            </p>
            <Link href="/get-started" className="shrink-0">
              <Button
                size="default"
                trailingIcon={<ArrowRight className="size-4" />}
                className="hidden sm:inline-flex"
              >
                Get started
              </Button>
              <Button size="icon" className="sm:hidden" aria-label="Get started">
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss banner"
              className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
