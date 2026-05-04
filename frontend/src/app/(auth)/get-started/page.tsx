'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { GoogleIcon, AppleIcon } from '@/constants/auth-icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FadeIn, SlideUp, StaggerList, StaggerItem, motion } from '@/components/ui/motion';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
import { cn } from '@/lib/utils';

const VALUE_PROPS = [
  { icon: Users, label: 'Communities of any size' },
  { icon: Wallet, label: 'Pool funds, split bills, settle in seconds' },
  { icon: ShieldCheck, label: 'Bank-grade KYC & encryption' },
] as const;

const STATS = [
  { value: '5k+', label: 'Communities' },
  { value: '120k+', label: 'Members' },
  { value: '₦1.2B', label: 'Moved monthly' },
] as const;

export default function GetStartedPage() {
  const router = useRouter();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient brand glow — sits behind everything, themed for both modes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[640px] w-[640px] -translate-x-1/2 rounded-full bg-brand/20 blur-[120px]" />
        <div className="absolute -right-40 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-brand-bright/20 blur-[120px]" />
        <div className="absolute -bottom-40 left-0 h-[360px] w-[360px] rounded-full bg-info/15 blur-[120px]" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="CCPay home" className="inline-flex items-center gap-2">
          <Image
            src="/images/main-logo.svg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9"
            aria-hidden="true"
          />
          <span className="text-base font-semibold tracking-tight">CCPay</span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <Link
            href="/signin"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Already a member?{' '}
            <span className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign in
            </span>
          </Link>
        </div>
      </header>

      {/* Main grid */}
      <main className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-10 lg:pt-8">
        {/* Form column */}
        <section className="flex flex-col justify-center" aria-labelledby="get-started-heading">
          <FadeIn>
            <Badge variant="soft" size="lg" className="gap-1.5">
              <Sparkles className="size-3" aria-hidden="true" />
              Welcome to Community Circle
            </Badge>
          </FadeIn>

          <SlideUp delay={0.05}>
            <h1
              id="get-started-heading"
              className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]"
            >
              Find your circle.{' '}
              <span className="bg-gradient-to-br from-brand to-brand-bright bg-clip-text text-transparent">
                Move money together.
              </span>
            </h1>
          </SlideUp>

          <SlideUp delay={0.1}>
            <p className="mt-4 max-w-lg text-pretty text-base text-muted-foreground sm:text-lg">
              Join thousands of communities raising funds, splitting bills, and running events
              — all with a wallet that&apos;s actually built for groups.
            </p>
          </SlideUp>

          {/* Value props */}
          <StaggerList className="mt-7 space-y-2.5">
            {VALUE_PROPS.map(({ icon: Icon, label }) => (
              <StaggerItem
                key={label}
                className="flex items-center gap-3 text-sm text-foreground"
              >
                <span className="grid size-7 place-items-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                </span>
                <span className="inline-flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  {label}
                </span>
              </StaggerItem>
            ))}
          </StaggerList>

          {/* CTA card */}
          <SlideUp delay={0.18}>
            <div className="mt-8 rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-md">
              {/* Social */}
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  block
                  leadingIcon={<GoogleIcon className="h-5 w-5" />}
                  className="h-12"
                >
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  block
                  leadingIcon={<AppleIcon className="h-5 w-5" />}
                  className="h-12"
                >
                  Apple
                </Button>
              </div>

              <div
                role="separator"
                aria-hidden="true"
                className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                <span className="h-px flex-1 bg-border" />
                Or continue with email
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                size="xl"
                block
                onClick={() => router.push('/account-setup')}
                leadingIcon={<Mail className="size-4" />}
                trailingIcon={<ArrowRight className="size-4" />}
                className="h-12 text-base"
              >
                Create your account
              </Button>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                By continuing you agree to our{' '}
                <Link href="/" className="font-medium text-foreground hover:underline">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/" className="font-medium text-foreground hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </SlideUp>

          {/* Trust strip */}
          <FadeIn delay={0.3}>
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6 sm:gap-6">
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <dt className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    {label}
                  </dt>
                  <dd className="mt-1 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </FadeIn>

          {/* Mobile sign-in echo */}
          <p className="mt-6 text-center text-sm text-muted-foreground sm:hidden">
            Already a member?{' '}
            <Link
              href="/signin"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </section>

        {/* Hero / mockup column */}
        <section
          aria-hidden="true"
          className="relative hidden min-h-[560px] items-center justify-center lg:flex"
        >
          {/* Background gradient frame */}
          <div className="relative aspect-[4/5] w-full max-w-[460px]">
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-brand via-brand to-[oklch(0.18_0.025_220)] shadow-2xl" />
            <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.18),transparent_60%)]" />
            <div className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full bg-white/10 blur-2xl" />

            {/* Floating card 1 — Wallet balance */}
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: -4 }}
              animate={{ opacity: 1, y: 0, rotate: -4 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-6 top-12 w-[68%] rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-white/70">
                <span>Active balance</span>
                <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[9px]">NGN</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-base font-semibold text-white/70">₦</span>
                <span className="text-3xl font-black tabular-nums tracking-tight">428,500</span>
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

            {/* Floating card 2 — Community */}
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: 5 }}
              animate={{ opacity: 1, y: 0, rotate: 5 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-4 top-44 w-[58%] rounded-2xl border border-white/15 bg-white/15 p-4 text-white shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-white text-primary text-base font-black">
                  L
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">Lekki Runners</p>
                  <p className="text-[10px] text-white/70">238 members · Active</p>
                </div>
              </div>
              <div className="mt-3 flex -space-x-1.5">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="size-6 rounded-full border-2 border-white/40 bg-gradient-to-br from-white/40 to-white/10"
                  />
                ))}
                <span className="ml-2 self-center text-[10px] font-semibold text-white/80">
                  +234
                </span>
              </div>
            </motion.div>

            {/* Floating card 3 — Transaction */}
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: -3 }}
              animate={{ opacity: 1, y: 0, rotate: -3 }}
              transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-10 left-8 w-[78%] rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-success/30 text-white">
                  <Zap className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">Marathon registration</p>
                  <p className="text-[10px] text-white/70">Lekki Runners · just now</p>
                </div>
                <span className="text-sm font-bold text-success-foreground">
                  +₦12,500
                </span>
              </div>
            </motion.div>

            {/* Live pulse */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="absolute right-6 bottom-44 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur-md"
            >
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              42 transfers / min
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer micro-copy */}
      <footer className="relative z-10 mx-auto w-full max-w-7xl border-t border-border px-5 py-6 sm:px-8 lg:px-10">
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          Trusted by community treasurers, event organizers, and HOAs across Nigeria.
          Bell MFB &amp; SafeHaven settlement partners ·{' '}
          <span className="font-medium text-foreground">256-bit encrypted</span>.
        </p>
      </footer>
    </div>
  );
}
