'use client';

/**
 * Responsive Sheet — bottom sheet on mobile (vaul), side dialog on desktop (Radix).
 *
 * Usage:
 *   <Sheet open={open} onOpenChange={setOpen}>
 *     <SheetContent side="right" title="Filters" description="...">
 *       ...content
 *     </SheetContent>
 *   </Sheet>
 *
 * On viewports <= 768px the same component renders as a bottom drawer with
 * native-feeling rubber-band + swipe-to-dismiss.
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Drawer as Vaul } from 'vaul';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const SheetCtx = React.createContext<{ isMobile: boolean }>({ isMobile: false });

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  const isMobile = useMediaQuery('(max-width: 767px)');
  const ctx = React.useMemo(() => ({ isMobile }), [isMobile]);

  if (isMobile) {
    return (
      <SheetCtx.Provider value={ctx}>
        <Vaul.Root open={open} onOpenChange={onOpenChange} shouldScaleBackground>
          {children}
        </Vaul.Root>
      </SheetCtx.Provider>
    );
  }

  return (
    <SheetCtx.Provider value={ctx}>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        {children}
      </DialogPrimitive.Root>
    </SheetCtx.Provider>
  );
}

export function SheetTrigger({
  children,
  asChild,
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) {
  const { isMobile } = React.useContext(SheetCtx);
  return isMobile ? (
    <Vaul.Trigger asChild={asChild}>{children}</Vaul.Trigger>
  ) : (
    <DialogPrimitive.Trigger asChild={asChild}>{children}</DialogPrimitive.Trigger>
  );
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'right' | 'bottom' | 'left';
  title?: string;
  description?: string;
  /** Hide the close button (default: shown). */
  hideClose?: boolean;
}

const sideClasses: Record<NonNullable<SheetContentProps['side']>, string> = {
  top:    'inset-x-0 top-0 border-b rounded-b-2xl',
  bottom: 'inset-x-0 bottom-0 border-t rounded-t-2xl',
  left:   'inset-y-0 left-0 h-full w-full max-w-md border-r rounded-r-2xl',
  right:  'inset-y-0 right-0 h-full w-full max-w-md border-l rounded-l-2xl',
};

export const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', title, description, hideClose, className, children, ...props }, ref) => {
    const { isMobile } = React.useContext(SheetCtx);

    if (isMobile) {
      return (
        <Vaul.Portal>
          <Vaul.Overlay className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" />
          <Vaul.Content
            ref={ref}
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[92vh] flex-col rounded-t-2xl border bg-popover text-popover-foreground shadow-xl',
              className
            )}
            {...props}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden="true" />
            {(title || description) && (
              <div className="px-5 pt-3 pb-2">
                {title && <Vaul.Title className="text-base font-semibold">{title}</Vaul.Title>}
                {description && (
                  <Vaul.Description className="mt-0.5 text-sm text-muted-foreground">
                    {description}
                  </Vaul.Description>
                )}
              </div>
            )}
            <div className="overflow-y-auto px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-1">
              {children}
            </div>
          </Vaul.Content>
        </Vaul.Portal>
      );
    }

    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0'
          )}
        />
        <DialogPrimitive.Content
          ref={ref}
          aria-describedby={description ? undefined : undefined}
          className={cn(
            'fixed z-50 bg-popover text-popover-foreground shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out duration-200',
            side === 'right' &&
              'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
            side === 'left' &&
              'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left',
            side === 'top' &&
              'data-[state=open]:slide-in-from-top data-[state=closed]:slide-out-to-top',
            side === 'bottom' &&
              'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
            sideClasses[side],
            className
          )}
          {...props}
        >
          {(title || description) && (
            <div className="border-b px-6 py-4">
              {title && (
                <DialogPrimitive.Title className="text-base font-semibold">
                  {title}
                </DialogPrimitive.Title>
              )}
              {description && (
                <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
          )}
          <div className="overflow-y-auto px-6 py-4">{children}</div>
          {!hideClose && (
            <DialogPrimitive.Close
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    );
  }
);
SheetContent.displayName = 'SheetContent';
