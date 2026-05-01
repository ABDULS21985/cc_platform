'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, Mail, User, Phone, MapPin, Calendar, CheckCircle2, Loader2 } from 'lucide-react';
import useUserData from '@/hooks/useUserData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiService } from '@/services/api';
import toast from 'react-hot-toast';
import { toastAxiosError } from '@/hooks/useAxiosError';

export function AccountInformationForm() {
  const userData = useUserData();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    phone_number: '',
    bio: ''
  });

  useEffect(() => {
    if (userData) {
      setFormData({
        firstname: userData.firstname || '',
        lastname: userData.lastname || '',
        phone_number: userData.phone_number || '',
        bio: userData.bio || ''
      });
    }
  }, [userData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
       const res = await ApiService.profile.update(formData);
       if (res.data && res.data.success !== false) {
           toast.success('Profile updated successfully');
           // Reload to fetch the updated user data across the app
           window.location.reload();
       }
    } catch(err) {
       toastAxiosError(err, 'Failed to update profile');
    } finally {
       setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);
    
    setLoading(true);
    try {
        const res = await ApiService.profile.uploadImage(uploadData);
        if (res.data && res.data.success !== false) {
            toast.success('Profile image updated');
            window.location.reload();
        }
    } catch(err) {
        toastAxiosError(err, 'Failed to upload image');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Profile Header Section */}
      <div className="relative">
        <div className="h-32 w-full bg-gradient-to-r from-teal-500/10 via-[#0E9DA5]/5 to-teal-500/10 rounded-3xl border border-white/20 overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        </div>
        <div className="px-8 -mt-12 flex flex-col sm:flex-row items-end gap-6">
          <div className="relative group">
            <Avatar className="h-28 w-28 border-4 border-white shadow-elevated rounded-[32px] overflow-hidden">
              <AvatarImage src={userData?.profile_image || "/images/image.png"} className="object-cover" />
              <AvatarFallback className="bg-teal-50 text-[#0E9DA5] text-3xl font-black">
                {userData?.firstname?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="absolute bottom-0 right-0 p-2 bg-[#0E9DA5] text-white rounded-xl shadow-glow hover:scale-110 transition-transform border-2 border-white"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2">
               <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                 {userData?.full_name || "User Name"}
               </h2>
               <CheckCircle2 className="w-5 h-5 text-teal-500" />
            </div>
            <p className="text-gray-400 font-bold text-sm mt-1 uppercase tracking-widest">
              @{userData?.firstname?.toLowerCase() || "username"} • {userData?.user_type || "Standard Account"}
            </p>
          </div>
          <div className="pb-2">
             <Button 
               onClick={handleSave}
               disabled={loading}
               className="bg-[#0E9DA5] hover:bg-[#0a7a80] text-white px-8 h-12 rounded-2xl font-bold shadow-glow text-sm flex items-center gap-2"
             >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
             </Button>
          </div>
        </div>
      </div>

      {/* Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
        <div className="space-y-6">
           <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">First Name</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors group-focus-within:text-[#0E9DA5]">
                  <User className="w-4 h-4" />
                </div>
                <Input 
                  name="firstname"
                  value={formData.firstname} 
                  onChange={handleInputChange}
                  className="pl-11 h-14 bg-gray-50/50 border-gray-100 rounded-2xl focus:ring-[#0E9DA5]/5 focus:border-[#0E9DA5] font-bold text-gray-700" 
                />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors group-focus-within:text-[#0E9DA5]">
                  <Mail className="w-4 h-4" />
                </div>
                <Input 
                  defaultValue={userData?.email} 
                  readOnly
                  className="pl-11 h-14 bg-gray-100/50 border-gray-100 rounded-2xl cursor-not-allowed font-bold text-gray-400" 
                />
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Last Name</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors group-focus-within:text-[#0E9DA5]">
                  <User className="w-4 h-4" />
                </div>
                <Input 
                  name="lastname"
                  value={formData.lastname} 
                  onChange={handleInputChange}
                  className="pl-11 h-14 bg-gray-50/50 border-gray-100 rounded-2xl focus:ring-[#0E9DA5]/5 focus:border-[#0E9DA5] font-bold text-gray-700" 
                />
              </div>
           </div>

           <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Phone Number</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors group-focus-within:text-[#0E9DA5]">
                  <Phone className="w-4 h-4" />
                </div>
                <Input 
                  name="phone_number"
                  value={formData.phone_number} 
                  onChange={handleInputChange}
                  placeholder="Not provided"
                  className="pl-11 h-14 bg-gray-50/50 border-gray-100 rounded-2xl focus:ring-[#0E9DA5]/5 focus:border-[#0E9DA5] font-bold text-gray-700" 
                />
              </div>
           </div>
        </div>
      </div>

      {/* Extended Info */}
      <div className="px-2 space-y-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Bio / Status Message</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            placeholder="Tell us a bit about yourself..."
            rows={4}
            className="w-full p-4 bg-gray-50/50 border border-gray-100 rounded-[24px] focus:border-[#0E9DA5] focus:ring-4 focus:ring-[#0E9DA5]/5 focus:outline-none resize-none font-medium text-gray-700 transition-all placeholder:text-gray-300"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-teal-50/50 border border-teal-100/50 rounded-3xl p-6 flex items-center gap-4 group hover:bg-teal-50 transition-colors">
              <div className="h-12 w-12 bg-white rounded-2xl shadow-soft flex items-center justify-center text-[#0E9DA5] group-hover:scale-110 transition-transform">
                 <MapPin className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs font-black text-teal-600/50 uppercase tracking-tighter">Location</p>
                 <p className="text-sm font-bold text-gray-700">Lagos, Nigeria</p>
              </div>
           </div>

           <div className="bg-amber-50/50 border border-amber-100/50 rounded-3xl p-6 flex items-center gap-4 group hover:bg-amber-50 transition-colors">
              <div className="h-12 w-12 bg-white rounded-2xl shadow-soft flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                 <Calendar className="w-6 h-6" />
              </div>
              <div>
                 <p className="text-xs font-black text-amber-600/50 uppercase tracking-tighter">Member Since</p>
                 <p className="text-sm font-bold text-gray-700">
                    {userData?.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'April 2024'}
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
