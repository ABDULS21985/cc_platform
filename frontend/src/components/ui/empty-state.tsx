import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * Use whenever a data-bound surface has no rows. A title + optional description
 * + clear next action beats a blank canvas every time.
 */
function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center',
        className
      )}
      {...props}
    >
      {icon && (
        <div className="grid size-12 place-items-center rounded-full bg-brand-soft text-accent-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-foreground">
        {title}
      </h3>
      {description && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export { EmptyState };
export type { EmptyStateProps };
