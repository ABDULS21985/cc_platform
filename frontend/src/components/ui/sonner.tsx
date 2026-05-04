'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/**
 * Themed sonner toaster. Drop once at the app root.
 * Reads the active theme from next-themes so light/dark mode follow the user.
 */
export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps['theme']) ?? 'system'}
      position="top-right"
      richColors
      closeButton
      duration={4000}
      visibleToasts={4}
      toastOptions={{
        classNames: {
          toast:
            'group toast bg-popover text-popover-foreground border border-border shadow-lg rounded-xl',
          description: 'text-muted-foreground',
          actionButton:
            'bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs font-medium',
          cancelButton:
            'bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-medium',
        },
      }}
      {...props}
    />
  );
}

export { toast } from 'sonner';
