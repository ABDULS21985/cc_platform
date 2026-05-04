'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  /** Title rendered in the form column. */
  title: string;
  /** Lead paragraph under the title. Accepts inline JSX (e.g. for highlighted email addresses). */
  subtitle?: React.ReactNode;
  /** Marketing copy on the hero panel (desktop only). */
  heroTitle?: React.ReactNode;
  heroDescription?: React.ReactNode;
  /** Show the back button (defaults to true). Pass false on the first step of a flow. */
  showBack?: boolean;
  /** Override the back-button behavior. Defaults to router.back(). */
  onBack?: () => void;
  /** Footer rendered under the form. e.g. "Don't have an account? Sign up". */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Unified chrome for every screen under app/(auth)/.
 *
 * Layout: hero panel (left, desktop only) + form column (right).
 * Both columns scroll independently on mobile via min-h-screen + overflow.
 * Brand-driven, dark-mode aware, respects safe-area insets on iOS.
 */
export function AuthLayout({
  title,
  subtitle,
  heroTitle,
  heroDescription,
  showBack = true,
  onBack,
  footer,
  children,
  className,
}: AuthLayoutProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:flex-row">
      {/* Hero panel */}
      <aside className="relative hidden overflow-hidden lg:flex lg:w-5/12 lg:flex-col lg:justify-between lg:p-12 gradient-primary">
        {/* Layered radial highlights */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -left-12 top-24 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-32 right-12 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <Link
          href="/"
          className="relative z-10 inline-flex w-fit items-center gap-3 rounded-2xl bg-white/10 p-3 text-white backdrop-blur-md transition-transform hover:scale-[1.02]"
          aria-label="CCPay home"
        >
          <Image
            src="/images/main-logo.svg"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8"
            aria-hidden="true"
          />
          <Image
            src="/images/ccpay.png"
            alt="CCPay"
            width={88}
            height={24}
            className="h-6 w-auto brightness-200"
          />
        </Link>

        <div className="relative z-10">
          {heroTitle && (
            <h2 className="text-balance text-4xl font-extrabold leading-[1.1] tracking-tight text-white xl:text-5xl">
              {heroTitle}
            </h2>
          )}
          {heroDescription && (
            <p className="mt-5 max-w-md text-pretty text-lg font-medium text-white/85">
              {heroDescription}
            </p>
          )}

          {/* Trust strip */}
          <ul className="mt-10 flex items-center gap-6 text-xs font-medium uppercase tracking-widest text-white/70">
            <li>End-to-end encrypted</li>
            <li>·</li>
            <li>Bank-grade KYC</li>
          </ul>
        </div>
      </aside>

      {/* Form column */}
      <main
        className={cn(
          'flex w-full flex-1 flex-col items-center px-5 py-8 sm:px-12 lg:w-7/12 lg:px-16 lg:py-14',
          className
        )}
      >
        {/* Mobile logo */}
        <div className="mb-6 flex w-full max-w-[440px] items-center justify-between lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-card p-2 shadow-xs ring-1 ring-border"
            aria-label="CCPay home"
          >
            <Image
              src="/images/main-logo.svg"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7"
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="flex w-full max-w-[440px] flex-1 flex-col">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-xs transition-colors hover:border-input hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
          )}

          <header className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-base text-muted-foreground sm:text-lg">{subtitle}</p>
            )}
          </header>

          <div className="flex-1">{children}</div>

          {footer && (
            <footer className="mt-8 text-center text-sm text-muted-foreground">
              {footer}
            </footer>
          )}
        </div>
      </main>
    </div>
  );
}
