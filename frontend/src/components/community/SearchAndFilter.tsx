'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { Globe, Lock, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateCommunityDialog } from './CreateCommunityDialog';
import { cn } from '@/lib/utils';

export interface CommunityFilters {
  searchValue?: string;
  selectedFilter?: string;
  visibility?: 'all' | 'public' | 'private';
}

interface SearchAndFilterProps {
  onRefresh?: (next: CommunityFilters) => void;
  /** Hide the inline "New community" CTA when the parent provides one elsewhere. */
  hideCreate?: boolean;
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently active' },
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Newest circles' },
];

const VISIBILITY_OPTIONS: Array<{
  value: NonNullable<CommunityFilters['visibility']>;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'all', label: 'All' },
  { value: 'public', label: 'Public', icon: Globe },
  { value: 'private', label: 'Private', icon: Lock },
];

const SearchAndFilter = ({ onRefresh, hideCreate = false }: SearchAndFilterProps) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('recent');
  const [searchValue, setSearchValue] = useState('');
  const [visibility, setVisibility] = useState<NonNullable<CommunityFilters['visibility']>>('all');

  useEffect(() => {
    const handler = window.setTimeout(() => {
      onRefresh?.({ searchValue, selectedFilter, visibility });
    }, 350);
    return () => window.clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilter, searchValue, visibility]);

  const toggleCreateDialog = () => setIsCreateDialogOpen((v) => !v);
  const handleSuccess = () => {
    setSearchValue('');
    setSelectedFilter('recent');
    setVisibility('all');
  };

  return (
    <>
      <div className="space-y-3">
        {/* Search row */}
        <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:p-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search communities by name, interest, or owner…"
              className="h-11 rounded-xl pl-11"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              aria-label="Search communities"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger
                className="h-11 w-full rounded-xl px-3 sm:w-48"
                aria-label="Sort communities"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <SelectValue placeholder="Sort" />
                </span>
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!hideCreate && (
              <Button
                type="button"
                size="default"
                onClick={toggleCreateDialog}
                leadingIcon={<Plus className="size-4" />}
                className="h-11 whitespace-nowrap"
              >
                <span className="hidden sm:inline">New community</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
        </div>

        {/* Visibility chip strip */}
        <div
          role="radiogroup"
          aria-label="Filter by visibility"
          className="flex items-center gap-1.5 overflow-x-auto"
        >
          {VISIBILITY_OPTIONS.map((opt) => {
            const active = visibility === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setVisibility(opt.value)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-card text-muted-foreground hover:border-input hover:text-foreground'
                )}
              >
                {Icon && <Icon className="size-3" aria-hidden="true" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <CreateCommunityDialog
        isOpen={isCreateDialogOpen}
        toggleDialog={toggleCreateDialog}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default SearchAndFilter;
