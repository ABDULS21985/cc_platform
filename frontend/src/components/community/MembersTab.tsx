'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Shield, UserMinus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { MemberData } from '@/services/api';
import { format } from 'date-fns';

interface MembersTabProps {
  members: MemberData[];
  isOwner: boolean;
  onRemoveMember?: (userId: number) => void;
  onChangeRole?: (userId: number, role: string) => void;
}

export function MembersTab({ members, isOwner, onRemoveMember, onChangeRole }: MembersTabProps) {
  return (
    <div className="bg-white rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg sm:text-xl font-semibold text-[#000000]">
          Members ({members.length})
        </h3>
      </div>
      
      <div className="divide-y divide-gray-100">
        {members.map((member) => (
          <div key={member.id} className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 border border-gray-100">
                <AvatarImage src={member.user?.profile_photo || ''} />
                <AvatarFallback>{(member.user?.firstname || member.user?.full_name || 'U').charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-[#000000]">
                  {member.user?.full_name || `${member.user?.firstname} ${member.user?.lastname}`}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    member.role === 'owner' ? 'bg-amber-100 text-amber-700' : 
                    member.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {member.role}
                  </span>
                  <span className="text-xs text-[#959595]">
                    Joined {member.joined_at ? format(new Date(member.joined_at), 'MMM d, yyyy') : 'Recently'}
                  </span>
                </div>
              </div>
            </div>

            {isOwner && member.role !== 'owner' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onChangeRole?.(member.user_id, member.role === 'admin' ? 'member' : 'admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    <span>{member.role === 'admin' ? 'Demote to Member' : 'Make Admin'}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={() => onRemoveMember?.(member.user_id)}
                  >
                    <UserMinus className="mr-2 h-4 w-4" />
                    <span>Remove Member</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-[#959595]">No members found in this community.</p>
          </div>
        )}
      </div>
    </div>
  );
}
