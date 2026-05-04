'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { GoogleIcon, AppleIcon } from '@/constants/auth-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { AuthLayout } from '@/components/layout/AuthLayout';

export default function AccountLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await ApiService.auth.login({ email, password });
      const loginData = response.data;

      if (loginData.tokens && loginData.tokens.access_token) {
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

        toast.success('Logged in successfully');
        router.push('/dashboard');
      } else {
        toast.error('Login failed: ' + (loginData.message || 'No token received'));
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
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to pick up where you left off."
      heroTitle={
        <>
          Sign in to
          <br />
          your circle.
        </>
      }
      heroDescription="Stay connected with the communities, bills and people that matter."
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link
            href="/get-started"
            className="font-semibold text-primary hover:underline underline-offset-4"
          >
            Sign up
          </Link>
        </>
      }
    >
      {/* Social */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          block
          className="h-12"
          leadingIcon={<GoogleIcon className="h-5 w-5" />}
        >
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          block
          className="h-12"
          leadingIcon={<AppleIcon className="h-5 w-5" />}
        >
          Continue with Apple
        </Button>
      </div>

      <div
        role="separator"
        aria-hidden="true"
        className="my-6 flex items-center gap-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground"
      >
        <span className="h-px flex-1 bg-border" />
        Or
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-5" noValidate>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email address
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
              className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Eye className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          size="xl"
          block
          loading={isLoading}
          className="mt-2 h-12 text-base"
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
