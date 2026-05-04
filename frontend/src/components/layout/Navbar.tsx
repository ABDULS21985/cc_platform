'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import {
  motion,
  useScroll,
  useTransform,
} from 'framer-motion';
import { Button } from '../ui/button';
import { ThemeSwitcher } from './ThemeSwitcher';
import { cn } from '@/lib/utils';

interface NavLink {
  label: string;
  href: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Built for', href: '#built-for' },
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { scrollYProgress } = useScroll();
  const progressScaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 w-full transition-all duration-200',
          scrolled
            ? 'border-b border-border/80 bg-background/85 backdrop-blur-xl'
            : 'border-b border-transparent bg-transparent'
        )}
      >
        <nav
          aria-label="Primary"
          className={cn(
            'mx-auto flex w-full max-w-7xl items-center justify-between px-4 transition-[height] duration-200 sm:px-6 lg:px-8',
            scrolled ? 'h-14' : 'h-16'
          )}
        >
          <Link href="/" className="flex items-center gap-2" aria-label="CCPay home">
            <Image
              src="/images/main-logo.svg"
              alt=""
              width={36}
              height={36}
              className="h-8 w-8"
              aria-hidden="true"
            />
            <span className="text-base font-semibold tracking-tight">CCPay</span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="relative inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-2 md:flex">
            <ThemeSwitcher compact />
            <Link
              href="/signin"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link href="/get-started">
              <Button size="default">Get started</Button>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((v) => !v)}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav"
            className="grid size-10 place-items-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            {isMobileMenuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </nav>

        {/* Scroll progress indicator */}
        <motion.div
          aria-hidden="true"
          style={{ scaleX: progressScaleX }}
          className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-brand to-brand-bright"
        />
      </header>

      {/* Mobile drawer */}
      {isMobileMenuOpen && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-14 z-30 origin-top border-b border-border bg-background/95 backdrop-blur-xl md:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-xl px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-accent"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <ThemeSwitcher compact />
              <Link
                href="/signin"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-center text-sm font-semibold text-foreground"
              >
                Sign in
              </Link>
              <Link
                href="/get-started"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex-1"
              >
                <Button size="default" block>
                  Get started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
