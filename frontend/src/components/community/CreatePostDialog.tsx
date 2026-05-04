'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Globe,
  Image as ImageIcon,
  Pin,
  Send,
  Smile,
  X,
} from 'lucide-react';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { toastAxiosError } from '@/hooks/useAxiosError';
import useUserData from '@/hooks/useUserData';
import { cn } from '@/lib/utils';

interface CreatePostDialogProps {
  isOpen: boolean;
  toggleDialog: () => void;
  communityName?: string;
  communityId?: number;
  onPostCreated?: () => void;
  isOwner?: boolean;
}

interface MyCommunity {
  id: number;
  name: string;
}

const MAX_LENGTH = 280;

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
  const [selectedCommunityId, setSelectedCommunityId] = useState<number | undefined>(
    communityId
  );
  const [selectedCommunityName, setSelectedCommunityName] = useState<string | undefined>(
    communityName
  );
  const [myCommunities, setMyCommunities] = useState<MyCommunity[]>([]);
  const userData = useUserData() as
    | {
        full_name?: string;
        firstname?: string;
        profile_photo?: string | null;
      }
    | null;

  useEffect(() => {
    if (communityId) setSelectedCommunityId(communityId);
    if (communityName) setSelectedCommunityName(communityName);
  }, [communityId, communityName]);

  useEffect(() => {
    if (isOpen && !communityId) {
      const fetchMyCommunities = async () => {
        try {
          const response = await ApiService.communities.joined({ limit: 50 });
          const list: MyCommunity[] = response.data.data.communities ?? [];
          setMyCommunities(list);
          if (list.length > 0 && !selectedCommunityId) {
            setSelectedCommunityId(list[0].id);
            setSelectedCommunityName(list[0].name);
          }
        } catch (error) {
          console.error('Error fetching joined communities', error);
        }
      };
      fetchMyCommunities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        media_urls: [],
        mentioned_user_ids: [],
      });
      toast.success('Post shared');
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

  const remaining = MAX_LENGTH - text.length;
  const overLimit = remaining < 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent
        showClose={false}
        className="w-full max-w-xl overflow-hidden rounded-2xl border-border bg-card p-0 shadow-2xl"
      >
        <DialogHeader className="flex flex-row items-center justify-between border-b border-border px-5 py-4">
          <div className="space-y-0.5">
            <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
              Create a post
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Share an update with your community.
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleCancel}
            aria-label="Close"
          >
            <X className="size-4" aria-hidden="true" />
          </Button>
        </DialogHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          {/* Author */}
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage
                src={userData?.profile_photo || '/images/image.png'}
                alt=""
              />
              <AvatarFallback className="bg-brand-soft text-accent-foreground font-bold">
                {userData?.firstname?.charAt(0)?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                {userData?.full_name || 'You'}
              </p>
              <div className="mt-1">
                {communityId ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5">
                    <Globe
                      className="size-3 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {communityName}
                    </span>
                  </span>
                ) : (
                  <label className="sr-only" htmlFor="post-community">
                    Choose community
                  </label>
                )}
                {!communityId && (
                  <select
                    id="post-community"
                    value={selectedCommunityId ?? ''}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setSelectedCommunityId(id);
                      const name = myCommunities.find((c) => c.id === id)?.name;
                      setSelectedCommunityName(name);
                    }}
                    className="cursor-pointer rounded-full border border-border bg-brand-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent-foreground outline-none transition-colors hover:border-input focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {myCommunities.length === 0 && (
                      <option value="">No circles joined</option>
                    )}
                    {myCommunities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
                {selectedCommunityName && !communityId && myCommunities.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    Join a community first
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Composer */}
          <div className="space-y-1.5">
            <label htmlFor="post-body" className="sr-only">
              Post content
            </label>
            <textarea
              id="post-body"
              placeholder={`What's on your mind, ${userData?.firstname || 'friend'}?`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-invalid={overLimit ? 'true' : undefined}
              className={cn(
                'custom-scrollbar w-full min-h-[160px] resize-none rounded-xl border border-border bg-muted/30 px-4 py-3',
                'text-base font-medium text-foreground placeholder:text-muted-foreground',
                'outline-none transition-colors hover:border-input focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30'
              )}
              autoFocus
            />
          </div>

          {/* Settings */}
          <div className="flex flex-wrap gap-2.5 border-t border-border pt-4">
            {isOwner && (
              <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-3 py-1.5">
                <Switch
                  id="pin-post"
                  checked={isPinned}
                  onCheckedChange={setIsPinned}
                  className="data-[state=checked]:bg-warning"
                />
                <Label
                  htmlFor="pin-post"
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-warning"
                >
                  <Pin className="size-3" aria-hidden="true" />
                  Pin to top
                </Label>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand-soft/60 px-3 py-1.5">
              <Switch
                id="enable-comments"
                checked={commentsEnabled}
                onCheckedChange={setCommentsEnabled}
              />
              <Label
                htmlFor="enable-comments"
                className="cursor-pointer text-xs font-semibold text-accent-foreground"
              >
                Comments enabled
              </Label>
            </div>
          </div>

          {/* Action toolbar + send */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 p-1.5">
              <div className="flex items-center gap-0.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Add image"
                  title="Add image"
                  className="text-muted-foreground hover:text-primary"
                >
                  <ImageIcon className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Add emoji"
                  title="Add emoji"
                  className="text-muted-foreground hover:text-primary"
                >
                  <Smile className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Schedule"
                  title="Schedule"
                  className="text-muted-foreground hover:text-primary"
                >
                  <Calendar className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <Badge
                variant={overLimit ? 'destructiveSoft' : 'soft'}
                size="sm"
                className="tabular-nums"
              >
                {text.length} / {MAX_LENGTH}
              </Badge>
            </div>

            <Button
              type="button"
              size="xl"
              block
              loading={loading}
              disabled={!text.trim() || overLimit || !selectedCommunityId}
              trailingIcon={!loading ? <Send className="size-4" /> : undefined}
              onClick={handlePost}
              className="h-12 text-base"
            >
              {loading ? 'Posting…' : 'Share post'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
