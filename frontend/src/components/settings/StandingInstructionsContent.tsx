'use client';

import * as React from 'react';
import { useState } from 'react';
import { Calendar, MoreHorizontal, Plus, Repeat } from 'lucide-react';
import { AddInstructionsModal } from './AddInstructionsModal';
import { PasswordConfirmModal } from './PasswordConfirmModal';
import { SplitPaymentModal } from './SplitPaymentModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface StandingInstruction {
  id: number;
  name: string;
  description: string;
  amount: string;
  cadence: string;
  next: string;
}

const INSTRUCTIONS: StandingInstruction[] = [
  {
    id: 1,
    name: 'Yalleman',
    description: 'Membership dues',
    amount: '₦120',
    cadence: 'Monthly',
    next: '14 Jun',
  },
  {
    id: 2,
    name: 'Estate fund',
    description: 'Lekki block 3',
    amount: '₦18,500',
    cadence: 'Monthly',
    next: '01 Jun',
  },
  {
    id: 3,
    name: 'Marathon vendor',
    description: 'T-shirt printing',
    amount: '₦45,000',
    cadence: 'Quarterly',
    next: '01 Aug',
  },
];

export function StandingInstructionsContent() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('');

  const handleAddModalNext = (data: { title: string }) => {
    setCurrentTitle(data.title);
    setIsAddModalOpen(false);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordModalNext = () => {
    setIsPasswordModalOpen(false);
    setIsSplitModalOpen(true);
  };

  const handleSplitModalComplete = (data: unknown) => {
    setIsSplitModalOpen(false);
    console.log('Standing instruction created:', data);
  };

  const closeAll = () => {
    setIsAddModalOpen(false);
    setIsPasswordModalOpen(false);
    setIsSplitModalOpen(false);
    setCurrentTitle('');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Scheduled transfers that run automatically.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          leadingIcon={<Plus className="size-3.5" />}
        >
          New instruction
        </Button>
      </div>

      <ul className="space-y-3" role="list">
        {INSTRUCTIONS.map((s) => (
          <li key={s.id}>
            <Card variant="default" density="compact">
              <CardContent className="flex items-center justify-between gap-3 px-5">
                <div className="flex items-center gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-accent-foreground"
                    aria-hidden="true"
                  >
                    <Repeat className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-tight text-foreground">
                      {s.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="soft" size="sm" className="hidden gap-1 sm:inline-flex">
                    <Calendar className="size-3" aria-hidden="true" />
                    Next {s.next}
                  </Badge>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-foreground">
                      {s.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">/{s.cadence}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Options for ${s.name}`}
                  >
                    <MoreHorizontal className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {/* Modal flow preserved */}
      <AddInstructionsModal
        isOpen={isAddModalOpen}
        onClose={closeAll}
        onNext={handleAddModalNext}
      />
      <PasswordConfirmModal
        isOpen={isPasswordModalOpen}
        onClose={closeAll}
        onNext={handlePasswordModalNext}
        title={currentTitle}
      />
      <SplitPaymentModal
        isOpen={isSplitModalOpen}
        onClose={closeAll}
        onComplete={handleSplitModalComplete}
        title={currentTitle}
      />
    </div>
  );
}
