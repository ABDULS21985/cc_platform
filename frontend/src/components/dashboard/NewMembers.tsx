'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Check, MessageCircle, UserPlus, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface Member {
  id: number;
  name: string;
  role: string;
  community: string;
  avatar?: string;
  fallback: string;
}

const MEMBERS: Member[] = [
  {
    id: 1,
    name: 'Sherifat Mobolaji',
    role: 'UI/UX designer',
    community: 'UI/UX Africa',
    fallback: 'SM',
  },
  {
    id: 2,
    name: 'John Smith',
    role: 'Frontend dev',
    community: 'Lagos Devs',
    fallback: 'JS',
  },
  {
    id: 3,
    name: 'Sarah Wilson',
    role: 'Product manager',
    community: 'Cryptos NG',
    fallback: 'SW',
  },
  {
    id: 4,
    name: 'Mike Johnson',
    role: 'Backend engineer',
    community: 'Lagos Devs',
    fallback: 'MJ',
  },
];

export default function NewMembers({ loading = false }: { loading?: boolean }) {
  // Track invited state per-member so the row updates after click.
  const [invited, setInvited] = React.useState<Set<number>>(new Set());

  const toggleInvite = (id: number) => {
    setInvited((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Card variant="default" density="compact">
      <CardContent className="space-y-4 px-5">
        <header className="flex items-center justify-between">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <span className="grid size-7 place-items-center rounded-lg bg-brand-soft text-accent-foreground">
              <Users className="size-3.5" aria-hidden="true" />
            </span>
            New members
          </h3>
          <Link
            href="#"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline underline-offset-4"
          >
            See all
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        </header>

        {loading ? (
          <ul className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
                <Skeleton className="h-7 w-14 rounded-full" />
              </li>
            ))}
          </ul>
        ) : (
          <ul role="list" className="space-y-3">
            {MEMBERS.map((m) => {
              const isInvited = invited.has(m.id);
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="size-9">
                      <AvatarImage src={m.avatar} alt="" />
                      <AvatarFallback className="bg-muted text-foreground text-[11px] font-semibold">
                        {m.fallback}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                        {m.name}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {m.role} · {m.community}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      aria-label={`Message ${m.name}`}
                      className="hidden sm:inline-flex"
                    >
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isInvited ? 'soft' : 'outline'}
                      onClick={() => toggleInvite(m.id)}
                      leadingIcon={
                        isInvited ? (
                          <Check className="size-3.5" />
                        ) : (
                          <UserPlus className="size-3.5" />
                        )
                      }
                    >
                      {isInvited ? 'Invited' : 'Invite'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
