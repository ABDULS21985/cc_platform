'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Crown, Shield, ShieldCheck, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiService, type CommunityData, type MemberData } from '@/services/api';
import { toast } from 'sonner';

type Role = 'owner' | 'admin' | 'member';

const ROLE_LABEL: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
};

function youCanManage(role: string): boolean {
  return role === 'owner' || role === 'admin';
}

export function RoleAccessContent() {
  const [communities, setCommunities] = useState<CommunityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await ApiService.communities.joined({ limit: 100 });
        if (cancelled) return;
        const list = (res.data?.data?.communities ?? []) as CommunityData[];
        // Only surface communities where the user can actually manage roles.
        // We don't get the user's role on the joined() response directly, so
        // we filter optimistically — the per-community member endpoint enforces
        // the real permission check on update/delete.
        setCommunities(list);
      } catch {
        if (!cancelled) {
          toast.error('Could not load your communities');
          setCommunities([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-1/3 rounded" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (communities.length === 0) {
    return (
      <EmptyState
        icon={<Users className="size-5" aria-hidden="true" />}
        title="You're not in any communities yet"
        description="Join or create a community to manage roles for its members."
      />
    );
  }

  if (activeId !== null) {
    const community = communities.find((c) => c.id === activeId);
    if (!community) {
      setActiveId(null);
      return null;
    }
    return (
      <CommunityMemberRoles
        community={community}
        onBack={() => setActiveId(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Pick a community to manage its members.
      </p>
      <ul className="space-y-3" role="list">
        {communities.map((c) => (
          <li key={c.id}>
            <Card variant="default" density="compact">
              <CardContent className="flex items-center justify-between gap-3 px-5">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-accent-foreground font-bold"
                    aria-hidden="true"
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                      {c.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.member_count} member{c.member_count === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveId(c.id)}
                >
                  Manage
                </Button>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommunityMemberRoles({
  community,
  onBack,
}: {
  community: CommunityData;
  onBack: () => void;
}) {
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await ApiService.communities.getMembers(community.id, {
        limit: 200,
      });
      setMembers(res.data?.data?.members ?? []);
    } catch {
      toast.error('Could not load members');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [community.id]);

  const handleRoleChange = async (userId: number, role: Role) => {
    setBusyUserId(userId);
    try {
      await ApiService.communities.updateMemberRole(community.id, userId, role);
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role } : m)),
      );
      toast.success(`Role set to ${ROLE_LABEL[role]}`);
    } catch {
      toast.error("Couldn't update role (you may not have permission)");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRemove = async (userId: number) => {
    setBusyUserId(userId);
    try {
      await ApiService.communities.removeMember(community.id, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast.success('Member removed');
    } catch {
      toast.error("Couldn't remove member");
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          leadingIcon={<ArrowLeft className="size-3.5" />}
        >
          Back
        </Button>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">
            {community.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {community.member_count} member{community.member_count === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          icon={<Users className="size-5" aria-hidden="true" />}
          title="No members yet"
          description="Invite people to this community to manage their roles here."
        />
      ) : (
        <ul className="space-y-2" role="list">
          {members.map((m) => {
            const role = (m.role as Role) || 'member';
            const fullName = m.user?.full_name || m.user?.firstname || `User #${m.user_id}`;
            const isOwner = role === 'owner';
            return (
              <li key={m.id}>
                <Card variant="default" density="compact">
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 px-5">
                    <div className="flex items-center gap-3">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground font-semibold"
                        aria-hidden="true"
                      >
                        {fullName.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <p className="text-sm font-semibold tracking-tight text-foreground">
                          {fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Joined{' '}
                          {m.joined_at
                            ? new Date(m.joined_at).toLocaleDateString()
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwner ? (
                        <Badge variant="warningSoft" size="sm" className="gap-1">
                          <Crown className="size-3" aria-hidden="true" />
                          Owner
                        </Badge>
                      ) : (
                        <Select
                          value={role}
                          onValueChange={(next) =>
                            handleRoleChange(m.user_id, next as Role)
                          }
                          disabled={busyUserId === m.user_id}
                        >
                          <SelectTrigger
                            className="h-9 w-32 rounded-lg"
                            aria-label={`Role for ${fullName}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member">
                              <span className="inline-flex items-center gap-2">
                                <Shield className="size-3" aria-hidden="true" />
                                Member
                              </span>
                            </SelectItem>
                            <SelectItem value="admin">
                              <span className="inline-flex items-center gap-2">
                                <ShieldCheck className="size-3" aria-hidden="true" />
                                Admin
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {!isOwner && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${fullName}`}
                          disabled={busyUserId === m.user_id}
                          onClick={() => handleRemove(m.user_id)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
