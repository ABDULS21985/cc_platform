'use client';

import * as React from 'react';
import { useState } from 'react';
import { CreditCard, MoreHorizontal, Phone } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

interface Subscription {
  id: number;
  name: string;
  description: string;
  amount: string;
  cadence: string;
}

const ACTIVE: Subscription[] = [
  { id: 1, name: 'Yalleman', description: 'Membership subscription', amount: '₦120', cadence: 'Monthly' },
  { id: 2, name: 'Lekki Estate dues', description: 'Estate management', amount: '₦18,500', cadence: 'Monthly' },
  { id: 3, name: 'Cryptos NG · Pro', description: 'Trading academy access', amount: '₦4,500', cadence: 'Quarterly' },
];

export function SubscriptionsContent() {
  const [tab, setTab] = useState('active');

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="active">
          Active <Badge variant="successSoft" size="sm" className="ml-2">{ACTIVE.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="inactive">Inactive</TabsTrigger>
      </TabsList>

      <TabsContent value="active" className="mt-5 space-y-3">
        {ACTIVE.map((sub) => (
          <Card key={sub.id} variant="default" density="compact">
            <CardContent className="flex items-center justify-between gap-3 px-5">
              <div className="flex items-center gap-3">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-accent-foreground"
                  aria-hidden="true"
                >
                  <CreditCard className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight text-foreground">
                    {sub.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {sub.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-bold tabular-nums text-foreground">
                    {sub.amount}
                  </p>
                  <p className="text-xs text-muted-foreground">/{sub.cadence}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Options for ${sub.name}`}
                >
                  <MoreHorizontal className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="inactive" className="mt-5">
        <EmptyState
          icon={<Phone className="size-5" aria-hidden="true" />}
          title="No inactive subscriptions"
          description="When you cancel or pause a subscription, it'll appear here."
        />
      </TabsContent>
    </Tabs>
  );
}
