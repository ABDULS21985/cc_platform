'use client';

import DashboardLayout from "@/components/layout/DashboardLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { useCommunityTabStore, type CommunityTab } from "@/lib/communityStore";
import { Separator } from "@/components/ui/separator";
import { PostsTab } from "@/components/community/PostsTab";
import { AboutTab } from "@/components/community/AboutTab";
import { ExpensesTab } from "@/components/community/ExpensesTab";
import { EventsTab } from "@/components/community/EventsTab";
import { BillsTab } from "@/components/community/BillsTab";
import { MembersTab } from "@/components/community/MembersTab";
import { InviteDialog } from "@/components/community/InviteDialog";
import {
  Lock,
  Users,
  Mail,
  Pencil,
  Loader2,
  UserPlus,
  Link,
  Globe,
  Share2,
  MoreHorizontal,
  ChevronRight,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ApiService, CommunityData, type MemberData } from "@/services/api";
import { toast } from 'sonner';
import useUserData from "@/hooks/useUserData";
import WalletTab from "@/components/community/WalletTab";
import { MuteCommunityButton } from "@/components/community/MuteCommunityButton";
import { toastAxiosError } from "@/hooks/useAxiosError";

interface CommunityDetailsClientProps {
  id: string;
}

export default function CommunityDetailsClient({
  id,
}: CommunityDetailsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const userData = useUserData();
  const communityId = Number(id);

  const [community, setCommunity] = useState<any>(null);
  const [_rawCommunity, setRawCommunity] = useState<CommunityData>();
  const [members, setMembers] = useState<MemberData[]>([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [joiningCommunity, setJoiningCommunity] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  const { getActiveTabFor, setActiveTabFor } = useCommunityTabStore();
  const activeTab = getActiveTabFor(String(communityId));

  const isOwner =
    community?.created_by != null && community?.created_by === userData?.id;
  const isMember = members.some((m) => m.user_id === userData?.id);

  const handleCopyLink = () => {
    const url = `${window.location}`;
    navigator.clipboard.writeText(url);
    setHasCopiedLink(true);
    toast.success("Community link copied to clipboard");
    setTimeout(() => setHasCopiedLink(false), 2000);
  };

  const handleEdit = () => {
    router.push(`/dashboard/community/edit-community?id=${communityId}`);
  };

  useEffect(() => {
    const fetchCommunity = async () => {
      try {
        const communityRes = await ApiService.communities.get(communityId);
        const c = communityRes.data.data;
        setRawCommunity(c);
        setCommunity({
          id: c.id,
          name: c.name,
          description: c.description,
          members: c.member_count || 0,
          isPrivate: c.visibility === "private",
          created_by: c.created_by,
          member_cost: c.member_cost,
          status: c.status,
          slug: c.slug,
          created_at: c.created_at,
          avatar: "/images/image.png",
          cover: "/images/get-started1.png",
        });
      } catch (error) {
        console.error("Error fetching community", error);
        toastAxiosError(error, "Failed to load community.");
      } finally {
        setLoading(false);
      }
    };

    fetchCommunity();
  }, [communityId]);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await ApiService.communities.getMembers(communityId);
        setMembers(response.data.data.members);
      } catch (error) {
        console.error("Error fetching members", error);
        toastAxiosError(error, "Failed to load members.");
      } finally {
        setMembersLoading(false);
      }
    };
    fetchMembers();
  }, [communityId]);

  const handleRemoveMember = async (userId: number) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await ApiService.communities.removeMember(communityId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast.success("Member removed");
    } catch (error) {
      toastAxiosError(error, "Failed to remove member.");
    }
  };

  const handleChangeRole = async (userId: number, role: string) => {
    try {
      await ApiService.communities.updateMemberRole(communityId, userId, role);
      setMembers((prev) =>
        prev.map((m) => (m.user_id === userId ? { ...m, role } : m)),
      );
      toast.success("Role updated");
    } catch (error) {
      toastAxiosError(error, "Failed to update role.");
    }
  };

  const handleJoin = async () => {
    setJoiningCommunity(true);
    try {
      await ApiService.communities.joinFree(communityId);
      toast.success(`You've joined ${community.name}!`);
      const response = await ApiService.communities.getMembers(communityId);
      setMembers(response.data.data.members);
      setCommunity((prev: any) => ({ ...prev, members: prev.members + 1 }));
    } catch (error: any) {
      toastAxiosError(error, "Failed to join community.");
    } finally {
      setJoiningCommunity(false);
    }
  };

  const storePersist = (useCommunityTabStore as any).persist;
  const [hasHydrated, setHasHydrated] = useState<boolean>(
    () => storePersist?.hasHydrated?.() ?? false,
  );
  useEffect(() => {
    const unsub = storePersist?.onFinishHydration?.(() => setHasHydrated(true));
    return unsub;
  }, [storePersist]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Loading Circle...">
        <div className="flex flex-col justify-center items-center h-[60vh] space-y-4">
          <div className="relative">
             <div className="w-12 h-12 border-4 border-teal-50 rounded-full border-t-[#0E9DA5] animate-spin" />
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-2 h-2 bg-[#0E9DA5] rounded-full animate-pulse" />
             </div>
          </div>
          <p className="text-gray-400 font-bold text-sm animate-pulse tracking-tight uppercase">Opening Circle...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!community) {
    return (
      <DashboardLayout pageTitle="Circle Not Found">
        <div className="p-8 text-center bg-white rounded-3xl border border-gray-100 shadow-soft max-w-2xl mx-auto mt-10">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">Circle not found or private</h2>
          <p className="text-gray-500 font-medium mb-8">The community you are looking for does not exist or you don't have permission to view it.</p>
          <Button
            onClick={() => router.push("/dashboard/community")}
            className="bg-[#0E9DA5] hover:bg-[#0a7a80] text-white px-8 h-12 rounded-2xl font-bold shadow-glow"
          >
            Back to Communities
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={community.name || "Circle Details"}>
      <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
        <div className="flex-1 min-w-0 space-y-6">
          
          {/* Header Banner Section */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-soft border border-gray-100">
            <div className="relative group">
              <div className="h-48 sm:h-64 bg-gray-200 overflow-hidden relative">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{
                    backgroundImage: `url(${
                      (community as any).cover || "/images/get-started1.png"
                    })`,
                  }}
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors duration-500" />
              </div>
              
              {/* Floating Meta Overlay */}
              <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="flex items-end gap-5">
                   <div className="relative">
                      <Avatar className="w-24 h-24 sm:w-32 sm:h-32 border-4 border-white shadow-elevated rounded-3xl overflow-hidden">
                        <AvatarImage src={community.avatar} className="object-cover" />
                        <AvatarFallback className="bg-teal-50 text-[#0E9DA5] text-4xl font-bold rounded-3xl">
                          {community.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full shadow-sm" />
                   </div>
                   <div className="pb-1 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/30 hidden md:block">
                     <h2 className="text-2xl lg:text-3xl font-extrabold text-white drop-shadow-md tracking-tight leading-none">
                        {community.name}
                     </h2>
                   </div>
                </div>
              </div>
            </div>

            <div className="px-6 pt-16 sm:pt-20 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
                <div>
                  <div className="md:hidden mb-2">
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                      {community.name}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider">
                      {community.isPrivate ? (
                        <><Lock className="w-3.5 h-3.5" /> Private</>
                      ) : (
                        <><Globe className="w-3.5 h-3.5" /> Public Circle</>
                      )}
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 text-[#0E9DA5] text-xs font-bold uppercase tracking-wider">
                      <Users className="w-3.5 h-3.5" />
                      {community.members} Members
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    {isMember && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 text-gray-600 hover:text-[#0E9DA5] hover:bg-teal-50 transition-all relative group"
                      >
                        <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white">
                          12
                        </span>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 text-gray-600 hover:text-[#0E9DA5] hover:bg-teal-50 transition-all group"
                      onClick={handleCopyLink}
                      title="Copy Link"
                    >
                      <Share2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </Button>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100 text-gray-600 hover:text-[#0E9DA5] hover:bg-teal-50 transition-all group"
                        onClick={handleEdit}
                        title="Edit Circle"
                      >
                        <Pencil className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </Button>
                    )}
                    <MuteCommunityButton
                      communityId={communityId}
                      visible={isMember || isOwner}
                    />
                  </div>
                  
                  {isMember || isOwner ? (
                    <Button
                      className="h-11 rounded-2xl px-6 bg-[#0E9DA5] hover:bg-[#0a7a80] text-white font-bold text-sm shadow-glow hover:shadow-lg transition-all flex items-center gap-2"
                      onClick={() => setInviteDialogOpen(true)}
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite People
                    </Button>
                  ) : (
                    <Button
                      className="h-11 rounded-2xl px-8 bg-[#0E9DA5] hover:bg-[#0a7a80] text-white font-bold text-sm shadow-glow hover:shadow-lg transition-all flex items-center gap-2"
                      onClick={handleJoin}
                      disabled={joiningCommunity}
                    >
                      {joiningCommunity ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      Join Circle
                    </Button>
                  )}
                </div>
              </div>

              {/* Premium Custom Tabs Navigation */}
              <div className="mt-8 overflow-x-auto custom-scrollbar">
                <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-2xl w-fit border border-gray-200">
                  {[
                    { id: 'posts', label: 'Feed' },
                    { id: 'about', label: 'Circle Info' },
                    { id: 'members', label: 'Members' },
                    { id: 'wallet', label: 'Wallet' },
                    { id: 'expenses', label: 'Expenses' },
                    { id: 'bills', label: 'Bills' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabFor(String(communityId), tab.id as CommunityTab)}
                      className={`px-6 py-2 rounded-xl text-sm font-bold transition-all duration-300 whitespace-nowrap
                        ${activeTab === tab.id 
                          ? 'bg-white text-[#0E9DA5] shadow-sm' 
                          : 'text-gray-500 hover:text-[#0E9DA5] hover:bg-white/50'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamic Content Rendering */}
          <div className="animate-fade-in-up mt-6">
            {hasHydrated && (
              <>
                {activeTab === 'posts' && <PostsTab communityName={community.name} communityId={community.id} isOwner={isOwner} />}
                {activeTab === 'about' && <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft"><AboutTab community={community} /></div>}
                {activeTab === 'members' && (
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft">
                    <MembersTab
                      members={members}
                      isOwner={isOwner}
                      onRemoveMember={handleRemoveMember}
                      onChangeRole={handleChangeRole}
                    />
                  </div>
                )}
                {activeTab === 'wallet' && <WalletTab communityName={community.name} communityId={community.id} />}
                {activeTab === 'expenses' && <ExpensesTab communityName={community.name} />}
                {activeTab === 'events' && <EventsTab communityName={community.name} />}
                {activeTab === 'bills' && <BillsTab communityId={community.id} isOwner={isOwner} />}
              </>
            )}
          </div>
        </div>

        {/* Sidebar Widgets */}
        <aside className="w-full lg:w-96 space-y-6">
          <div className="lg:sticky lg:top-6 space-y-6">
            
            {/* New Circles Widget */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-[#0E9DA5]" />
                  </div>
                  <h4 className="text-lg font-extrabold text-gray-900 tracking-tight">
                    New circles
                  </h4>
                </div>
                <button className="text-xs font-bold text-[#0E9DA5] hover:underline px-3 py-1 bg-teal-50 rounded-full">
                  See all
                </button>
              </div>
              <div className="space-y-4">
                <p className="text-xs text-gray-400 font-medium italic text-center py-4 border-2 border-dashed border-gray-50 rounded-2xl">
                  No new circles recently
                </p>
              </div>
            </div>

            {/* Circle Members Widget */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-[#0E9DA5]" />
                  </div>
                  <h4 className="text-lg font-extrabold text-gray-900 tracking-tight">
                    Top members
                  </h4>
                </div>
                <button 
                  onClick={() => setActiveTabFor(String(communityId), "members" as any)}
                  className="text-xs font-bold text-[#0E9DA5] hover:underline px-3 py-1 bg-teal-50 rounded-full"
                >
                  See all
                </button>
              </div>
              <div className="space-y-3">
                {membersLoading
                  ? Array(4).fill(0).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 animate-pulse px-2">
                          <div className="w-10 h-10 bg-gray-50 rounded-2xl" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 bg-gray-50 rounded-full w-24" />
                            <div className="h-2 bg-gray-50 rounded-full w-16" />
                          </div>
                        </div>
                      ))
                  : members.slice(0, 5).map((m) => (
                      <div key={m.id} className="flex items-center gap-3 group cursor-pointer hover:bg-gray-50 p-2 rounded-2xl transition-colors">
                        <Avatar className="w-10 h-10 border-2 border-white shadow-soft rounded-2xl overflow-hidden">
                          <AvatarImage src={m.user?.profile_photo} className="object-cover" />
                          <AvatarFallback className="bg-gray-100 text-gray-600 font-bold">
                            {(m.user?.firstname || m.user?.full_name || "U").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-gray-900 truncate tracking-tight group-hover:text-[#0E9DA5] transition-colors">
                            {m.user?.full_name || m.user?.firstname}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {m.role}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 ml-auto opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0" />
                      </div>
                    ))}
              </div>
            </div>

            <InviteDialog
              open={inviteDialogOpen}
              onOpenChange={setInviteDialogOpen}
              communityId={communityId}
            />
          </div>
        </aside>
      </div>
    </DashboardLayout>
  );
}
