'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleIcon, AppleIcon } from '@/constants/auth-icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AuthLayout } from '@/components/layout/AuthLayout';

export default function GetStartedPage() {
  const router = useRouter();
  const handleCreateAccount = () => router.push('/account-setup');

  return (
    <AuthLayout
      title="Let's get started"
      subtitle="Join thousands of community members today."
      heroTitle={
        <>
          Find and join communities
          <br />
          that matter to you.
        </>
      }
      heroDescription="Discover like-minded people, engage in shared goals, and grow together in a safe, vibrant space."
      showBack={false}
      footer={
        <>
          Already have an account?{' '}
          <Link
            href="/signin"
            className="font-semibold text-primary hover:underline underline-offset-4"
          >
            Log in
          </Link>
        </>
      }
    >
      <div className="mb-6">
        <Badge variant="soft" size="lg">
          Welcome to Community Circle
        </Badge>
      </div>

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

      <Button
        size="xl"
        block
        onClick={handleCreateAccount}
        className="h-12 text-base"
      >
        Create account via email
      </Button>
    </AuthLayout>
  );
}
