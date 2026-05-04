'use client';

import * as React from 'react';
import { useState } from 'react';
import { Globe, LogOut, MapPin, Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LoginEntry {
  id: number;
  device: string;
  deviceType: 'desktop' | 'mobile';
  browser: string;
  ip: string;
  location: string;
  timestamp: string;
  isCurrent?: boolean;
}

const ENTRIES: LoginEntry[] = [
  {
    id: 1,
    device: 'MacBook Pro',
    deviceType: 'desktop',
    browser: 'Chrome',
    ip: '192.168.1.1',
    location: 'Lagos, Nigeria',
    timestamp: '2026-05-04 10:30',
    isCurrent: true,
  },
  {
    id: 2,
    device: 'iPhone 15',
    deviceType: 'mobile',
    browser: 'Safari',
    ip: '105.112.40.18',
    location: 'Lagos, Nigeria',
    timestamp: '2026-05-03 18:12',
  },
  {
    id: 3,
    device: 'Windows PC',
    deviceType: 'desktop',
    browser: 'Edge',
    ip: '197.210.45.6',
    location: 'Abuja, Nigeria',
    timestamp: '2026-05-01 09:47',
  },
  {
    id: 4,
    device: 'Android phone',
    deviceType: 'mobile',
    browser: 'Chrome',
    ip: '102.89.78.15',
    location: 'Ibadan, Nigeria',
    timestamp: '2026-04-29 22:08',
  },
];

export function LoginHistoryContent() {
  const [revoked, setRevoked] = useState<Set<number>>(new Set());

  const handleRevoke = (id: number) => {
    setRevoked((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    toast.success('Session signed out');
  };

  const handleSignOutAll = () => {
    setRevoked(new Set(ENTRIES.filter((e) => !e.isCurrent).map((e) => e.id)));
    toast.success('Signed out of all other sessions');
  };

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
        >
          Sign out everywhere else
        </Button>
      </div>

      <Card variant="default" density="compact">
        <CardContent className="divide-y divide-border px-0">
          {ENTRIES.map((e) => {
            const DeviceIcon = e.deviceType === 'mobile' ? Smartphone : Monitor;
            const isRevoked = revoked.has(e.id);
            return (
              <div
                key={e.id}
                className={cn(
                  'flex items-start justify-between gap-4 px-5 py-4',
                  isRevoked && 'opacity-60'
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
                        {e.device} · {e.browser}
                      </p>
                      {e.isCurrent && (
                        <Badge variant="successSoft" size="sm">
                          This device
                        </Badge>
                      )}
                      {isRevoked && (
                        <Badge variant="destructiveSoft" size="sm">
                          Revoked
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" aria-hidden="true" />
                        {e.location}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Globe className="size-3" aria-hidden="true" />
                        {e.ip}
                      </span>
                      <time className="font-mono tabular-nums">{e.timestamp}</time>
                    </div>
                  </div>
                </div>

                {!e.isCurrent && !isRevoked && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(e.id)}
                    className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    leadingIcon={<LogOut className="size-3.5" />}
                  >
                    Sign out
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
