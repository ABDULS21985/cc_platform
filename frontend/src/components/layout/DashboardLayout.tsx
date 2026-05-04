'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Search, Bell, ChevronRight, Menu, X, ChevronDown, User, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SIDEBAR_LINKS } from '@/constants/sidebar-links';
import { HelpCenterIcon, LogoutIcon, ArrowRightIcon } from '@/lib/svg-icons';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import Protected from '@/components/Protected';
import LogoutDialog from '../dialogs/LogoutDialog';
import { ThemeSwitcher } from '@/components/layout/ThemeSwitcher';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { MobileNav } from '@/components/layout/MobileNav';

interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
}

function DashboardLayoutContent({ children, pageTitle }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Load user data
    const storedUser = localStorage.getItem('user_data');
    if (storedUser) {
        try {
            setUser(JSON.parse(storedUser));
        } catch (e) {
            console.error('Failed to parse user data');
        }
    }
  }, [router]);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleLogoutDialog = () => {
    setLogoutDialogOpen(!logoutDialogOpen);
  }

  const handleNavigation = (href: string) => {
    if (href !== '/dashboard/settings') {
      setSettingsDropdownOpen(false);
    }
    router.push(href);
  };

  const handleSettingsClick = () => {
    if (!settingsDropdownOpen) {
      router.push('/dashboard/settings');
      setSettingsDropdownOpen(true);
    } else {
      setSettingsDropdownOpen(!settingsDropdownOpen);
    }
  };

  const handleSettingsNavigation = (tab: string) => {
    if (tab === 'account') {
      router.push('/dashboard/settings?tab=account-info');
    } else {
      router.push(`/dashboard/settings?tab=${tab}`);
    }
    setSettingsDropdownOpen(true);
  };

  const isActiveLink = (href: string) => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    if (href === '/dashboard') return false; 
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  useEffect(() => {
    if (pathname === '/dashboard/settings') {
      setSettingsDropdownOpen(true);
    }
  }, [pathname]);

  // Global Cmd/Ctrl+K opens the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans">
      {/* Sidebar Overlay for mobile */}
      {!sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setSidebarOpen(true)}
        />
      )}

      {/* Sidebar - Now with Green Gradient and Smaller Width */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } fixed inset-y-0 left-0 z-50 lg:relative bg-[#043336] gradient-primary transition-all duration-500 ease-in-out flex flex-col shadow-2xl`}
      >
        {/* Subtle pattern overlay for premium feel */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('/images/pattern.png')] bg-repeat" />

        {/* Logo Section */}
        <div className="h-20 flex items-center justify-between px-5 border-b border-white/5 relative z-10">
          <div className={`transition-all duration-500 overflow-hidden flex items-center ${sidebarOpen ? 'w-auto' : 'w-0 opacity-0'}`}>
             <Image
                src="/images/ccpay.png"
                alt="CCPay Logo"
                width={100}
                height={30}
                className="h-7 w-auto brightness-200"
              />
          </div>
          
          {!sidebarOpen && (
             <div className="mx-auto">
               <Image
                  src="/images/main-logo.svg"
                  alt="Logo"
                  width={28}
                  height={28}
                  className="h-7 w-7 brightness-110 shadow-glow"
                />
             </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl smooth-transition"
          >
            {sidebarOpen ? (
              <div className="rotate-180 scale-90"><ArrowRightIcon /></div>
            ) : (
              <div className="scale-90"><ArrowRightIcon /></div>
            )}
          </Button>
        </div>

        {/* User Profile Card - Now with Dropdown Menu */}
        <div className="px-3 py-6 relative z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className={`group relative p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-lg smooth-transition cursor-pointer ${!sidebarOpen && 'flex justify-center'}`}>
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-9 w-9 ring-2 ring-[#0E9DA5]/50 shadow-lg">
                      <AvatarImage src={user?.avatar || "/images/image.png"} />
                      <AvatarFallback className="bg-[#0E9DA5] text-white font-bold text-xs">
                        {user?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-[#043336] rounded-full"></div>
                  </div>
                  
                  {sidebarOpen && (
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-bold text-[#0E9DA5] uppercase tracking-widest mb-0.5">
                        {user?.role || 'Member'}
                      </p>
                      <p className="text-xs font-bold text-white truncate">
                        {user?.full_name || 'Guest User'}
                      </p>
                    </div>
                  )}
                  {sidebarOpen && (
                    <ChevronDown className="w-3.5 h-3.5 text-white/40 group-hover:text-white transition-transform group-data-[state=open]:rotate-180 smooth-transition" />
                  )}
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={sidebarOpen ? "bottom" : "right"} align="start" className="w-56 bg-[#043336] border-white/10 text-white rounded-2xl p-1 shadow-elevated backdrop-blur-xl">
               <DropdownMenuItem 
                 onClick={() => router.push('/dashboard/settings?tab=account-info')}
                 className="flex items-center gap-2 p-3 rounded-xl hover:bg-white/10 focus:bg-white/10 cursor-pointer text-sm font-bold transition-colors"
               >
                 <User className="w-4 h-4 text-[#0E9DA5]" />
                 View Profile
               </DropdownMenuItem>
               <DropdownMenuItem 
                 onClick={toggleLogoutDialog}
                 className="flex items-center gap-2 p-3 rounded-xl hover:bg-red-500/10 focus:bg-red-500/10 cursor-pointer text-sm font-bold text-red-400 transition-colors"
               >
                 <LogOut className="w-4 h-4" />
                 Logout
               </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation - Colors updated for contrast */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto custom-scrollbar-white pt-2 relative z-10">
          {SIDEBAR_LINKS.map((link) => {
            const isActive = isActiveLink(link.href);
            const isSettings = link.href === '/dashboard/settings';

            return (
              <div key={link.href} className="relative group">
                <button
                  onClick={
                    isSettings
                      ? handleSettingsClick
                      : () => handleNavigation(link.href)
                  }
                  className={`w-full flex items-center space-x-3 p-2.5 rounded-xl smooth-transition ${
                    isActive
                      ? 'bg-white text-[#043336] shadow-lg font-bold'
                      : 'text-teal-50/60 hover:bg-white/10 hover:text-white font-medium'
                  } ${!sidebarOpen && 'justify-center'}`}
                >
                  <span className={`flex-shrink-0 w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-[#0E9DA5]' : ''}`}>
                    {link.icon}
                  </span>
                  {sidebarOpen && (
                    <span className="text-sm truncate">
                      {link.label}
                    </span>
                  )}
                  {isSettings && sidebarOpen && (
                    <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform duration-300 ${settingsDropdownOpen ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* Settings Dropdown */}
                {isSettings && settingsDropdownOpen && sidebarOpen && (
                  <div className="ml-8 mt-1 space-y-1 animate-fade-in-down border-l border-white/10 pl-2">
                    {[
                      { id: 'account', label: 'Your account' },
                      { id: 'subscriptions', label: 'Payment' },
                      { id: 'security', label: 'Security' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => handleSettingsNavigation(tab.id)}
                        className={`w-full text-left p-2 rounded-lg text-xs font-bold smooth-transition ${
                          (tab.id === 'account' && (pathname === '/dashboard/settings' && (!searchParams.get('tab') || searchParams.get('tab') === 'account-info'))) ||
                          searchParams.get('tab') === tab.id
                            ? 'bg-white/10 text-white'
                            : 'text-teal-50/40 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Actions - Logo or Help */}
        <div className="p-3 border-t border-white/5 bg-black/5 relative z-10">
           <div className={`p-4 rounded-2xl bg-white/5 border border-white/5 text-center ${!sidebarOpen && 'hidden'}`}>
              <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
                 Powered by CCPay
              </p>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header / Topbar - Frosted effect looks even better against dark sidebar */}
        <header className="bg-white/70 backdrop-blur-2xl h-16 flex items-center border-b border-gray-100 z-30 px-6">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                className="lg:hidden w-10 h-10 rounded-xl bg-gray-50 border border-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                {pageTitle}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Cmd-K command palette trigger */}
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open command palette"
                className="hidden md:flex items-center justify-between gap-3 w-[320px] h-10 px-4 rounded-xl bg-muted/40 border border-border text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:border-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" aria-hidden="true" />
                  Search routes &amp; actions
                </span>
                <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded-md border border-border bg-background px-1.5 font-mono text-[10px] tracking-tight">
                  <span className="text-[10px]">⌘</span>K
                </kbd>
              </button>

              {/* Action Icons */}
              <div className="flex items-center space-x-2">
                <ThemeSwitcher compact />
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative w-10 h-10 rounded-xl bg-gray-50/80 border border-gray-100 text-gray-500 hover:text-[#0E9DA5] hover:bg-white smooth-transition shadow-sm"
                >
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 bg-[#0E9DA5] text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center ring-2 ring-white">
                    3
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <LogoutDialog isOpen={logoutDialogOpen} toggleDialog={toggleLogoutDialog} />

        <main className="flex-1 overflow-y-auto p-6 pb-20 lg:pb-6 custom-scrollbar relative">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-teal-50/20 rounded-full blur-[100px] pointer-events-none -z-10 translate-x-1/2 -translate-y-1/2" />

          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </main>
        <MobileNav />
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </div>
  );
}

function DashboardLayoutFallback({ pageTitle }: { pageTitle: string }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-[#043336] border-r border-white/5">
        <div className="h-20 border-b border-white/5 px-6 flex items-center">
          <div className="h-6 w-24 bg-white/10 rounded-lg animate-pulse"></div>
        </div>
        <div className="p-6 space-y-6">
          <div className="h-14 bg-white/5 rounded-xl animate-pulse"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-white/5 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="bg-white h-16 border-b border-gray-100 flex items-center px-8">
          <div className="h-6 w-32 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="h-32 bg-gray-50 rounded-2xl animate-pulse"></div>
            <div className="grid grid-cols-3 gap-6">
              <div className="h-48 bg-gray-50 rounded-2xl animate-pulse"></div>
              <div className="h-48 bg-gray-50 rounded-2xl animate-pulse"></div>
              <div className="h-48 bg-gray-50 rounded-2xl animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
  pageTitle,
}: DashboardLayoutProps) {
  return (
    <Protected>
      <Suspense fallback={<DashboardLayoutFallback pageTitle={pageTitle} />}>
        <DashboardLayoutContent pageTitle={pageTitle}>
          {children}
        </DashboardLayoutContent>
      </Suspense>
    </Protected>
  );
}
