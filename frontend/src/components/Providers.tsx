'use client';
import { ReactNode, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { MotionConfig } from 'framer-motion';
import React from 'react';
import ReactDOM from 'react-dom';

const queryClient = new QueryClient();

/**
 * Boot @axe-core/react in dev to surface a11y violations to the browser console.
 * Stripped from production builds because process.env.NODE_ENV gets dead-code-eliminated.
 */
function useAxe() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
      // Lazy-import so axe never enters the production bundle.
      import('@axe-core/react').then((mod) => {
        const axe = mod.default;
        // 1000ms throttle keeps it out of every render path.
        axe(React, ReactDOM, 1000);
      });
    }
  }, []);
}

export function Providers({ children }: { children: ReactNode }) {
  useAxe();
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <MotionConfig reducedMotion="user">
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
