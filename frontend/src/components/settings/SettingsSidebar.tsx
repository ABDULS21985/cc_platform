'use client';

import { User, ShieldCheck, Bell, Trash2, ChevronRight, Fingerprint, History, Users } from 'lucide-react';

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SettingsSidebar({
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  const menuGroups = [
    {
      title: 'Account Settings',
      items: [
        { id: 'account-info', label: 'Personal Information', description: 'Update your profile and bio', icon: User },
        { id: 'verification', label: 'Identity Verification', description: 'KYC, BVN, and NIN status', icon: Fingerprint },
        { id: 'notification', label: 'Notifications', description: 'Preferences for alerts', icon: Bell },
      ]
    },
    {
      title: 'Security',
      items: [
        { id: 'change-password', label: 'Password', description: 'Change your login credentials', icon: ShieldCheck },
        { id: 'login-history', label: 'Login History', description: 'Recent account activity', icon: History },
        { id: 'role-access', label: 'Admin Management', description: 'Manage permissions', icon: Users },
      ]
    }
  ];

  return (
    <div className="w-80 flex flex-col gap-6">
      {menuGroups.map((group, groupIdx) => (
        <div key={groupIdx} className="bg-white/80 backdrop-blur-xl rounded-3xl p-4 border border-white/20 shadow-soft">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-4">{group.title}</h2>
          <div className="space-y-1">
            {group.items.map((item) => {
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
        </div>
      ))}

      {/* Danger Zone */}
      <div className="bg-red-50/30 backdrop-blur-xl rounded-3xl p-4 border border-red-100/50 shadow-soft">
        <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest px-3 mb-4">Danger Zone</h2>
        <button
          onClick={() => onTabChange('deactivate')}
          className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all group ${
            activeTab === 'deactivate'
              ? 'bg-red-50 text-red-600'
              : 'text-red-400 hover:bg-red-50/50 hover:text-red-600'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-red-50 group-hover:bg-red-100/50 transition-colors`}>
              <Trash2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-extrabold tracking-tight leading-none mb-1">Deactivate Account</div>
              <div className="text-[10px] font-medium leading-none opacity-70">
                Permanently delete data
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
