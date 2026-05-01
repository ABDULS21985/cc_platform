'use client';

import { ShieldCheck, History, Users, ChevronRight } from 'lucide-react';

interface SecuritySidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SecuritySidebar({
  activeTab,
  onTabChange,
}: SecuritySidebarProps) {
  const items = [
    { id: 'change-password', label: 'Password', description: 'Update your password', icon: ShieldCheck },
    { id: 'login-history', label: 'Login History', description: 'Review recent access', icon: History },
    { id: 'role-access', label: 'Admin Management', description: 'Permissions & access', icon: Users },
  ];

  return (
    <div className="w-80 flex flex-col gap-6">
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 border border-white/20 shadow-soft">
        <div className="flex items-center gap-3 px-3 mb-6">
           <div className="h-10 w-10 bg-teal-50 rounded-2xl flex items-center justify-center text-[#0E9DA5]">
              <ShieldCheck className="w-6 h-6" />
           </div>
           <h2 className="text-lg font-black text-gray-900 tracking-tight leading-none">Security</h2>
        </div>
        <div className="space-y-1">
          {items.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${
                  isActive
                    ? 'bg-teal-50 text-[#0E9DA5] shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50/50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-colors ${
                    isActive ? 'bg-white shadow-sm' : 'bg-gray-50 group-hover:bg-white'
                  }`}>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0E9DA5]' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-extrabold tracking-tight leading-none mb-1">{item.label}</div>
                    <div className={`text-[10px] font-medium leading-none ${isActive ? 'text-teal-600/70' : 'text-gray-400'}`}>
                      {item.description}
                    </div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-[#0E9DA5] translate-x-1' : 'text-gray-300 group-hover:text-gray-400'}`} />
              </button>
            );
          })}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-50 px-3">
           <button 
             onClick={() => onTabChange('account-info')}
             className="text-xs font-bold text-[#0E9DA5] hover:underline"
           >
              Back to account settings
           </button>
        </div>
      </div>
    </div>
  );
}
