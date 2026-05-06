export type MemberRole = 'owner' | 'admin' | 'member';

export interface MemberCommunityRef {
  id: string;
  name: string;
  initials: string;
  role: MemberRole;
}

export interface MemberItem {
  id: string;
  name: string;
  initials: string;
  /** Optional avatar URL. */
  avatar?: string;
  /** @handle (without the @ prefix). */
  username: string;
  bio?: string;
  location?: string;
  /** Communities you share with this person. */
  communities: MemberCommunityRef[];
  /** Currently online indicator. */
  isOnline: boolean;
  /** ISO. Used for "last seen" microcopy when offline. */
  lastSeenAt?: string;
  /** ISO. When they first joined a community you share. */
  joinedAt: string;
  postsCount?: number;
  /** Optional: starred contact. */
  isFavorite?: boolean;
  /** Server bookmark row backing the favorite state. */
  favoriteBookmarkId?: number | null;
  /** Tone class for the avatar fallback (background + foreground). */
  avatarTone: string;
}
