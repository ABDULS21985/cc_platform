'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { CheckCircle2, Fingerprint, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { cn } from '@/lib/utils';

interface VerificationState {
  bvn_verified?: boolean;
  nin_verified?: boolean;
  status?: string;
}

interface VerifierFormState {
  number: string;
  dob: string;
  loading: boolean;
}

const EMPTY_FORM: VerifierFormState = { number: '', dob: '', loading: false };

export function VerificationContent() {
  const [data, setData] = useState<VerificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [bvnForm, setBvnForm] = useState<VerifierFormState>(EMPTY_FORM);
  const [ninForm, setNinForm] = useState<VerifierFormState>(EMPTY_FORM);

  const loadStatus = React.useCallback(async () => {
    try {
      const [profileRes, statusRes] = await Promise.all([
        ApiService.profile.get(),
        ApiService.verification.getStatus(),
      ]);
      const profile = profileRes.data?.data;
      const status = statusRes.data?.data;
      setData({
        bvn_verified: !!profile?.bvn_verified,
        nin_verified: !!profile?.nin_verified,
        status: profile?.verification_status || status?.status,
      });
    } catch (err) {
      toastAxiosError(err, 'Failed to load verification status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleVerify = async (
    type: 'bvn' | 'nin',
    state: VerifierFormState,
    setState: React.Dispatch<React.SetStateAction<VerifierFormState>>
  ) => {
    if (!state.number || !state.dob) {
      toast.error(`Enter your ${type.toUpperCase()} and date of birth`);
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const payload = { date_of_birth: state.dob };
      const res =
        type === 'bvn'
          ? await ApiService.verification.verifyBvn({
              ...payload,
              bvn: state.number,
            })
          : await ApiService.verification.verifyNin({
              ...payload,
              nin: state.number,
            });
      const apiResponse = res.data;
      if (apiResponse.success && apiResponse.data) {
        if (apiResponse.data.task_id) {
          toast.success('Verification started…');
          window.location.href = `/verifying?taskId=${apiResponse.data.task_id}&returnUrl=/dashboard/settings`;
        } else if (
          apiResponse.data.status === 'verified' ||
          apiResponse.data.status === 'success'
        ) {
          toast.success(`${type.toUpperCase()} verified`);
          loadStatus();
        }
      }
    } catch (error: unknown) {
      toastAxiosError(
        error,
        `${type.toUpperCase()} verification failed. Check your details and try again.`
      );
    } finally {
      setState((s) => ({ ...s, loading: false }));
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <VerifierBlock
        type="bvn"
        title="Bank Verification Number"
        description="Link your BVN to verify your account."
        verified={!!data?.bvn_verified}
        state={bvnForm}
        setState={setBvnForm}
        onVerify={() => handleVerify('bvn', bvnForm, setBvnForm)}
      />
      <VerifierBlock
        type="nin"
        title="National Identity Number"
        description="Link your NIN for advanced verification."
        verified={!!data?.nin_verified}
        state={ninForm}
        setState={setNinForm}
        onVerify={() => handleVerify('nin', ninForm, setNinForm)}
      />
    </div>
  );
}

interface VerifierBlockProps {
  type: 'bvn' | 'nin';
  title: string;
  description: string;
  verified: boolean;
  state: VerifierFormState;
  setState: React.Dispatch<React.SetStateAction<VerifierFormState>>;
  onVerify: () => void;
}

function VerifierBlock({
  type,
  title,
  description,
  verified,
  state,
  setState,
  onVerify,
}: VerifierBlockProps) {
  const Icon = type === 'bvn' ? Fingerprint : ShieldCheck;
  return (
    <Card variant="default">
      <CardContent className="space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-xl',
                verified
                  ? 'bg-success/15 text-success'
                  : 'bg-brand-soft text-accent-foreground'
              )}
              aria-hidden="true"
            >
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          {verified ? (
            <Badge variant="successSoft" size="lg" className="gap-1.5">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              Verified
            </Badge>
          ) : (
            <Badge variant="warningSoft" size="lg" className="gap-1.5">
              <ShieldAlert className="size-3.5" aria-hidden="true" />
              Unverified
            </Badge>
          )}
        </div>

        {!verified && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onVerify();
            }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            noValidate
          >
            <div className="space-y-1.5">
              <label
                htmlFor={`${type}-number`}
                className="block text-sm font-medium text-foreground"
              >
                {type.toUpperCase()} number
              </label>
              <Input
                id={`${type}-number`}
                value={state.number}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    number: e.target.value.replace(/\D/g, '').slice(0, 11),
                  }))
                }
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="11 digits"
                maxLength={11}
                className="h-12 tabular-nums tracking-widest"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`${type}-dob`}
                className="block text-sm font-medium text-foreground"
              >
                Date of birth
              </label>
              <Input
                id={`${type}-dob`}
                type="date"
                value={state.dob}
                onChange={(e) =>
                  setState((s) => ({ ...s, dob: e.target.value }))
                }
                className="h-12"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                size="default"
                block
                loading={state.loading}
                disabled={state.number.length !== 11 || !state.dob}
              >
                {state.loading ? 'Verifying…' : `Verify ${type.toUpperCase()}`}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
