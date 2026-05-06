'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Globe, LogOut, MapPin, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ApiService, type AuthSessionApi } from '@/services/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function isMobile(session: AuthSessionApi): boolean {
  const os = (session.os || '').toLowerCase();
  return os.includes('ios') || os.includes('android');
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function LoginHistoryContent() {
  const [sessions, setSessions] = useState<AuthSessionApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await ApiService.auth.sessions.list();
      setSessions(res.data?.data?.sessions ?? []);
    } catch {
      toast.error('Could not load login history');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRevoke = async (id: number) => {
    setRevoking(id);
    try {
      await ApiService.auth.sessions.revoke(id);
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, revoked_at: new Date().toISOString(), is_active: false } : s,
        ),
      );
      toast.success('Session signed out');
    } catch {
      toast.error('Could not revoke session');
    } finally {
      setRevoking(null);
    }
  };

  const handleSignOutAll = async () => {
    setSigningOutAll(true);
    try {
      await ApiService.auth.sessions.revokeAllOthers();
      toast.success('Signed out of all other sessions');
      await load();
    } catch {
      toast.error('Could not sign out other sessions');
    } finally {
      setSigningOutAll(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3 rounded" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }

  const visible = sessions;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Recent sign-ins to your account, across devices and browsers.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leadingIcon={<LogOut className="size-3.5" />}
          onClick={handleSignOutAll}
          disabled={signingOutAll || visible.length === 0}
        >
          {signingOutAll ? 'Signing out…' : 'Sign out everywhere else'}
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Monitor className="size-5" aria-hidden="true" />}
          title="No active sessions"
          description="When you sign in from a device, it will appear here."
        />
      ) : (
        <Card variant="default" density="compact">
          <CardContent className="divide-y divide-border px-0">
            {visible.map((s) => {
              const DeviceIcon = isMobile(s) ? Smartphone : Monitor;
              const isRevoked = !!s.revoked_at;
              return (
                <div
                  key={s.id}
                  className={cn(
                    'flex items-start justify-between gap-4 px-5 py-4',
                    isRevoked && 'opacity-60',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"
                      aria-hidden="true"
                    >
                      <DeviceIcon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">
                          {s.device_label || 'Unknown device'}
                          {s.browser ? ` · ${s.browser}` : ''}
                        </p>
                        {isRevoked && (
                          <Badge variant="destructiveSoft" size="sm">
                            Revoked
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {s.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" aria-hidden="true" />
                            {s.location}
                          </span>
                        )}
                        {s.ip && (
                          <span className="inline-flex items-center gap-1">
                            <Globe className="size-3" aria-hidden="true" />
                            {s.ip}
                          </span>
                        )}
                        <time className="font-mono tabular-nums">
                          {formatTimestamp(s.last_seen_at)}
                        </time>
                      </div>
                    </div>
                  </div>

                  {!isRevoked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevoke(s.id)}
                      disabled={revoking === s.id}
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      leadingIcon={<LogOut className="size-3.5" />}
                    >
                      {revoking === s.id ? 'Signing out…' : 'Sign out'}
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
