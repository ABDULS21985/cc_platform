'use client';

import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

interface PlaceholderContentProps {
  title: string;
  description: string;
}

export function PlaceholderContent({ title, description }: PlaceholderContentProps) {
  return (
    <EmptyState
      icon={<Construction className="size-5" aria-hidden="true" />}
      title={title}
      description={description}
    />
  );
}
