import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  [
    'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5',
    'text-xs font-medium leading-none tracking-tight',
    "[&_svg:not([class*='size-'])]:size-3 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    'transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-border text-foreground',
        soft: 'bg-brand-soft text-accent-foreground',
        success: 'bg-success text-success-foreground',
        warning: 'bg-warning text-warning-foreground',
        info: 'bg-info text-info-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        successSoft:
          'bg-success/15 text-success dark:bg-success/20 dark:text-success-foreground',
        warningSoft:
          'bg-warning/15 text-warning dark:bg-warning/25 dark:text-warning-foreground',
        infoSoft:
          'bg-info/15 text-info dark:bg-info/20 dark:text-info-foreground',
        destructiveSoft:
          'bg-destructive/12 text-destructive dark:bg-destructive/20',
      },
      size: {
        sm: 'h-5 px-2 text-[10px]',
        md: 'h-6 px-2.5 text-xs',
        lg: 'h-7 px-3 text-xs',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface BadgeProps
  extends React.ComponentProps<'span'>,
    VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
export type { BadgeProps };
