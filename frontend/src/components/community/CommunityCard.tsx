'use client';

import { Check, Lock, Users, UserPlus, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { cn } from '@/lib/utils';

const COVER_IMAGES = [
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80',
  'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&q=80',
  'https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=600&q=80',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&q=80',
  'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&q=80',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80',
  'https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=600&q=80',
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&q=80',
];

interface Community {
  id: number;
  name: string;
  description: string;
  members: number;
  posts: number;
  isPrivate: boolean;
  avatar: string;
  isJoined?: boolean;
  isOwner: boolean;
}

interface CommunityCardProps {
  community: Community;
}

const CommunityCard = ({ community }: CommunityCardProps) => {
  const [joiningCommunity, setJoiningCommunity] = useState(false);
  const [isMember, setIsMember] = useState(community.isJoined ?? false);
  const [memberCount, setMemberCount] = useState(community.members);
  const router = useRouter();

  const coverImage = COVER_IMAGES[community.id % COVER_IMAGES.length];
  const goToDetails = () => router.push(`/dashboard/community/${community.id}`);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMember) return;
    setJoiningCommunity(true);
    try {
      await ApiService.communities.joinFree(community.id);
      toast.success(`You've joined ${community.name}`);
      setIsMember(true);
      setMemberCount((prev) => prev + 1);
    } catch (error: unknown) {
      toastAxiosError(error, 'Failed to join community.');
    } finally {
      setJoiningCommunity(false);
    }
  };

  return (
    <article
      tabIndex={0}
      onClick={goToDetails}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          goToDetails();
        }
      }}
      aria-label={`${community.name}, ${community.isPrivate ? 'private' : 'public'} community with ${memberCount.toLocaleString()} members`}
      className={cn(
        'group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow',
        'shadow-xs hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      )}
    >
      {/* Cover */}
      <div className="relative h-40 overflow-hidden">
        <Image
          src={coverImage}
          alt=""
          fill
          aria-hidden="true"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
        />

        <div className="absolute left-3 top-3">
          {community.isPrivate ? (
            <Badge
              variant="outline"
              className="border-white/30 bg-black/45 text-white backdrop-blur-md"
            >
              <Lock className="size-3" aria-hidden="true" /> Private
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-white/30 bg-primary/85 text-primary-foreground backdrop-blur-md"
            >
              <Shield className="size-3" aria-hidden="true" /> Public
            </Badge>
          )}
        </div>

        <div className="absolute right-3 top-3">
          <Badge
            variant="outline"
            className="border-white/30 bg-black/45 text-white backdrop-blur-md"
          >
            <Users className="size-3" aria-hidden="true" />
            {memberCount.toLocaleString()}
          </Badge>
        </div>

        {/* Avatar straddles the cover/body line */}
        <div className="absolute -bottom-5 left-4">
          <Avatar className="size-12 rounded-xl border-2 border-card ring-2 ring-card shadow-md">
            <AvatarImage src={community.avatar} alt="" className="object-cover" />
            <AvatarFallback className="rounded-xl bg-primary text-primary-foreground font-bold">
              {community.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-7">
        <h3 className="line-clamp-1 text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
          {community.name}
        </h3>
        <p className="mb-4 mt-1 line-clamp-2 flex-1 text-sm text-muted-foreground">
          {community.description}
        </p>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Users className="size-3.5 text-primary" aria-hidden="true" />
            {memberCount.toLocaleString()} <span className="hidden sm:inline">members</span>
          </div>

          {community.isOwner ? (
            <Badge variant="secondary" size="lg">
              Your circle
            </Badge>
          ) : (
            <Button
              type="button"
              size="sm"
              variant={isMember ? 'outline' : 'default'}
              onClick={handleJoin}
              disabled={isMember}
              loading={joiningCommunity}
              leadingIcon={
                isMember ? (
                  <Check className="size-3.5" />
                ) : (
                  <UserPlus className="size-3.5" />
                )
              }
            >
              {isMember ? 'Member' : 'Join'}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};

export default CommunityCard;
