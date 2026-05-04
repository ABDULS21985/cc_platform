export type NotificationCategory =
  | 'money'
  | 'bills'
  | 'communities'
  | 'events'
  | 'security'
  | 'system';

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** Display name for the source — community, bank, "System", etc. */
  source: string;
  /** ISO timestamp. */
  timestamp: string;
  isRead: boolean;
  /** Optional link to jump to the source (e.g. /dashboard/wallet). */
  actionHref?: string;
  /** Optional label override for the action button. */
  actionLabel?: string;
  /** Optional amount payload for money-category items. */
  amount?: { value: string; direction: 'in' | 'out' };
  /** Optional 1-2 letter initials shown in the row's avatar fallback. */
  initials?: string;
}
