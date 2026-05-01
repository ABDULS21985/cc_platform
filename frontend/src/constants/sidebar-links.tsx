import React from "react";
import {
  HomeIcon,
  CommunityIcon,
  EventsIcon,
  ExploreIcon,
  WalletIcon,
  SettingsIcon,
} from "@/lib/svg-icons";

export interface SidebarLink {
  icon: React.ReactNode;
  label: string;
  href: string;
}

export const SIDEBAR_LINKS: SidebarLink[] = [
  {
    icon: <HomeIcon />,
    label: "Home",
    href: "/dashboard",
  },
  {
    icon: <CommunityIcon />,
    label: "Communities",
    href: "/dashboard/community",
  },
  {
    icon: <EventsIcon />,
    label: "Events",
    href: "/dashboard/events",
  },
  // {
  //   icon: <ExploreIcon />,
  //   label: 'Explore',
  //   href: '/dashboard/explore',
  // },
  {
    icon: <WalletIcon />,
    label: "Wallet",
    href: "/dashboard/wallet",
  },
  {
    icon: <SettingsIcon />,
    label: "Settings",
    href: "/dashboard/settings",
  },
];
