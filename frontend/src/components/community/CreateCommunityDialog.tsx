'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, DollarSign, Plus, Users, Lock, Globe, Building2, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ApiService, CreateCommunityPayload, OrganizationData } from '@/services/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CreateOrganizationDialog from '../dialogs/CreateOrganizationDialog';
import { toastAxiosError } from '@/hooks/useAxiosError';

interface CreateCommunityDialogProps {
  isOpen: boolean;
  toggleDialog: () => void;
  onSuccess?: () => void;
}

export function CreateCommunityDialog({
  isOpen,
  toggleDialog,
  onSuccess,
}: CreateCommunityDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [organizations, setOrganizations] = useState<OrganizationData[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [enablePayment, setEnablePayment] = useState(false);
  const [memberCost, setMemberCost] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);

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

  const loadOrganizations = async () => {
    setIsLoadingOrganizations(true);
    try {
      const res = await ApiService.organizations.list();
      setOrganizations(res.data.data.organizations);
    } catch (error: any) {
      toastAxiosError(error, "Failed to load organizations.");
    } finally {
      setIsLoadingOrganizations(false);
    }
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload: CreateCommunityPayload = {
        name: name.trim(),
        description: description.trim(),
        organization_id: Number(organizationId),
        visibility,
        member_cost: enablePayment ? Number(memberCost) : 0,
        interest_ids: [],
      };

      await ApiService.communities.create(payload);
      toast.success('Circle created successfully! 🎉');

      // Reset
      setName('');
      setDescription('');
      setOrganizationId('');
      setVisibility('public');
      setEnablePayment(false);
      setMemberCost('');
      setErrors({});

      onSuccess?.();
      toggleDialog();
    } catch (error: any) {
      toastAxiosError(error, "Failed to create community.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) toggleDialog();
  };

  useEffect(() => {
    if (isOpen && organizations.length === 0) loadOrganizations();
  }, [isOpen]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto p-0 rounded-3xl border-0 shadow-2xl gap-0">
          
          {/* Premium Header */}
          <div className="relative bg-gradient-to-br from-[#0E9DA5] to-[#043336] p-6 pb-8 rounded-t-3xl overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-8 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <button
                  onClick={toggleDialog}
                  className="w-9 h-9 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <DialogTitle className="text-2xl font-extrabold text-white tracking-tight mb-1">
                Create a Circle
              </DialogTitle>
              <p className="text-teal-100 text-sm font-medium">
                Build a community around your passion and invite people who share it.
              </p>
            </div>
          </div>

          {/* Form Body */}
          <div className="px-6 pt-6 pb-6 space-y-5 bg-white rounded-b-3xl">
            
            {/* Community Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-bold text-gray-700">
                Circle Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Lagos Tech Founders"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors(p => ({ ...p, name: '' }));
                }}
                className={`h-11 px-4 rounded-xl bg-gray-50 text-sm font-medium transition-all ${errors.name ? 'border-red-400 focus:ring-red-400' : 'border-gray-100 focus:border-[#0E9DA5] focus:ring-[#0E9DA5]'}`}
                disabled={isSubmitting}
              />
              {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name}</p>}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-bold text-gray-700">
                Description <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="description"
                placeholder="What is this circle about? What can members expect?"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors(p => ({ ...p, description: '' }));
                }}
                className={`flex w-full rounded-xl border bg-gray-50 px-4 py-3 text-sm font-medium placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-y transition-all ${errors.description ? 'border-red-400 focus-visible:ring-red-400' : 'border-gray-100 focus-visible:border-[#0E9DA5] focus-visible:ring-[#0E9DA5]'}`}
                disabled={isSubmitting}
              />
              {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description}</p>}
            </div>

            {/* Organization */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  Organization
                </Label>
                {!isLoadingOrganizations && organizations.length > 0 && (
                  <button
                    className="flex items-center gap-1 text-xs font-bold text-[#0E9DA5] hover:underline underline-offset-2"
                    disabled={isSubmitting}
                    onClick={() => setIsCreatingOrganization(true)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add new
                  </button>
                )}
              </div>

              {isLoadingOrganizations ? (
                <div className="flex items-center justify-center py-8 border border-gray-100 rounded-xl bg-gray-50">
                  <Loader2 className="h-5 w-5 animate-spin text-[#0E9DA5]" />
                  <span className="ml-2 text-xs text-gray-400 font-medium">Loading organizations...</span>
                </div>
              ) : organizations.length > 0 ? (
                <Select value={organizationId} onValueChange={setOrganizationId} disabled={isSubmitting}>
                  <SelectTrigger className="h-11 rounded-xl border-gray-100 bg-gray-50 text-sm font-medium focus:ring-[#0E9DA5] focus:border-[#0E9DA5]">
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border border-gray-100 shadow-elevated p-1">
                    {organizations.map((org) => (
                      <SelectItem
                        key={org.id}
                        value={org.id.toString()}
                        className="rounded-xl cursor-pointer hover:bg-teal-50 focus:bg-teal-50 font-medium py-2.5 text-sm"
                      >
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center bg-gray-50/50">
                  <Building2 className="w-8 h-8 text-gray-300" />
                  <div>
                    <p className="text-sm font-bold text-gray-500">No organizations yet</p>
                    <p className="text-xs text-gray-400">Create one to link this circle</p>
                  </div>
                  <button
                    onClick={() => setIsCreatingOrganization(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#0E9DA5] bg-teal-50 border border-teal-100 px-4 py-2 rounded-xl hover:bg-teal-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create organization
                  </button>
                </div>
              )}
            </div>

            {/* Visibility & Payment Settings */}
            <div className="space-y-3">
              {/* Visibility Toggle */}
              <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${visibility === 'private' ? 'border-[#0E9DA5]/30 bg-teal-50/50' : 'border-gray-100 bg-gray-50/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${visibility === 'private' ? 'bg-[#0E9DA5]/10' : 'bg-gray-100'}`}>
                    {visibility === 'private' 
                      ? <Lock className="w-4 h-4 text-[#0E9DA5]" /> 
                      : <Globe className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {visibility === 'private' ? 'Private Circle' : 'Public Circle'}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">
                      {visibility === 'private' ? 'Only invited members can join' : 'Anyone can discover and join'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={visibility === 'private'}
                  onCheckedChange={(checked) => setVisibility(checked ? 'private' : 'public')}
                  disabled={isSubmitting}
                />
              </div>

              {/* Membership Fee Toggle */}
              <div className={`rounded-2xl border overflow-hidden transition-all ${enablePayment ? 'border-[#0E9DA5]/30' : 'border-gray-100'}`}>
                <div className={`flex items-center justify-between p-4 transition-all ${enablePayment ? 'bg-teal-50/50' : 'bg-gray-50/50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${enablePayment ? 'bg-[#0E9DA5]/10' : 'bg-gray-100'}`}>
                      <DollarSign className={`w-4 h-4 ${enablePayment ? 'text-[#0E9DA5]' : 'text-gray-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Membership Fee</p>
                      <p className="text-xs text-gray-400 font-medium">Charge members to join</p>
                    </div>
                  </div>
                  <Switch
                    checked={enablePayment}
                    onCheckedChange={setEnablePayment}
                    disabled={isSubmitting}
                  />
                </div>

                {enablePayment && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#0E9DA5]/10 bg-white">
                    <Label htmlFor="memberCost" className="text-xs font-bold text-gray-600 mb-2 block">
                      Joining Fee (₦)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₦</span>
                      <Input
                        id="memberCost"
                        type="number"
                        min="0"
                        placeholder="e.g. 5000"
                        value={memberCost}
                        onChange={(e) => {
                          setMemberCost(e.target.value);
                          if (errors.memberCost) setErrors(p => ({ ...p, memberCost: '' }));
                        }}
                        className={`pl-8 h-11 rounded-xl bg-gray-50 text-sm font-medium ${errors.memberCost ? 'border-red-400 focus:ring-red-400' : 'border-gray-100 focus:border-[#0E9DA5] focus:ring-[#0E9DA5]'}`}
                        disabled={isSubmitting}
                      />
                    </div>
                    {errors.memberCost && <p className="text-xs text-red-500 font-medium mt-1">{errors.memberCost}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={toggleDialog}
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-2xl border-gray-200 font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={isSubmitting}
                className="flex-1 h-12 rounded-2xl bg-[#0E9DA5] hover:bg-[#0a7a80] text-white font-bold shadow-glow hover:shadow-lg transition-all"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Create Circle
                  </span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateOrganizationDialog
        isOpen={isCreatingOrganization}
        toggleDialog={() => setIsCreatingOrganization(!isCreatingOrganization)}
        onSuccess={loadOrganizations}
      />
    </>
  );
}
