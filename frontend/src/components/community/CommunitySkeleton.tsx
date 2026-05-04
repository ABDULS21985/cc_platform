import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholder that matches the geometry of a real CommunityCard so
 * there's no layout shift when data hydrates.
 */
export function CommunitySkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading community"
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs"
    >
      {/* Cover */}
      <div className="relative h-40 shrink-0 bg-muted">
        <Skeleton className="absolute inset-0 rounded-none" />
        <Skeleton className="absolute left-3 top-3 h-5 w-20 rounded-full" />
        <Skeleton className="absolute right-3 top-3 h-5 w-14 rounded-full" />
        <Skeleton className="absolute -bottom-5 left-4 size-12 rounded-xl ring-2 ring-card" />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 px-5 pb-5 pt-7">
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full rounded-md" />
          <Skeleton className="h-3 w-4/5 rounded-md" />
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}
