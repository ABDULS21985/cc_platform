'use client';

import { Globe, Lock, Users, DollarSign, Calendar, Info } from 'lucide-react';
import { format } from 'date-fns';

interface AboutTabProps {
  community: {
    name: string;
    description?: string | null;
    members: number;
    isPrivate: boolean;
    member_cost?: string | null;
    status?: string;
    created_at?: string;
  };
}

export function AboutTab({ community }: AboutTabProps) {
  const memberCost = parseFloat(community.member_cost || '0');
  const isPaid = memberCost > 0;

  return (
    <div className="bg-white rounded-lg p-4 sm:p-6">
      <h3 className="text-lg sm:text-xl font-semibold mb-5 text-[#000000]">About</h3>

      {/* Description */}
      <div className="mb-5">
        {community.description ? (
          <p className="text-sm sm:text-base text-[#525252] leading-relaxed">
            {community.description}
          </p>
        ) : (
          <p className="text-sm text-[#959595] italic">No description provided.</p>
        )}
      </div>

      {/* Community Details */}
      <div className="space-y-3 border-t pt-4">
        {/* Visibility */}
        <div className="flex items-center gap-3 text-sm">
          {community.isPrivate ? (
            <Lock className="w-4 h-4 text-[#525252] shrink-0" />
          ) : (
            <Globe className="w-4 h-4 text-[#525252] shrink-0" />
          )}
          <div>
            <span className="font-medium text-[#000000]">
              {community.isPrivate ? 'Private' : 'Public'} Community
            </span>
            <p className="text-xs text-[#959595]">
              {community.isPrivate
                ? 'Only invited members can join.'
                : 'Anyone can discover and request to join.'}
            </p>
          </div>
        </div>

        {/* Members */}
        <div className="flex items-center gap-3 text-sm">
          <Users className="w-4 h-4 text-[#525252] shrink-0" />
          <div>
            <span className="font-medium text-[#000000]">{community.members} Members</span>
          </div>
        </div>

        {/* Membership Cost */}
        <div className="flex items-center gap-3 text-sm">
          <DollarSign className="w-4 h-4 text-[#525252] shrink-0" />
          <div>
            {isPaid ? (
              <>
                <span className="font-medium text-[#000000]">
                  ₦{Number(memberCost).toLocaleString()} / year
                </span>
                <p className="text-xs text-[#959595]">Paid membership required</p>
              </>
            ) : (
              <span className="font-medium text-[#000000]">Free to join</span>
            )}
          </div>
        </div>

        {/* Status */}
        {community.status && (
          <div className="flex items-center gap-3 text-sm">
            <Info className="w-4 h-4 text-[#525252] shrink-0" />
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#000000]">Status:</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${
                community.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {community.status}
              </span>
            </div>
          </div>
        )}

        {/* Created At */}
        {community.created_at && (
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="w-4 h-4 text-[#525252] shrink-0" />
            <div>
              <span className="text-[#525252]">
                Created {format(new Date(community.created_at), 'MMMM d, yyyy')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
