'use client';

import * as React from 'react';
import {
  Calendar,
  MapPin,
  MessageCircle,
  Star,
  UserPlus,
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from '@/components/ui/motion';
import { cn } from '@/lib/utils';
import type { MemberItem, MemberRole } from './types';

const ROLE_CONFIG: Record<
  MemberRole,
  { label: string; variant: 'successSoft' | 'infoSoft' | 'soft' }
> = {
  owner: { label: 'Owner', variant: 'successSoft' },
  admin: { label: 'Admin', variant: 'infoSoft' },
  member: { label: 'Member', variant: 'soft' },
};

function relativeJoined(iso: string): string {
  const t = new Date(iso).getTime();
  const days = Math.round((Date.now() - t) / (1000 * 60 * 60 * 24));
  if (days < 1) return 'today';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.round(days / 7)}w ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

function lastSeenLabel(item: MemberItem): string | null {
  if (item.isOnline) return 'Online now';
  if (!item.lastSeenAt) return null;
  const mins = Math.round(
    (Date.now() - new Date(item.lastSeenAt).getTime()) / 60_000
  );
  if (mins < 60) return `Active ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.round(hours / 24);
  return `Active ${days}d ago`;
}

interface MemberCardProps {
  item: MemberItem;
  onMessage?: (id: string) => void;
  onInvite?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
}

export function MemberCard({
  item,
  onMessage,
  onInvite,
  onToggleFavorite,
}: MemberCardProps) {
  const seen = lastSeenLabel(item);
  // Surface the highest-privilege role in the corner badge.
  const topRole: MemberRole = item.communities.some((c) => c.role === 'owner')
    ? 'owner'
    : item.communities.some((c) => c.role === 'admin')
      ? 'admin'
      : 'member';
  const topRoleCfg = ROLE_CONFIG[topRole];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card variant="default" className="group/member h-full">
        <CardContent className="flex h-full flex-col gap-4 px-5">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {/* Avatar with online dot */}
              <div className="relative shrink-0">
                <Avatar className="size-12">
                  <AvatarImage src={item.avatar} alt="" />
                  <AvatarFallback className={cn('font-bold', item.avatarTone)}>
                    {item.initials}
                  </AvatarFallback>
                </Avatar>
                {item.isOnline && (
                  <span
                    aria-label="Online"
                    className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-success ring-2 ring-card"
                  />
                )}
              </div>

              {/* Identity */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-bold tracking-tight text-foreground">
                    {item.name}
                  </p>
                  {item.isFavorite && (
                    <Star
                      className="size-3 fill-warning text-warning"
                      aria-label="Favorite"
                    />
                  )}
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  @{item.username}
                </p>
                {seen && (
                  <p
                    className={cn(
                      'mt-0.5 text-[10px] font-semibold uppercase tracking-widest',
                      item.isOnline ? 'text-success' : 'text-muted-foreground'
                    )}
                  >
                    {seen}
                  </p>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {topRole !== 'member' && (
                <Badge variant={topRoleCfg.variant} size="sm">
                  {topRoleCfg.label}
                </Badge>
              )}
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Toggle favorite for ${item.name}`}
                onClick={() => onToggleFavorite?.(item.id)}
                className={cn(
                  'opacity-0 transition-opacity',
                  'group-hover/member:opacity-100 focus-visible:opacity-100',
                  item.isFavorite && 'opacity-100'
                )}
              >
                <Star
                  className={cn(
                    'size-3.5',
                    item.isFavorite && 'fill-warning text-warning'
                  )}
                  aria-hidden="true"
                />
              </Button>
            </div>
          </div>

          {/* Bio */}
          {item.bio && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {item.bio}
            </p>
          )}

          {/* Meta row */}
          <ul
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground"
            aria-label="Member details"
          >
            {item.location && (
              <li className="inline-flex items-center gap-1">
                <MapPin className="size-3" aria-hidden="true" />
                {item.location}
              </li>
            )}
            <li className="inline-flex items-center gap-1">
              <Calendar className="size-3" aria-hidden="true" />
              Joined {relativeJoined(item.joinedAt)}
            </li>
            {item.postsCount !== undefined && (
              <li className="inline-flex items-center gap-1">
                <MessageCircle className="size-3" aria-hidden="true" />
                <span className="tabular-nums">{item.postsCount}</span> posts
              </li>
            )}
          </ul>

          {/* Communities */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Shared circles
            </p>
            <ul className="flex flex-wrap gap-1.5" role="list">
              {item.communities.slice(0, 4).map((c) => {
                const cfg = ROLE_CONFIG[c.role];
                return (
                  <li
                    key={c.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    <span
                      className="grid size-4 place-items-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground"
                      aria-hidden="true"
                    >
                      {c.initials}
                    </span>
                    <span className="truncate max-w-[10ch]">{c.name}</span>
                    {c.role !== 'member' && (
                      <Badge variant={cfg.variant} size="sm" className="px-1.5 py-0">
                        {cfg.label}
                      </Badge>
                    )}
                  </li>
                );
              })}
              {item.communities.length > 4 && (
                <li className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  <Users className="size-3" aria-hidden="true" />+
                  {item.communities.length - 4} more
                </li>
              )}
            </ul>
          </div>

          {/* Actions — only render when the parent wires real handlers, so
              we don't surface dead buttons that lead nowhere. */}
          {(onMessage || onInvite) && (
            <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
              {onMessage && (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  block
                  leadingIcon={<MessageCircle className="size-3.5" />}
                  onClick={() => onMessage(item.id)}
                >
                  Message
                </Button>
              )}
              {onInvite && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  leadingIcon={<UserPlus className="size-3.5" />}
                  onClick={() => onInvite(item.id)}
                >
                  Invite
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
