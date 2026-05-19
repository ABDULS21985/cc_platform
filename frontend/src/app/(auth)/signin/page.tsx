'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Mail,
  MessageCircle,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { GoogleIcon, AppleIcon } from '@/constants/auth-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import {
  FadeIn,
  SlideUp,
  StaggerList,
  StaggerItem,
  motion,
} from '@/components/ui/motion';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
import { cn } from '@/lib/utils';

const VALUE_PROPS = [
  { icon: Wallet, label: 'Your communities and bills, right where you left them' },
  { icon: Fingerprint, label: 'Encrypted login · MFA-ready' },
  { icon: Mail, label: 'Sign in with phone number or email' },
] as const;

export default function SignInPage() {
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);

  const router = useRouter();

  React.useEffect(() => {
    const presetIdentifier = new URLSearchParams(window.location.search).get('identifier');
    if (presetIdentifier) setIdentifier(presetIdentifier);
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!identifier || !password) {
      toast.error('Please enter your email/phone and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await ApiService.auth.login({
        identifier,
        password,
        remember: rememberMe,
      });
      const loginData = response.data.data;

      if (loginData?.tokens && loginData.tokens.access_token) {
        localStorage.setItem('access_token', loginData.tokens.access_token);
        localStorage.setItem('refresh_token', loginData.tokens.refresh_token);
        if (loginData.user) {
          localStorage.setItem('user_data', JSON.stringify(loginData.user));
        }
        if (loginData.verification) {
          localStorage.setItem(
            'verification_data',
            JSON.stringify(loginData.verification)
          );
        }
        toast.success('Welcome back');
        router.push('/dashboard');
      } else {
        toast.error('Login failed: ' + (response.data.message || 'No token received'));
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      toastAxiosError(
        error,
        'Login failed. Please check your credentials and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* Ambient brand glow */}
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
            href="/get-started"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            New here?{' '}
            <span className="font-semibold text-primary underline-offset-4 hover:underline">
              Sign up
            </span>
          </Link>
        </div>
      </header>

      {/* Main grid */}
      <main className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-10 lg:pt-8">
        {/* Form column */}
        <section className="flex flex-col justify-center" aria-labelledby="signin-heading">
          <FadeIn>
            <Badge variant="soft" size="lg" className="gap-1.5">
              <Sparkles className="size-3" aria-hidden="true" />
              Welcome back
            </Badge>
          </FadeIn>

          <SlideUp delay={0.05}>
            <h1
              id="signin-heading"
              className="mt-5 text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]"
            >
              Sign in to your{' '}
              <span className="bg-gradient-to-br from-brand to-brand-bright bg-clip-text text-transparent">
                circle.
              </span>
            </h1>
          </SlideUp>

          <SlideUp delay={0.1}>
            <p className="mt-4 max-w-lg text-pretty text-base text-muted-foreground sm:text-lg">
              Pick up exactly where you left off — your wallet, your communities, and
              every pending bill are right here.
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
            <form
              onSubmit={handleLogin}
              noValidate
              className="mt-8 rounded-2xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-md"
              aria-label="Sign in to your account"
            >
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
                Or sign in with email or phone
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="identifier"
                    className="block text-sm font-medium text-foreground"
                  >
                    Email or phone number
                  </label>
                  <Input
                    id="identifier"
                    type="text"
                    inputMode="text"
                    autoComplete="username"
                    placeholder="name@example.com or +234..."
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-foreground"
                    >
                      Password
                    </label>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-primary hover:underline underline-offset-4"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <label
                  htmlFor="remember-me"
                  className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground"
                >
                  <span
                    className={cn(
                      'grid size-5 place-items-center rounded-md border transition-colors',
                      rememberMe
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input bg-background'
                    )}
                  >
                    {rememberMe && <CheckCircle2 className="size-3" aria-hidden="true" />}
                  </span>
                  <input
                    id="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  Keep me signed in on this device
                </label>

                <Button
                  type="submit"
                  size="xl"
                  block
                  loading={isLoading}
                  trailingIcon={!isLoading ? <ArrowRight className="size-4" /> : undefined}
                  className="h-12 text-base"
                >
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </Button>
              </div>

              <p className="mt-4 text-center text-xs text-muted-foreground">
                Trouble signing in? Try a{' '}
                <Link
                  href="/forgot-password"
                  className="font-semibold text-foreground hover:underline"
                >
                  password reset
                </Link>{' '}
                or{' '}
                <Link href="/" className="font-semibold text-foreground hover:underline">
                  contact support
                </Link>
                .
              </p>
            </form>
          </SlideUp>

          {/* Mobile sign-up echo */}
          <p className="mt-6 text-center text-sm text-muted-foreground sm:hidden">
            New here?{' '}
            <Link
              href="/get-started"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </p>
        </section>

        {/* Hero / mockup column */}
        <section
          aria-hidden="true"
          className="relative hidden min-h-[560px] items-center justify-center lg:flex"
        >
          <div className="relative aspect-[4/5] w-full max-w-[460px]">
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-brand via-brand to-[oklch(0.18_0.025_220)] shadow-2xl" />
            <div className="absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_30%_15%,rgba(255,255,255,0.18),transparent_60%)]" />
            <div className="pointer-events-none absolute -top-10 -right-10 size-44 rounded-full bg-white/10 blur-2xl" />

            {/* Floating card 1 — Greeting */}
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: -3 }}
              animate={{ opacity: 1, y: 0, rotate: -3 }}
              transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-6 top-12 w-[68%] rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-white text-base font-black text-primary shadow-md">
                  A
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                    Welcome back
                  </p>
                  <p className="truncate text-sm font-bold">Ada Lovelace</p>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/30 px-2.5 py-1 text-[10px] font-semibold text-white">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                </span>
                3 communities live
              </div>
            </motion.div>

            {/* Floating card 2 — Recent activity */}
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: 4 }}
              animate={{ opacity: 1, y: 0, rotate: 4 }}
              transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute right-3 top-44 w-[60%] rounded-2xl border border-white/15 bg-white/15 p-4 text-white shadow-xl backdrop-blur-xl"
            >
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
                Last activity
              </p>
              <ul className="mt-2 space-y-2 text-[11px]">
                <li className="flex items-center justify-between gap-2">
                  <span className="truncate">Marathon registration</span>
                  <span className="font-bold text-success-foreground">+₦12.5k</span>
                </li>
                <li className="flex items-center justify-between gap-2 opacity-80">
                  <span className="truncate">Bill split · Estate dues</span>
                  <span className="font-bold">−₦8.2k</span>
                </li>
                <li className="flex items-center justify-between gap-2 opacity-60">
                  <span className="truncate">Top-up · Bell MFB</span>
                  <span className="font-bold text-success-foreground">+₦20k</span>
                </li>
              </ul>
            </motion.div>

            {/* Floating card 3 — Notifications */}
            <motion.div
              initial={{ opacity: 0, y: 24, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: -2 }}
              transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-12 left-8 w-[78%] rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-info/30 text-white">
                  <Bell className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">5 new posts in Lekki Runners</p>
                  <p className="text-[10px] text-white/70">+ 2 unsettled bills awaiting</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                  <MessageCircle className="size-3" aria-hidden="true" />
                  12 unread
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold">
                  <Lock className="size-3" aria-hidden="true" />
                  Encrypted
                </span>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* Footer micro-copy */}
      <footer className="relative z-10 mx-auto w-full max-w-7xl border-t border-border px-5 py-6 sm:px-8 lg:px-10">
        <p className="text-center text-xs text-muted-foreground sm:text-left">
          End-to-end encrypted login · Bell MFB &amp; SafeHaven settlement partners ·{' '}
          <span className="font-medium text-foreground">256-bit secured</span>.
        </p>
      </footer>
    </div>
  );
}
