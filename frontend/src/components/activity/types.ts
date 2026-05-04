export type ActivityType =
  | 'transfer-in'
  | 'transfer-out'
  | 'deposit'
  | 'withdrawal'
  | 'bill-payment'
  | 'bill-received'
  | 'fee'
  | 'refund'
  | 'card-charge';

export type ActivityStatus = 'success' | 'pending' | 'failed';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  /** Numeric amount in NGN. */
  amount: number;
  /** Pre-formatted amount string (no currency prefix). */
  amountFormatted: string;
  direction: 'in' | 'out';
  status: ActivityStatus;
  /** ISO timestamp. */
  timestamp: string;
  community?: { id: string; name: string };
  counterparty?: { name: string; bank?: string; tail?: string };
  /** Optional fee charged for the transaction (NGN). */
  fee?: number;
  /** Bank reference / transaction ref. */
  reference?: string;
}

export type ActivityPeriod = 'today' | '7d' | '30d' | '90d' | 'all';

export interface ActivityFilters {
  search: string;
  type: 'all' | 'in' | 'out' | 'fees' | 'refunds';
  status: 'all' | ActivityStatus;
  community: string; // 'all' or community id
}
