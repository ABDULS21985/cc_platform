"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Link as LinkIcon, Loader2 } from "lucide-react";
import { ApiService } from "@/services/api";
import { toast } from 'sonner';
import { toastAxiosError } from "@/hooks/useAxiosError";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: number;
}

export function InviteDialog({
  open,
  onOpenChange,
  communityId,
}: InviteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateInvite = async () => {
    setLoading(true);
    try {
      const response = await ApiService.communities.createInvite(communityId);
      if (response.data.success) {
        setInviteCode(response.data.data.invite_code);
      } else {
        toast.error("Failed to generate invite");
      }
    } catch (error) {
      toastAxiosError(error, "Failed to generate invite link.");
    } finally {
      setLoading(false);
    }
  };

  const inviteUrl = inviteCode
    ? `${window.location.origin}/join/${inviteCode}`
    : "";

  const copyToClipboard = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite People</DialogTitle>
          <DialogDescription>
            Generate a unique invite link for others to join your community.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!inviteCode ? (
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-100 rounded-lg bg-gray-50/50">
              <LinkIcon className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-4 text-center">
                Create a link to share with others.
              </p>
              <Button
                onClick={generateInvite}
                disabled={loading}
                className="bg-[#0E9DA5] hover:bg-[#0C8D94]"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Invite Link
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="link" className="text-sm font-semibold">
                  Invite Link
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="link"
                    value={inviteUrl}
                    readOnly
                    className="flex-1 text-xs"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={copyToClipboard}
                    className="h-9 w-9 bg-teal-600 hover:bg-teal-700"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                This link will allow anyone with it to join the community. You
                can revoke it later in settings.
              </p>
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={generateInvite}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating link...
                  </>
                ) : (
                  "Generate new link"
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
