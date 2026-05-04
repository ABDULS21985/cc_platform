export type BillStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface BillCommunityRef {
  id: string;
  name: string;
  initials: string;
}

export interface BillItem {
  id: string;
  title: string;
  description?: string;
  community: BillCommunityRef;
  /** Numeric amount in NGN. */
  amount: number;
  /** Pre-formatted amount string for display (e.g. "18,500"). */
  amountFormatted: string;
  /** ISO due timestamp. */
  dueAt: string;
  status: BillStatus;
  createdBy: { name: string; isYou: boolean };
  /** How many members have paid out of total. */
  members: { paid: number; total: number };
  /** Free-form tag — "Estate dues", "Event ticket", "Co-op contribution", etc. */
  category: string;
  isRecurring?: boolean;
  /** ISO when the user paid (only when status is paid). */
  paidAt?: string;
  /** Funding source the user used to pay (only when paid). */
  paidVia?: string;
}
