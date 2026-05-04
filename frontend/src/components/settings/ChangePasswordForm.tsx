'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, ShieldCheck, KeyRound, Loader2 } from 'lucide-react';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const res = await ApiService.profile.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Password updated successfully');
        handleCancel(); // Clear form
      }
    } catch (error) {
      toastAxiosError(error, 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="w-full max-w-lg mx-auto py-4 animate-fade-in-up">
      <div className="bg-amber-50/50 border border-amber-100/50 rounded-3xl p-6 mb-8 flex items-start gap-4 group hover:bg-amber-50 transition-all">
         <div className="h-12 w-12 bg-white rounded-2xl shadow-soft flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-110 transition-transform">
            <Lock className="w-6 h-6" />
         </div>
         <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-2">Secure your account</h3>
            <p className="text-sm font-medium text-gray-500 leading-relaxed">
               Enter your current password and choose a strong new one to keep your community safe.
            </p>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Current Password</label>
           <div className="relative group">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors group-focus-within:text-[#0E9DA5]">
               <KeyRound className="w-4 h-4" />
             </div>
             <Input 
               type="password"
               placeholder="••••••••"
               value={currentPassword}
               onChange={(e) => setCurrentPassword(e.target.value)}
               className="pl-11 h-14 bg-gray-50/50 border-gray-100 rounded-2xl focus:ring-[#0E9DA5]/5 focus:border-[#0E9DA5] font-bold text-gray-700" 
             />
           </div>
        </div>

        <div className="space-y-2">
           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">New Password</label>
           <div className="relative group">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors group-focus-within:text-[#0E9DA5]">
               <ShieldCheck className="w-4 h-4" />
             </div>
             <Input 
               type="password"
               placeholder="••••••••"
               value={newPassword}
               onChange={(e) => setNewPassword(e.target.value)}
               className="pl-11 h-14 bg-gray-50/50 border-gray-100 rounded-2xl focus:ring-[#0E9DA5]/5 focus:border-[#0E9DA5] font-bold text-gray-700" 
             />
           </div>
        </div>

        <div className="space-y-2">
           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</label>
           <div className="relative group">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors group-focus-within:text-[#0E9DA5]">
               <ShieldCheck className="w-4 h-4" />
             </div>
             <Input 
               type="password"
               placeholder="••••••••"
               value={confirmPassword}
               onChange={(e) => setConfirmPassword(e.target.value)}
               className="pl-11 h-14 bg-gray-50/50 border-gray-100 rounded-2xl focus:ring-[#0E9DA5]/5 focus:border-[#0E9DA5] font-bold text-gray-700" 
             />
           </div>
        </div>

        <div className="flex items-center justify-end gap-4 pt-4">
           <Button
             type="button"
             variant="ghost"
             onClick={handleCancel}
             disabled={isLoading}
             className="h-12 rounded-2xl px-8 font-bold text-gray-500 hover:bg-gray-50"
           >
             Reset
           </Button>
           <Button
             type="submit"
             disabled={isLoading}
             className="bg-[#0E9DA5] hover:bg-[#0a7a80] text-white px-10 h-12 rounded-2xl font-bold shadow-glow text-sm flex items-center justify-center gap-2"
           >
             {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
             Update Password
           </Button>
        </div>
      </form>
    </div>
  );
}
