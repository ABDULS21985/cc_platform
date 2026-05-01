'use client';

import { useState, useEffect, Suspense } from 'react';

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, DollarSign } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Image from 'next/image';
import { ApiService } from '@/services/api';
import toast from 'react-hot-toast';
import { toastAxiosError } from '@/hooks/useAxiosError';

function EditCommunityContent({ communityId }: { communityId: string | null }) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [enablePayment, setEnablePayment] = useState(false);
  const [memberCost, setMemberCost] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill form with existing community data
  useEffect(() => {
    if (!communityId) return;
    const fetchCommunity = async () => {
      try {
        const response = await ApiService.communities.get(Number(communityId));
        const c = response.data.data;
        setName(c.name);
        setDescription(c.description || '');
        setVisibility(c.visibility === 'private' ? 'private' : 'public');
        setStatus((c.status as 'active' | 'inactive') || 'active');
        const cost = parseFloat(c.member_cost || '0');
        if (cost > 0) {
          setEnablePayment(true);
          setMemberCost(String(cost));
        }
      } catch (error) {
        console.error('Error fetching community', error);
        toastAxiosError(error, "Failed to load community.");
      } finally {
        setLoading(false);
      }
    };
    fetchCommunity();
  }, [communityId]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Community name is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    if (enablePayment && (!memberCost || Number(memberCost) <= 0)) {
      newErrors.memberCost = 'Enter a valid membership fee';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveChanges = async () => {
    if (!communityId || !validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        visibility,
        member_cost: enablePayment ? Number(memberCost) : 0,
        status,
      };

      await ApiService.communities.update(Number(communityId), payload);
      toast.success('Community updated successfully!');
      router.push(`/dashboard/community/${communityId}`);
    } catch (error: any) {
      toastAxiosError(error, "Failed to update community.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!communityId) {
    return (
      <DashboardLayout pageTitle="Edit Community">
        <div className="text-center py-8">
          <p>No community ID provided</p>
          <Button onClick={() => router.push('/dashboard')} className="mt-4">
            Go to Dashboard
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout pageTitle="Edit Community">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle={`Edit ${name}`}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push(`/dashboard/community/${communityId}`)}
          className="flex items-center gap-2 text-[#525252] hover:text-[#000000] p-0 h-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Community
        </Button>

        {/* Cover / avatar placeholder */}
        <div className="rounded-lg h-48 bg-[#d9d9d9] relative flex items-center justify-center">
          <Image
            src="/images/upload2.svg"
            alt="Upload cover photo"
            width={40}
            height={40}
            className="w-10 h-10 object-cover"
          />
          <div className="absolute bottom-[-36px] left-8">
            <Image
              src="/images/upload.svg"
              alt="Upload avatar"
              width={72}
              height={72}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Save button row */}
        <div className="flex justify-end pt-8">
          <Button
            onClick={handleSaveChanges}
            disabled={isSubmitting}
            className="bg-[#0E9DA5] hover:bg-[#0C8D94] text-white px-6"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>

        {/* Basic info */}
        <div className="bg-white rounded-lg p-4 sm:p-6 space-y-5">
          {/* Name */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-[#000000]">Community name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`bg-gray-50 ${errors.name ? 'border-red-500' : ''}`}
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-[#000000]">Description</label>
            <textarea
              placeholder="Write a description for your community"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`flex w-full rounded-md border border-input bg-gray-50 px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[90px] resize-y ${
                errors.description ? 'border-red-500' : ''
              }`}
              disabled={isSubmitting}
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-lg p-4 sm:p-6 space-y-4">
          {/* Private toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#000000]">Private Community</p>
              <p className="text-xs text-[#525252]">Lock your community — only invited members can join</p>
            </div>
            <Switch
              checked={visibility === 'private'}
              onCheckedChange={(checked) => setVisibility(checked ? 'private' : 'public')}
              disabled={isSubmitting}
            />
          </div>

          {/* Status toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#000000]">Community Status</p>
              <p className="text-xs text-[#525252]">
                {status === 'active' ? 'Community is active and visible' : 'Community is inactive'}
              </p>
            </div>
            <Switch
              checked={status === 'active'}
              onCheckedChange={(checked) => setStatus(checked ? 'active' : 'inactive')}
              disabled={isSubmitting}
            />
          </div>

          {/* Membership fee */}
          <div className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3">
              <div>
                <p className="text-sm font-medium text-[#000000]">Membership Fee</p>
                <p className="text-xs text-[#525252]">Charge members to join</p>
              </div>
              <Switch
                checked={enablePayment}
                onCheckedChange={setEnablePayment}
                disabled={isSubmitting}
              />
            </div>

            {enablePayment && (
              <div className="px-3 pb-3 border-t bg-gray-50/50 pt-3">
                <label className="text-xs font-medium mb-1.5 block">Joining fee (₦)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000"
                    value={memberCost}
                    onChange={(e) => setMemberCost(e.target.value)}
                    className={`pl-8 ${errors.memberCost ? 'border-red-500' : ''}`}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.memberCost && <p className="text-xs text-red-500 mt-1">{errors.memberCost}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function EditCommunityPageContent() {
  const searchParams = useSearchParams();
  const communityId = searchParams.get('id');
  return <EditCommunityContent communityId={communityId} />;
}

function LoadingFallback() {
  return (
    <DashboardLayout pageTitle="Edit Community">
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
      </div>
    </DashboardLayout>
  );
}

export default function EditCommunityPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <EditCommunityPageContent />
    </Suspense>
  );
}
