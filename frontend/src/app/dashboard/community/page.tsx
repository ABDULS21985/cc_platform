'use client';

import { Suspense, useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import SearchAndFilter, {
  CommunityFilters,
} from "@/components/community/SearchAndFilter";
import CommunityCard from "@/components/community/CommunityCard";
import { ApiService, CommunityData } from "@/services/api";
import { Compass, Info, ShieldCheck, Users, PlusCircle } from "lucide-react";
import { CommunitySkeleton } from "@/components/community/CommunitySkeleton";
import useUserData from "@/hooks/useUserData";
import { toastAxiosError } from "@/hooks/useAxiosError";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface CommunityTab {
  label: string;
  value: string;
  icon: React.ReactNode;
  endpoint: any;
  description: string;
}

const tabs: CommunityTab[] = [
  {
    label: "Explore",
    value: "all",
    icon: <Compass className="w-4 h-4" />,
    endpoint: ApiService.communities.list,
    description: "Discover new communities and circles.",
  },
  {
    label: "My Circles",
    value: "mine",
    icon: <ShieldCheck className="w-4 h-4" />,
    endpoint: ApiService.communities.mine,
    description: "Communities you've created and manage.",
  },
  {
    label: "Joined",
    value: "joined",
    icon: <Users className="w-4 h-4" />,
    endpoint: ApiService.communities.joined,
    description: "Circles you've become a member of.",
  },
];

function CommunityContent() {
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CommunityTab>(tabs[0]);
  const [filters, setFilters] = useState<CommunityFilters>({
    searchValue: "",
    selectedFilter: "",
  });
  const userData = useUserData();

  useEffect(() => {
    let isCancelled = false;

    const fetchCommunities = async ({ searchValue }: CommunityFilters) => {
      setCommunities([]);
      setLoading(true);

      try {
        const response = await activeTab.endpoint({
          query: searchValue && searchValue.length > 0 ? searchValue : undefined,
        });
        if (isCancelled) return;

        const mapped = (response.data.data.communities || []).map(
          (c: CommunityData) => ({
            id: c.id,
            name: c.name,
            description: c.description || "No description provided for this circle.",
            members: c.member_count || 0,
            posts: 0,
            isPrivate: c.visibility === "private",
            isJoined: c.is_joined,
            isOwner: c.created_by === userData?.id,
            avatar: "/images/image.png",
          }),
        );
        setCommunities(mapped);
      } catch (error) {
        if (isCancelled) return;
        console.error("Failed to fetch communities", error);
        toastAxiosError(error, "Failed to load communities. Please try again.");
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchCommunities(filters);
    return () => { isCancelled = true; };
  }, [activeTab, filters]);

  return (
    <DashboardLayout pageTitle="Communities">

      {/* Tab Navigation */}
      <div className="flex flex-col mb-6">
        <div className="flex items-center gap-1 bg-white/60 backdrop-blur-sm p-1 rounded-2xl w-fit border border-gray-200 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl transition-all duration-300 focus:outline-none cursor-pointer
                ${activeTab.value === tab.value
                  ? "bg-[#0E9DA5] text-white shadow-sm"
                  : "text-gray-500 hover:text-[#0E9DA5] hover:bg-white/70"
                }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2.5 font-medium flex items-center gap-1.5 ml-2">
          <Info className="w-3 h-3" />
          {activeTab.description}
        </p>
      </div>

      {/* Search & Filter Bar */}
      <SearchAndFilter onRefresh={setFilters} />

      {/* Community Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <CommunitySkeleton key={i} />
          ))}
        </div>
      ) : communities.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 animate-fade-in">
          {communities.map((community) => (
            <CommunityCard key={community.id} community={community} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 px-6 bg-white rounded-3xl border border-gray-100 shadow-soft animate-fade-in">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-teal-50 rounded-full animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Compass className="w-11 h-11 text-[#0E9DA5]" />
            </div>
          </div>
          <h3 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">
            No Circles Found
          </h3>
          <p className="text-gray-500 text-center max-w-sm mb-8 font-medium text-sm leading-relaxed">
            We couldn't find any communities matching your criteria. Explore other tabs or start your own circle!
          </p>
          <Button
            className="bg-[#0E9DA5] hover:bg-[#0a7a80] text-white px-8 h-12 rounded-2xl font-bold shadow-glow hover:shadow-lg transition-all flex items-center gap-2"
            onClick={() => toast.success("Click 'Create Community' above to get started!")}
          >
            <PlusCircle className="w-5 h-5" />
            Start a Circle
          </Button>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout pageTitle="Communities">
          <div className="space-y-6">
            <div className="h-12 w-80 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="h-20 w-full bg-white rounded-3xl animate-pulse border border-gray-100" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 pt-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <CommunitySkeleton key={i} />
              ))}
            </div>
          </div>
        </DashboardLayout>
      }
    >
      <CommunityContent />
    </Suspense>
  );
}
