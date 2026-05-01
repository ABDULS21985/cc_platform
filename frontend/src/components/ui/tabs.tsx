'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function Tabs({
  defaultValue,
  value: valueProp,
  onValueChange,
  className,
  children,
}: TabsProps) {
  const [uncontrolledValue, setUncontrolledValue] = useState(
    valueProp ?? defaultValue ?? ''
  );

  const isControlled = valueProp !== undefined;
  const value = isControlled ? (valueProp as string) : uncontrolledValue;
  const setValue = (next: string) => {
    if (!isControlled) setUncontrolledValue(next);
    onValueChange?.(next);
  };

  const ctx = useMemo(() => ({ value, setValue }), [value]);

  return (
    <TabsContext.Provider value={ctx}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export interface TabsListProps {
  className?: string;
  children: React.ReactNode;
}

export function TabsList({ className, children }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 bg-[#f5f5f6] rounded-sm p-1',
        className
      )}
    >
      {children}
    </div>
  );
}

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export function TabsTrigger({ value, className, ...props }: TabsTriggerProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsTrigger must be used within Tabs');
  const selected = ctx.value === value;
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={() => ctx.setValue(value)}
      className={cn(
        'px-3 py-1.5 text-sm font-medium rounded-sm transition-colors cursor-pointer',
        selected
          ? 'bg-white text-[#000000]'
          : 'text-[#959595] hover:text-[#000000]',
        className
      )}
      {...props}
    />
  );
}

export interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

export function TabsContent({ value, className, children }: TabsContentProps) {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('TabsContent must be used within Tabs');
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
