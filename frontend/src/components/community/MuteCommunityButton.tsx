'use client';

import * as React from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiService } from '@/services/api';

interface Props {
  communityId: number;
  /** Only render when the user is currently a member of the community. */
  visible?: boolean;
  className?: string;
}

/**
 * Toggle "mute notifications from this community". Persists via the
 * `/v2/notifications/community-mutes/{id}` endpoint and survives reload.
 */
export function MuteCommunityButton({ communityId, visible = true, className }: Props) {
  const [muted, setMuted] = React.useState<boolean | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await ApiService.notifications.listMutedCommunities();
        const ids = res.data?.data?.community_ids ?? [];
        if (!cancelled) setMuted(ids.includes(communityId));
      } catch {
        if (!cancelled) setMuted(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [communityId, visible]);

  if (!visible || muted === null) return null;

  const toggle = async () => {
    setPending(true);
    const next = !muted;
    setMuted(next);
    try {
      if (next) {
        await ApiService.notifications.muteCommunity(communityId);
        toast.success('Muted notifications from this community');
      } else {
        await ApiService.notifications.unmuteCommunity(communityId);
        toast.success('Notifications resumed for this community');
      }
    } catch {
      setMuted(!next); // revert
      toast.error('Could not update mute setting');
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant={muted ? 'soft' : 'outline'}
      onClick={toggle}
      disabled={pending}
      leadingIcon={muted ? <BellOff className="size-3.5" /> : <Bell className="size-3.5" />}
      className={className}
      aria-label={muted ? 'Unmute notifications from this community' : 'Mute notifications from this community'}
    >
      {muted ? 'Muted' : 'Mute'}
    </Button>
  );
}
