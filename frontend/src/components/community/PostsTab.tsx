'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CreatePostDialog } from '@/components/community/CreatePostDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Paperclip,
  Smile,
  Image as ImageIcon,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Bookmark,
  Send,
  Loader2,
  Pin,
  ExternalLink,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';
import { ApiService, type PostCommentData, type PostData } from '@/services/api';
import { formatDistanceToNow } from 'date-fns';
import { toastAxiosError } from '@/hooks/useAxiosError';
import useUserData from '@/hooks/useUserData';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog as AlertDialog,
  DialogContent as AlertDialogContent,
  DialogHeader as AlertDialogHeader,
  DialogTitle as AlertDialogTitle,
  DialogDescription as AlertDialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface PostsTabProps {
  communityName: string;
  communityId: number;
  isOwner?: boolean;
}

export function PostsTab({ communityName, communityId, isOwner }: PostsTabProps) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [commentsByPost, setCommentsByPost] = useState<Record<number, PostCommentData[]>>({});
  const [loadedComments, setLoadedComments] = useState<Set<number>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [commentLoading, setCommentLoading] = useState<Set<number>>(new Set());
  const [commentSubmitting, setCommentSubmitting] = useState<Set<number>>(new Set());
  const [reactingPosts, setReactingPosts] = useState<Set<number>>(new Set());
  const [savingBookmarks, setSavingBookmarks] = useState<Set<number>>(new Set());
  const userData = useUserData();

  const toggleCreatePost = () => setIsCreatePostOpen((s) => !s);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await ApiService.communities.getPosts(communityId, {
        limit: 20,
        offset: 0,
      });
      setPosts(response.data.data.posts);
    } catch (error) {
      toastAxiosError(error, 'Failed to load posts.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete) return;
    const idToRemove = postToDelete;
    setDeleting(true);
    try {
      await ApiService.communities.deletePost(idToRemove);
      toast.success('Post deleted successfully');
      
      // Close the modal first to allow Radix UI to cleanup focus and scroll lock
      setPostToDelete(null);
      
      // Small delay to ensure modal transition starts/completes before state update
      setTimeout(() => {
        setPosts((prev) => prev.filter((p) => p.id !== idToRemove));
      }, 100);
    } catch (error) {
      toastAxiosError(error, 'Failed to delete post.');
      setDeleting(false);
    } finally {
      setDeleting(false);
    }
  };

  const setPostSetState = (
    setter: Dispatch<SetStateAction<Set<number>>>,
    id: number,
    present: boolean,
  ) => {
    setter((prev) => {
      const next = new Set(prev);
      if (present) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const loadComments = async (postId: number) => {
    setPostSetState(setCommentLoading, postId, true);
    try {
      const response = await ApiService.communities.getPostComments(postId, {
        limit: 50,
        offset: 0,
      });
      const comments = response.data.data.comments;
      const total = response.data.data.pagination?.total ?? comments.length;
      setCommentsByPost((prev) => ({ ...prev, [postId]: comments }));
      setLoadedComments((prev) => new Set(prev).add(postId));
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId ? { ...post, comments_count: total } : post,
        ),
      );
    } catch (error) {
      toastAxiosError(error, 'Failed to load comments.');
    } finally {
      setPostSetState(setCommentLoading, postId, false);
    }
  };

  const handleToggleComments = (post: PostData) => {
    const shouldOpen = !openComments.has(post.id);
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (shouldOpen) next.add(post.id);
      else next.delete(post.id);
      return next;
    });
    if (shouldOpen && !loadedComments.has(post.id)) {
      void loadComments(post.id);
    }
  };

  const handleSubmitComment = async (post: PostData) => {
    if (!post.comments_enabled) return;
    const draft = commentDrafts[post.id]?.trim();
    if (!draft) return;
    setPostSetState(setCommentSubmitting, post.id, true);
    try {
      await ApiService.communities.createPostComment(post.id, { body: draft });
      setCommentDrafts((prev) => ({ ...prev, [post.id]: '' }));
      setOpenComments((prev) => new Set(prev).add(post.id));
      await loadComments(post.id);
    } catch (error) {
      toastAxiosError(error, 'Failed to post comment.');
    } finally {
      setPostSetState(setCommentSubmitting, post.id, false);
    }
  };

  const handleToggleReaction = async (post: PostData) => {
    setPostSetState(setReactingPosts, post.id, true);
    try {
      const response = await ApiService.communities.togglePostReaction(post.id, {
        reaction_type: 'like',
      });
      const reaction = response.data.data;
      setPosts((prev) =>
        prev.map((item) =>
          item.id === post.id
            ? {
                ...item,
                reactions_count: reaction.reactions_count,
                current_user_reacted: reaction.reacted,
                current_user_reaction_type: reaction.reacted
                  ? reaction.reaction_type
                  : null,
              }
            : item,
        ),
      );
    } catch (error) {
      toastAxiosError(error, 'Failed to update reaction.');
    } finally {
      setPostSetState(setReactingPosts, post.id, false);
    }
  };

  const handleSharePost = async (post: PostData) => {
    const href = `${window.location.origin}/dashboard/community/${communityId}?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: communityName,
          text: post.body || `Post from ${communityName}`,
          url: href,
        });
      } else {
        await navigator.clipboard.writeText(href);
        toast.success('Post link copied');
      }
    } catch (error) {
      if ((error as Error)?.name !== 'AbortError') {
        toast.error('Unable to share post');
      }
    }
  };

  const handleBookmarkPost = async (post: PostData) => {
    setPostSetState(setSavingBookmarks, post.id, true);
    try {
      const response = await ApiService.bookmarks.create({
        kind: 'post',
        target_ref: `post:${post.id}`,
        title: post.body?.slice(0, 80) || `Post in ${communityName}`,
        description: post.body || '',
        source: communityName,
        href: `/dashboard/community/${communityId}?post=${post.id}`,
        community_id: communityId,
        community_name: communityName,
      });
      toast.success(
        response.data.data.already_saved ? 'Post already saved' : 'Post saved',
      );
    } catch (error) {
      toastAxiosError(error, 'Failed to save post.');
    } finally {
      setPostSetState(setSavingBookmarks, post.id, false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [communityId]);

  // Safety cleanup for Radix UI body locks
  useEffect(() => {
    if (!postToDelete) {
      const timer = setTimeout(() => {
        document.body.style.pointerEvents = '';
        document.body.style.overflow = '';
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [postToDelete]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Premium Create Post Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-soft transition-all hover:shadow-lg">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12 border-2 border-white shadow-soft rounded-2xl overflow-hidden">
            {userData?.profile_photo ? (
              <AvatarImage src={userData.profile_photo} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-teal-50 text-[#0E9DA5] font-bold">
              {userData?.firstname?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-4">
             <div className="relative group">
                <Input
                  placeholder={`Share something with ${communityName}...`}
                  className="bg-gray-50/50 border-gray-100 focus:border-[#0E9DA5] focus:ring-4 focus:ring-teal-500/5 text-gray-700 pr-12 rounded-2xl h-14 text-base font-medium transition-all placeholder:text-gray-400"
                  onClick={toggleCreatePost}
                  readOnly
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                   <Button
                     variant="ghost"
                     size="icon"
                     onClick={toggleCreatePost}
                     aria-label="Add image to post"
                     className="h-10 w-10 rounded-xl hover:bg-teal-50 hover:text-[#0E9DA5] text-gray-400 transition-colors"
                   >
                     <ImageIcon className="w-5 h-5" />
                   </Button>
                </div>
             </div>
             
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleCreatePost}
                    className="rounded-full text-gray-500 hover:text-[#0E9DA5] hover:bg-teal-50 font-bold text-xs gap-2"
                  >
                    <Paperclip className="w-4 h-4" />
                    Attach
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled
                    title="Emoji picker is not supported yet"
                    className="rounded-full text-gray-400 font-bold text-xs gap-2"
                  >
                    <Smile className="w-4 h-4" />
                    Emoji
                  </Button>
                </div>
                <Button 
                  onClick={toggleCreatePost}
                  className="bg-[#0E9DA5] hover:bg-[#0a7a80] text-white px-6 h-10 rounded-xl font-bold shadow-glow text-sm"
                >
                  Post Now
                </Button>
             </div>
          </div>
        </div>
      </div>

      {/* Feed Controls */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">Recent Posts</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 h-9 rounded-xl border-gray-100 bg-white/50 text-xs font-bold focus:ring-[#0E9DA5]/10">
              <SelectValue placeholder="Recent" />
            </SelectTrigger>
            <SelectContent className="bg-white/90 backdrop-blur-xl border-white/20 rounded-xl shadow-elevated">
              <SelectItem value="recent" className="text-xs font-medium focus:bg-teal-50 focus:text-[#0E9DA5] cursor-pointer">Recent</SelectItem>
              <SelectItem value="popular" className="text-xs font-medium focus:bg-teal-50 focus:text-[#0E9DA5] cursor-pointer">Popular</SelectItem>
              <SelectItem value="newest" className="text-xs font-medium focus:bg-teal-50 focus:text-[#0E9DA5] cursor-pointer">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-soft animate-pulse">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gray-100 rounded-2xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded-full w-1/3" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/4" />
                </div>
              </div>
              <div className="h-4 bg-gray-100 rounded-full w-full mb-3" />
              <div className="h-4 bg-gray-100 rounded-full w-5/6 mb-6" />
              <div className="h-48 bg-gray-100 rounded-2xl w-full" />
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-soft text-center space-y-4">
            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <MessageCircle className="w-10 h-10 text-[#0E9DA5]" />
            </div>
            <h4 className="text-xl font-extrabold text-gray-900 tracking-tight">No posts yet</h4>
            <p className="text-gray-500 max-w-xs mx-auto font-medium">Be the first to start a conversation in the {communityName} circle!</p>
            <Button 
               onClick={toggleCreatePost}
               variant="outline"
               className="border-[#0E9DA5] text-[#0E9DA5] hover:bg-teal-50 rounded-2xl font-bold px-8 h-12 transition-all mt-4"
            >
              Create first post
            </Button>
          </div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="group bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-soft transition-all hover:shadow-elevated hover:bg-white animate-fade-in-up">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-white shadow-soft rounded-2xl overflow-hidden transition-transform group-hover:scale-105">
                    {post.author?.profile_photo ? (
                      <AvatarImage src={post.author.profile_photo} className="object-cover" />
                    ) : null}
                    <AvatarFallback className="bg-teal-50 text-[#0E9DA5] font-bold">
                      {(post.author?.firstname || post.author?.full_name || 'M').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                       <h4 className="font-extrabold text-gray-900 tracking-tight leading-none">
                         {post.author?.full_name || 'Member'}
                       </h4>
                       {post.is_pinned && (
                         <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                           <Pin className="w-2.5 h-2.5" /> Pinned
                         </div>
                       )}
                    </div>
                    <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-1.5">
                      <span>@{(post.author?.firstname || 'member').toLowerCase()}</span>
                      <span className="w-1 h-1 bg-gray-200 rounded-full" />
                      <span>{formatDistanceToNow(new Date(post.created_at))} ago</span>
                    </p>
                  </div>
                </div>
                
                {/* 3-dot Menu (Only for author) */}
                <div className="flex items-center gap-1">
                   {post.author_user_id === userData?.id && (
                     <DropdownMenu modal={false}>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100">
                           <MoreHorizontal className="w-5 h-5" />
                         </Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end" className="w-40 bg-white/95 backdrop-blur-xl border-white/20 rounded-xl shadow-elevated p-1">
                         <DropdownMenuItem 
                           onClick={() => setPostToDelete(post.id)}
                           className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 focus:bg-red-50 focus:text-red-600 rounded-lg cursor-pointer transition-colors"
                         >
                           <Trash2 className="w-4 h-4" />
                           Delete Post
                         </DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                   )}
                </div>
              </div>

              {/* Post Content */}
              <div className="space-y-4 mb-6">
                <p className="text-gray-700 leading-relaxed text-base font-medium whitespace-pre-wrap">
                  {post.body}
                </p>
                
                {/* Media Gallery (Twitter/Facebook Style) */}
                {post.media_urls && post.media_urls.length > 0 && (
                   <div className={`grid gap-2 rounded-2xl overflow-hidden border border-gray-100 ${
                     post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                   }`}>
                     {post.media_urls.map((url, idx) => (
                       <div key={idx} className={`relative aspect-video bg-gray-50 overflow-hidden ${
                         post.media_urls.length === 3 && idx === 0 ? 'row-span-2 aspect-square' : ''
                       }`}>
                         <img 
                            src={url} 
                            alt={`Post media ${idx + 1}`} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                       </div>
                     ))}
                   </div>
                )}
              </div>

              {/* Post Interactions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button
                    variant="ghost"
                    disabled={reactingPosts.has(post.id)}
                    onClick={() => void handleToggleReaction(post)}
                    aria-pressed={post.current_user_reacted}
                    className={`h-10 rounded-xl px-4 gap-2 transition-all group/btn ${
                      post.current_user_reacted
                        ? 'text-red-500 bg-red-50 hover:bg-red-100'
                        : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                    }`}
                  >
                    <Heart className={`w-5 h-5 transition-transform group-hover/btn:scale-125 ${
                      post.current_user_reacted ? 'fill-current' : ''
                    }`} />
                    <span className="text-sm font-bold">{post.reactions_count ?? 0}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleToggleComments(post)}
                    aria-expanded={openComments.has(post.id)}
                    aria-controls={`post-${post.id}-comments`}
                    className="h-10 rounded-xl px-4 gap-2 text-gray-500 hover:text-[#0E9DA5] hover:bg-teal-50 transition-all group/btn"
                  >
                    <MessageCircle className="w-5 h-5 transition-transform group-hover/btn:scale-125" />
                    <span className="text-sm font-bold">{post.comments_count ?? 0}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => void handleSharePost(post)}
                    className="h-10 rounded-xl px-4 gap-2 text-gray-500 hover:text-[#0E9DA5] hover:bg-teal-50 transition-all group/btn"
                  >
                    <Share2 className="w-5 h-5 transition-transform group-hover/btn:scale-125" />
                    <span className="text-sm font-bold hidden sm:inline">Share</span>
                  </Button>
                </div>
                
                <div className="flex items-center gap-1">
                   <Button
                     variant="ghost"
                     size="icon"
                     disabled={savingBookmarks.has(post.id)}
                     onClick={() => void handleBookmarkPost(post)}
                     title="Save post"
                     className="h-10 w-10 rounded-xl text-gray-400 hover:text-[#0E9DA5] hover:bg-teal-50"
                   >
                     <Bookmark className="w-5 h-5" />
                   </Button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AlertDialog open={!!postToDelete} onOpenChange={(open) => {
        if (!open && !deleting) setPostToDelete(null);
      }}>
        <AlertDialogContent 
          showClose={false}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="p-0 bg-white/95 backdrop-blur-2xl rounded-[32px] w-full max-sm overflow-hidden border-white/20 shadow-elevated animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="p-8 text-center space-y-6">
             <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto ring-8 ring-red-50/50">
                <AlertCircle className="w-10 h-10 text-red-500" />
             </div>
             <div className="space-y-2">
                <AlertDialogTitle className="text-2xl font-extrabold text-gray-900 tracking-tight">Delete Post?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-500 font-medium">
                   This action cannot be undone. This post will be permanently removed from the circle feed.
                </AlertDialogDescription>
             </div>
             <div className="flex flex-col gap-3">
                <Button 
                   onClick={handleDeletePost}
                   disabled={deleting}
                   className="w-full h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-extrabold shadow-glow-red transition-all flex items-center justify-center gap-2"
                >
                   {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Delete Post'}
                </Button>
                <Button 
                   variant="ghost" 
                   onClick={() => setPostToDelete(null)}
                   disabled={deleting}
                   className="w-full h-12 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all"
                >
                   Cancel
                </Button>
             </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Post Dialog */}
      <CreatePostDialog
        isOpen={isCreatePostOpen}
        toggleDialog={toggleCreatePost}
        communityName={communityName}
        communityId={communityId}
        onPostCreated={fetchPosts}
        isOwner={isOwner}
      />
    </div>
  );
}
