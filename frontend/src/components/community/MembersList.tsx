import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Member {
  id: number;
  name: string;
  role: string;
  avatar: string;
}

interface MembersListProps {
  members: Member[];
}

const MembersList = ({ members }: MembersListProps) => (
  <div className="bg-white rounded-lg p-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-[700] text-[#000000]">All members</h3>
      <button className="text-[0.875rem] text-[#4ab5ba] hover:text-[#3da4a9] font-medium">
        See all
      </button>
    </div>
    <div className="space-y-3">
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="w-12 h-12">
              <AvatarImage src={member.avatar} alt={member.name} />
              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex-1">
            <p className="text-[0.875rem] font-[500] text-[#000000]">
              {member.name}
            </p>
            <p className="text-[0.875rem] text-[#525252]">{member.role}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default MembersList;
