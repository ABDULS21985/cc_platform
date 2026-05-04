'use client';

import * as React from 'react';
import {
  Briefcase,
  Building2,
  Church,
  Code2,
  GraduationCap,
  HeartHandshake,
  Music,
  Palette,
  Trophy,
  Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { FadeIn, StaggerList, StaggerItem } from '@/components/ui/motion';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  /** Background tone for the card (subtle gradient). */
  tone: string;
  /** Icon tone (foreground + bg). */
  iconTone: string;
}

const CATEGORIES: Category[] = [
  {
    id: 'estate',
    label: 'Estate & HOA',
    count: 840,
    icon: Building2,
    tone: 'from-info/10 to-card',
    iconTone: 'bg-info/15 text-info',
  },
  {
    id: 'faith',
    label: 'Faith & ministry',
    count: 430,
    icon: Church,
    tone: 'from-warning/10 to-card',
    iconTone: 'bg-warning/15 text-warning',
  },
  {
    id: 'sports',
    label: 'Sports & fitness',
    count: 612,
    icon: Trophy,
    tone: 'from-brand-soft to-card',
    iconTone: 'bg-brand-soft text-accent-foreground',
  },
  {
    id: 'co-op',
    label: 'Cooperatives',
    count: 380,
    icon: HeartHandshake,
    tone: 'from-success/10 to-card',
    iconTone: 'bg-success/15 text-success',
  },
  {
    id: 'tech',
    label: 'Tech & startups',
    count: 528,
    icon: Code2,
    tone: 'from-info/10 to-card',
    iconTone: 'bg-info/15 text-info',
  },
  {
    id: 'education',
    label: 'Education',
    count: 295,
    icon: GraduationCap,
    tone: 'from-brand/10 to-card',
    iconTone: 'bg-brand/15 text-primary',
  },
  {
    id: 'business',
    label: 'Small business',
    count: 412,
    icon: Briefcase,
    tone: 'from-warning/10 to-card',
    iconTone: 'bg-warning/15 text-warning',
  },
  {
    id: 'arts',
    label: 'Arts & culture',
    count: 178,
    icon: Palette,
    tone: 'from-brand-soft to-card',
    iconTone: 'bg-brand-soft text-accent-foreground',
  },
  {
    id: 'music',
    label: 'Music',
    count: 156,
    icon: Music,
    tone: 'from-info/10 to-card',
    iconTone: 'bg-info/15 text-info',
  },
  {
    id: 'social',
    label: 'Friends & family',
    count: 2_800,
    icon: Users,
    tone: 'from-success/10 to-card',
    iconTone: 'bg-success/15 text-success',
  },
];

interface CategoryGridProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
}

export function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  return (
    <section aria-labelledby="categories-heading" className="space-y-4">
      <FadeIn>
        <div className="flex items-center justify-between">
          <div>
            <h2
              id="categories-heading"
              className="text-base font-semibold tracking-tight text-foreground sm:text-lg"
            >
              Browse by interest
            </h2>
            <p className="text-xs text-muted-foreground">
              Tap a category to filter the trending row below.
            </p>
          </div>
          {selected && (
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="text-xs font-semibold text-primary hover:underline underline-offset-4"
            >
              Clear filter
            </button>
          )}
        </div>
      </FadeIn>

      <StaggerList
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        role="list"
      >
        {CATEGORIES.map((c) => {
          const isSelected = selected === c.id;
          return (
            <StaggerItem key={c.id}>
              <Card
                variant="default"
                interactive
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onClick={() => onSelect(isSelected ? null : c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(isSelected ? null : c.id);
                  }
                }}
                className={cn(
                  'h-full bg-gradient-to-br',
                  c.tone,
                  isSelected && 'border-primary ring-2 ring-primary/30'
                )}
              >
                <CardContent className="flex flex-col gap-3 px-4 py-4">
                  <span
                    className={cn(
                      'grid size-9 place-items-center rounded-xl',
                      c.iconTone
                    )}
                    aria-hidden="true"
                  >
                    <c.icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      {c.label}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground">
                      {c.count.toLocaleString()} circles
                    </p>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerList>
    </section>
  );
}
