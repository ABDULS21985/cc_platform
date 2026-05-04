import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Token-driven skeleton. Matches surface tone in both light and dark themes.
 * Use real layout dimensions so there's no CLS on hydrate.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'animate-pulse rounded-md bg-muted/70 dark:bg-muted/50',
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
