import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          'flex h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3.5 text-sm text-foreground shadow-xs',
          'placeholder:text-muted-foreground',
          'selection:bg-primary selection:text-primary-foreground',
          'transition-colors transition-shadow outline-none',
          'hover:border-ring/60',
          'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30',
          'dark:bg-input/30',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
