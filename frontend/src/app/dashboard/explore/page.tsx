'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { DiscoverHero } from '@/components/explore/DiscoverHero';
import { CategoryGrid } from '@/components/explore/CategoryGrid';
import { TrendingRow } from '@/components/explore/TrendingRow';
import { FeaturedEvent } from '@/components/explore/FeaturedEvent';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  estate: 'Estate & HOA',
  faith: 'Faith & ministry',
  sports: 'Sports & fitness',
  'co-op': 'Cooperatives',
  tech: 'Tech & startups',
  education: 'Education',
  business: 'Small business',
  arts: 'Arts & culture',
  music: 'Music',
  social: 'Friends & family',
};

export default function ExplorePage() {
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = React.useState('');

  // Debounce search so the trending row doesn't refetch on every keystroke.
  React.useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  // When a category is picked, push it into the search query so the row filters.
  const effectiveSearch = debouncedSearch || (category ? CATEGORY_LABEL[category] : '');

  return (
    <DashboardLayout pageTitle="Discover">
      <div className="space-y-8">
        <DiscoverHero value={search} onChange={setSearch} />

        <CategoryGrid selected={category} onSelect={setCategory} />

        <TrendingRow
          search={effectiveSearch}
          categoryLabel={category ? CATEGORY_LABEL[category] : null}
        />

        <FeaturedEvent />

        {/* CTA — start your own */}
        <Card variant="default" className="overflow-hidden">
          <CardContent className="flex flex-col items-start gap-5 px-6 py-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-accent-foreground"
                aria-hidden="true"
              >
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="text-base font-bold tracking-tight text-foreground">
                  Don&apos;t see your circle?
                </p>
                <p className="text-sm text-muted-foreground">
                  Start one in 60 seconds — invite members, pool funds, settle in
                  seconds.
                </p>
              </div>
            </div>
            <Link href="/dashboard/community?new=1">
              <Button
                size="default"
                trailingIcon={<ArrowRight className="size-4" />}
              >
                Start a community
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
