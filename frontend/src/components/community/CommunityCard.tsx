'use client';

import { Check, Loader2, Lock, Users, UserPlus, Shield, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Image from "next/image";
import { useState } from "react";
import { ApiService } from "@/services/api";
import { toast } from 'sonner';
import { toastAxiosError } from "@/hooks/useAxiosError";

// Curated Unsplash cover images for variety until real thumbnails are available
const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80",
  "https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&q=80",
  "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=600&q=80",
  "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80",
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&q=80",
  "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80",
  "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=600&q=80",
  "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=600&q=80",
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

  // Deterministic cover image based on community id
  const coverImage = COVER_IMAGES[community.id % COVER_IMAGES.length];

  const goToDetails = () => router.push(`/dashboard/community/${community.id}`);

  const handleJoin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMember) return;
    setJoiningCommunity(true);
    try {
      await ApiService.communities.joinFree(community.id);
      toast.success(`You've joined ${community.name}!`);
      setIsMember(true);
      setMemberCount((prev) => prev + 1);
    } catch (error: any) {
      toastAxiosError(error, "Failed to join community.");
    } finally {
      setJoiningCommunity(false);
    }
  };

  return (
    <div
      onClick={goToDetails}
      className="group cursor-pointer focus:outline-none"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goToDetails(); }}
    >
      <div className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-elevated transition-all duration-400 group-hover:-translate-y-1.5 h-full flex flex-col">
        
        {/* Cover Image */}
        <div className="relative h-44 overflow-hidden flex-shrink-0">
          <Image
            src={coverImage}
            alt={`${community.name} cover`}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

          {/* Visibility Badge - top left */}
          <div className="absolute top-3 left-3">
            {community.isPrivate ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/20">
                <Lock className="w-3 h-3" />
                Private
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0E9DA5]/80 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider border border-white/20">
                <Shield className="w-3 h-3" />
                Public
              </div>
            )}
          </div>

          {/* Member count badge - top right */}
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
              <Users className="w-3 h-3" />
              {memberCount.toLocaleString()}
            </div>
          </div>

          {/* Community avatar overlapping bottom edge */}
          <div className="absolute -bottom-5 left-4">
            <Avatar className="w-12 h-12 border-3 border-white shadow-lg rounded-xl ring-2 ring-white">
              <AvatarImage src={community.avatar} alt={community.name} className="object-cover" />
              <AvatarFallback className="bg-[#0E9DA5] text-white font-extrabold text-lg rounded-xl">
                {community.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Card Body */}
        <div className="pt-8 pb-5 px-5 flex flex-col flex-1">
          <h3 className="text-base font-extrabold text-gray-900 tracking-tight mb-1.5 leading-snug line-clamp-1 group-hover:text-[#0E9DA5] transition-colors">
            {community.name}
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4 flex-1">
            {community.description}
          </p>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-50">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
              <Users className="w-3.5 h-3.5 text-[#0E9DA5]" />
              {memberCount.toLocaleString()} <span className="hidden sm:inline">members</span>
            </div>

            {community.isOwner ? (
              <span className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-50 text-gray-500 text-xs font-bold border border-gray-100">
                Your circle
              </span>
            ) : (
              <button
                onClick={handleJoin}
                disabled={isMember || joiningCommunity}
                className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all duration-300
                ${
                  isMember
                    ? "bg-gray-50 text-gray-400 border border-gray-200 cursor-default"
                    : "bg-[#0E9DA5] text-white hover:bg-[#0a7a80] shadow-sm hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
                }`}
              >
                {isMember ? (
                  <><Check className="w-3.5 h-3.5" /> Member</>
                ) : joiningCommunity ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Joining...</>
                ) : (
                  <><UserPlus className="w-3.5 h-3.5" /> Join</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityCard;
