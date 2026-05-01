'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Smile,
  Image as ImageIcon,
  Calendar,
  X,
  Globe,
  Lock,
  Loader2,
} from 'lucide-react';
import { ApiService } from '@/services/api';
import toast from 'react-hot-toast';
import { toastAxiosError } from '@/hooks/useAxiosError';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import useUserData from '@/hooks/useUserData';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CreatePostDialogProps {
  isOpen: boolean;
  toggleDialog: () => void;
  communityName?: string;
  communityId?: number;
  onPostCreated?: () => void;
  isOwner?: boolean;
}

export function CreatePostDialog({
  isOpen,
  toggleDialog,
  communityName,
  communityId,
  onPostCreated,
  isOwner,
}: CreatePostDialogProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | undefined>(communityId);
  const [selectedCommunityName, setSelectedCommunityName] = useState<string | undefined>(communityName);
  const [myCommunities, setMyCommunities] = useState<any[]>([]);
  const userData = useUserData();

  // Update selected community when props change
  useEffect(() => {
    if (communityId) setSelectedCommunityId(communityId);
    if (communityName) setSelectedCommunityName(communityName);
  }, [communityId, communityName]);

  // Fetch joined communities if no communityId provided
  useEffect(() => {
    if (isOpen && !communityId) {
      const fetchMyCommunities = async () => {
        try {
          const response = await ApiService.communities.joined({ limit: 50 });
          setMyCommunities(response.data.data.communities);
          if (response.data.data.communities.length > 0 && !selectedCommunityId) {
             setSelectedCommunityId(response.data.data.communities[0].id);
             setSelectedCommunityName(response.data.data.communities[0].name);
          }
        } catch (error) {
          console.error("Error fetching joined communities", error);
        }
      };
      fetchMyCommunities();
    }
  }, [isOpen, communityId]);

  const handlePost = async () => {
    if (!text.trim() || !selectedCommunityId) return;
    
    setLoading(true);
    try {
      await ApiService.communities.createPost(selectedCommunityId, {
        body: text,
        post_type: 'post',
        is_pinned: isPinned,
        comments_enabled: commentsEnabled,
        media_urls: [], // Placeholder for media
        mentioned_user_ids: [], // Placeholder for mentions
      });
      toast.success('Post shared successfully!');
      setText('');
      setIsPinned(false);
      setCommentsEnabled(true);
      toggleDialog();
      onPostCreated?.();
    } catch (error) {
      toastAxiosError(error, 'Failed to create post.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (loading) return;
    toggleDialog();
    setText('');
    setIsPinned(false);
    setCommentsEnabled(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent showClose={false} className="p-0 bg-white/95 backdrop-blur-2xl rounded-[32px] w-full max-w-xl overflow-hidden border-white/20 shadow-elevated animate-in fade-in zoom-in-95 duration-200">
        <DialogHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
          <DialogTitle className="text-xl font-extrabold text-gray-900 tracking-tight">
            Create Post
          </DialogTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCancel} 
            className="rounded-full h-8 w-8 text-gray-400 hover:text-gray-900 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3">
             <Avatar className="h-10 w-10 border-2 border-white shadow-soft rounded-xl overflow-hidden">
                <AvatarImage src={userData?.profile_image || "/images/image.png"} className="object-cover" />
                <AvatarFallback className="bg-teal-50 text-[#0E9DA5] font-bold">
                  {userData?.firstname?.charAt(0) || "U"}
                </AvatarFallback>
             </Avatar>
             <div>
                <p className="text-sm font-extrabold text-gray-900 tracking-tight leading-none mb-1">
                  {userData?.full_name}
                </p>
                {communityId ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 border border-gray-100 rounded-full w-fit">
                    <Globe className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{communityName}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <select 
                      className="text-[10px] font-bold text-[#0E9DA5] uppercase tracking-wider bg-teal-50 border border-teal-100 rounded-full px-2 py-0.5 outline-none cursor-pointer"
                      value={selectedCommunityId}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        setSelectedCommunityId(id);
                        const name = myCommunities.find(c => c.id === id)?.name;
                        setSelectedCommunityName(name);
                      }}
                    >
                      {myCommunities.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                      {myCommunities.length === 0 && <option>No circles joined</option>}
                    </select>
                  </div>
                )}
             </div>
          </div>

          <textarea
            placeholder={`What's on your mind, ${userData?.firstname || 'friend'}?`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full min-h-[160px] resize-none outline-none border-0 focus:ring-0 text-lg font-medium text-gray-700 placeholder:text-gray-300 transition-all custom-scrollbar"
            autoFocus
          />

          {/* Post Settings */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-50">
             {isOwner && (
               <div className="flex items-center space-x-2 bg-amber-50/50 px-3 py-2 rounded-xl border border-amber-100/50">
                 <Switch 
                   id="pin-post" 
                   checked={isPinned} 
                   onCheckedChange={setIsPinned}
                   className="data-[state=checked]:bg-amber-500"
                 />
                 <Label htmlFor="pin-post" className="text-xs font-bold text-amber-700 cursor-pointer">Pin to top</Label>
               </div>
             )}
             <div className="flex items-center space-x-2 bg-teal-50/50 px-3 py-2 rounded-xl border border-teal-100/50">
               <Switch 
                 id="enable-comments" 
                 checked={commentsEnabled} 
                 onCheckedChange={setCommentsEnabled}
                 className="data-[state=checked]:bg-[#0E9DA5]"
               />
               <Label htmlFor="enable-comments" className="text-xs font-bold text-[#0E9DA5] cursor-pointer">Enable comments</Label>
             </div>
          </div>

          <div className="flex flex-col gap-4">
             {/* Action Toolbar */}
             <div className="flex items-center justify-between p-2 bg-gray-50/50 border border-gray-100 rounded-2xl">
                <div className="flex items-center gap-1">
                   <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-500 hover:text-[#0E9DA5] hover:bg-teal-50" title="Add Image">
                      <ImageIcon className="w-5 h-5" />
                   </Button>
                   <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-500 hover:text-[#0E9DA5] hover:bg-teal-50" title="Add Emoji">
                      <Smile className="w-5 h-5" />
                   </Button>
                   <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-gray-500 hover:text-[#0E9DA5] hover:bg-teal-50" title="Schedule">
                      <Calendar className="w-5 h-5" />
                   </Button>
                </div>
                <div className="px-3">
                   <span className={`text-xs font-bold ${text.length > 280 ? 'text-red-500' : 'text-gray-400'}`}>
                      {text.length} / 280
                   </span>
                </div>
             </div>

             <Button
                disabled={!text.trim() || loading || text.length > 280 || !selectedCommunityId}
                onClick={handlePost}
                className="w-full h-14 rounded-2xl bg-[#0E9DA5] hover:bg-[#0a7a80] text-white font-extrabold text-base shadow-glow transition-all hover:shadow-lg disabled:bg-gray-100 disabled:text-gray-300 flex items-center justify-center gap-2"
             >
                {loading ? (
                   <>
                     <Loader2 className="w-5 h-5 animate-spin" />
                     Posting...
                   </>
                ) : (
                   'Share Post'
                )}
             </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
