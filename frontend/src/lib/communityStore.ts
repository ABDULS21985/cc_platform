import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type CommunityTab = 'posts' | 'about' | 'expenses' | 'events' | 'dues' | 'members' | 'wallet' | 'bills';

interface CommunityTabState {
  activeTabByCommunity: Record<string, CommunityTab>;
  getActiveTabFor: (communityId: string) => CommunityTab;
  setActiveTabFor: (communityId: string, tab: CommunityTab) => void;
}

export const useCommunityTabStore = create<CommunityTabState>()(
  persist(
    (set, get) => ({
      activeTabByCommunity: {},
      getActiveTabFor: (communityId: string) =>
        get().activeTabByCommunity[communityId] ?? 'posts',
      setActiveTabFor: (communityId: string, tab: CommunityTab) =>
        set((state) => ({
          activeTabByCommunity: {
            ...state.activeTabByCommunity,
            [communityId]: tab,
          },
        })),
    }),
    {
      name: 'community-tab-store',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    }
  )
);


