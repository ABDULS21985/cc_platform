import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium tracking-tight",
    "rounded-full transition-colors transition-shadow",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
    "aria-invalid:ring-destructive/40 aria-invalid:ring-2",
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/95',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/90',
        outline:
          'border border-border bg-background text-foreground shadow-xs hover:bg-accent hover:text-accent-foreground hover:border-input',
        ghost:
          'text-foreground hover:bg-accent hover:text-accent-foreground',
        soft:
          'bg-brand-soft text-accent-foreground hover:bg-brand-soft/80',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        success:
          'bg-success text-success-foreground shadow-sm hover:bg-success/90',
        warning:
          'bg-warning text-warning-foreground shadow-sm hover:bg-warning/90',
        link:
          'text-primary underline-offset-4 hover:underline rounded-md',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-sm',
        xl: 'h-12 px-7 text-base',
        icon: 'size-10',
        'icon-sm': 'size-8',
        'icon-lg': 'size-11',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      block: false,
    },
  }
);

interface ButtonProps
  extends React.ComponentProps<'button'>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Disables the button and renders a spinner over the label. */
  loading?: boolean;
  /** Icon node rendered before the label. */
  leadingIcon?: React.ReactNode;
  /** Icon node rendered after the label. */
  trailingIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      block,
      asChild = false,
      loading = false,
      disabled,
      leadingIcon,
      trailingIcon,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    if (asChild) {
      // Slot can only have a single child; skip leading/trailing/loading affordances.
      return (
        <Slot
          ref={ref as unknown as React.Ref<HTMLElement>}
          data-slot="button"
          className={cn(buttonVariants({ variant, size, block, className }))}
          aria-busy={loading || undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size, block, className }))}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2
            className="absolute size-4 animate-spin"
            aria-hidden="true"
          />
        ) : null}
        <span
          className={cn(
            'inline-flex items-center gap-2',
            loading && 'opacity-0'
          )}
        >
          {leadingIcon}
          {children}
          {trailingIcon}
        </span>
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps };
