'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  Globe,
  Image as ImageIcon,
  Loader2,
  Pin,
  Send,
  X,
} from 'lucide-react';
import { ApiService, type MemberData } from '@/services/api';
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
const MAX_MEDIA_FILES = 4;
const MAX_MEDIA_SIZE = 5 * 1024 * 1024;
const MENTION_DEBOUNCE_MS = 200;
const MENTION_LIMIT = 8;

interface MentionableMember {
  id: number;
  full_name: string;
  firstname?: string | null;
  profile_photo?: string | null;
}

function extractMentionQuery(text: string, caret: number): { query: string; start: number } | null {
  if (caret <= 0) return null;
  const before = text.slice(0, caret);
  const match = /(?:^|\s)@([\w.]*)$/.exec(before);
  if (!match) return null;
  const start = caret - match[1].length - 1;
  return { query: match[1] ?? '', start };
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
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [uploadedMedia, setUploadedMedia] = useState<{ url: string; name: string }[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [commentsEnabled, setCommentsEnabled] = useState(true);
  const [mentionedIds, setMentionedIds] = useState<Set<number>>(new Set());
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionResults, setMentionResults] = useState<MentionableMember[]>([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionStartRef = useRef<number | null>(null);
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
          toastAxiosError(error, 'Failed to load communities.');
        }
      };
      fetchMyCommunities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, communityId]);

  const handlePost = async () => {
    if ((!text.trim() && uploadedMedia.length === 0) || !selectedCommunityId) return;
    setLoading(true);
    try {
      await ApiService.communities.createPost(selectedCommunityId, {
        body: text.trim() || null,
        post_type: 'post',
        is_pinned: isPinned,
        comments_enabled: commentsEnabled,
        media_urls: uploadedMedia.map((m) => m.url),
        mentioned_user_ids: Array.from(mentionedIds),
      });
      toast.success('Post shared');
      resetForm();
      toggleDialog();
      onPostCreated?.();
    } catch (error) {
      toastAxiosError(error, 'Failed to create post.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setText('');
    setMediaFiles([]);
    setUploadedMedia([]);
    setIsPinned(false);
    setCommentsEnabled(true);
    setMentionedIds(new Set());
    setMentionQuery(null);
    setMentionResults([]);
    mentionStartRef.current = null;
  };

  const handleCancel = () => {
    if (loading) return;
    toggleDialog();
    resetForm();
  };

  const handleMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (selected.length === 0) return;

    const remainingSlots = MAX_MEDIA_FILES - uploadedMedia.length;
    if (remainingSlots <= 0) {
      toast.error(`You can attach up to ${MAX_MEDIA_FILES} images`);
      return;
    }

    const accepted: File[] = [];
    for (const file of selected) {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image uploads are supported');
        continue;
      }
      if (file.size > MAX_MEDIA_SIZE) {
        toast.error(`${file.name} must be 5MB or smaller`);
        continue;
      }
      accepted.push(file);
      if (accepted.length >= remainingSlots) break;
    }
    if (accepted.length === 0) return;

    setMediaFiles((prev) => [...prev, ...accepted]);
    setUploadingMedia(true);
    try {
      const uploadData = new FormData();
      accepted.forEach((file) => uploadData.append('files', file));
      const uploadRes = await ApiService.communities.uploadPostMedia(uploadData);
      const items = uploadRes.data.data.media.map((item, idx) => ({
        url: item.url,
        name: item.original_filename || accepted[idx]?.name || `image-${idx + 1}`,
      }));
      setUploadedMedia((prev) => [...prev, ...items]);
    } catch (error) {
      toastAxiosError(error, 'Failed to upload media.');
      // Roll back local mediaFiles for the failed batch.
      const acceptedKeys = new Set(accepted.map((f) => `${f.name}-${f.lastModified}`));
      setMediaFiles((prev) =>
        prev.filter((f) => !acceptedKeys.has(`${f.name}-${f.lastModified}`)),
      );
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMediaFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  // Mention autocomplete: detect "@<query>" before the caret, debounce 200ms,
  // call backend member search, and render a popover.
  useEffect(() => {
    if (mentionQuery === null) {
      setMentionResults([]);
      return;
    }
    if (!selectedCommunityId) {
      setMentionResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setMentionLoading(true);
      try {
        const res = await ApiService.communities.getMembers(selectedCommunityId, {
          q: mentionQuery,
          mentionable: true,
          limit: MENTION_LIMIT,
        });
        const members = (res.data?.data?.members ?? []) as MemberData[];
        const mapped: MentionableMember[] = members
          .map((m) => {
            const user = m.user ?? {};
            return {
              id: Number(m.user_id),
              full_name:
                user.full_name ||
                [user.firstname, user.lastname].filter(Boolean).join(' ') ||
                'Member',
              firstname: user.firstname ?? null,
              profile_photo: user.profile_photo ?? null,
            };
          })
          .filter((m) => Number.isFinite(m.id) && m.id > 0);
        setMentionResults(mapped);
      } catch {
        setMentionResults([]);
      } finally {
        setMentionLoading(false);
      }
    }, MENTION_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [mentionQuery, selectedCommunityId]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    const caret = e.target.selectionStart ?? value.length;
    const detected = extractMentionQuery(value, caret);
    if (detected) {
      mentionStartRef.current = detected.start;
      setMentionQuery(detected.query);
    } else {
      mentionStartRef.current = null;
      setMentionQuery(null);
    }
  };

  const insertMention = (member: MentionableMember) => {
    const start = mentionStartRef.current;
    const ta = textareaRef.current;
    if (start === null || !ta) return;
    const caret = ta.selectionStart ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(caret);
    const insertion = `@${member.full_name} `;
    const next = `${before}${insertion}${after}`;
    setText(next);
    setMentionedIds((prev) => new Set(prev).add(member.id));
    setMentionQuery(null);
    mentionStartRef.current = null;
    // Restore caret after the inserted mention.
    requestAnimationFrame(() => {
      const newCaret = before.length + insertion.length;
      try {
        ta.focus();
        ta.setSelectionRange(newCaret, newCaret);
      } catch {
        // ignore
      }
    });
  };

  const showMentionPopover = useMemo(
    () => mentionQuery !== null && (mentionLoading || mentionResults.length > 0),
    [mentionQuery, mentionLoading, mentionResults.length],
  );

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
              {userData?.profile_photo ? (
                <AvatarImage src={userData.profile_photo} alt="" />
              ) : null}
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
          <div className="relative space-y-1.5">
            <label htmlFor="post-body" className="sr-only">
              Post content
            </label>
            <textarea
              ref={textareaRef}
              id="post-body"
              placeholder={`What's on your mind, ${userData?.firstname || 'friend'}? Tip: use @ to mention members.`}
              value={text}
              onChange={handleTextChange}
              onKeyUp={(e) => {
                const target = e.target as HTMLTextAreaElement;
                const detected = extractMentionQuery(
                  target.value,
                  target.selectionStart ?? target.value.length,
                );
                if (detected) {
                  mentionStartRef.current = detected.start;
                  setMentionQuery(detected.query);
                } else if (mentionQuery !== null) {
                  mentionStartRef.current = null;
                  setMentionQuery(null);
                }
              }}
              aria-invalid={overLimit ? 'true' : undefined}
              className={cn(
                'custom-scrollbar w-full min-h-[160px] resize-none rounded-xl border border-border bg-muted/30 px-4 py-3',
                'text-base font-medium text-foreground placeholder:text-muted-foreground',
                'outline-none transition-colors hover:border-input focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30'
              )}
              autoFocus
            />
            {showMentionPopover && (
              <div
                role="listbox"
                aria-label="Mention members"
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-lg"
              >
                {mentionLoading && mentionResults.length === 0 ? (
                  <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    Searching members…
                  </div>
                ) : mentionResults.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
                ) : (
                  mentionResults.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onMouseDown={(e) => {
                        // Prevent textarea blur before insert.
                        e.preventDefault();
                        insertMention(member);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                    >
                      <Avatar className="size-7">
                        {member.profile_photo ? (
                          <AvatarImage src={member.profile_photo} alt="" />
                        ) : null}
                        <AvatarFallback className="bg-brand-soft text-[10px] font-bold text-accent-foreground">
                          {(member.firstname || member.full_name || 'M').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate font-medium text-foreground">
                        {member.full_name}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
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
                  disabled={
                    loading || uploadingMedia || uploadedMedia.length >= MAX_MEDIA_FILES
                  }
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingMedia ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ImageIcon className="size-4" aria-hidden="true" />
                  )}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    void handleMediaSelect(e);
                  }}
                />
              </div>
              <Badge
                variant={overLimit ? 'destructiveSoft' : 'soft'}
                size="sm"
                className="tabular-nums"
              >
                {text.length} / {MAX_LENGTH}
              </Badge>
            </div>

            {uploadedMedia.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {uploadedMedia.map((media, index) => (
                  <div
                    key={`${media.url}-${index}`}
                    className="relative overflow-hidden rounded-xl border border-border bg-muted/30"
                  >
                    <img
                      src={media.url}
                      alt={media.name}
                      className="h-32 w-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${media.name}`}
                      onClick={() => removeMediaFile(index)}
                      disabled={loading}
                      className="absolute right-1.5 top-1.5 size-7 rounded-full bg-background/80 hover:bg-background"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              type="button"
              size="xl"
              block
              loading={loading}
              disabled={
                (!text.trim() && uploadedMedia.length === 0) ||
                overLimit ||
                uploadingMedia ||
                !selectedCommunityId
              }
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
