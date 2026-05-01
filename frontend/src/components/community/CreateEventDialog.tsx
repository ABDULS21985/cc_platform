'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Image, X } from 'lucide-react';

interface CreateEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: EventFormData) => void;
}

interface EventFormData {
  title: string;
  description: string;
  location: string;
  fee: string;
  autoApproveMembers: boolean;
  isPrivate: boolean;
  banner?: File;
}

export function CreateEventDialog({
  isOpen,
  onClose,
  onSubmit,
}: CreateEventDialogProps) {
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    description: '',
    location: '',
    fee: '',
    autoApproveMembers: false,
    isPrivate: true,
  });

  const [bannerFile, setBannerFile] = useState<File | null>(null);

  const handleInputChange = (
    field: keyof EventFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleBannerUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setBannerFile(file);
      setFormData((prev) => ({
        ...prev,
        banner: file,
      }));
    }
  };

  const handleSubmit = () => {
    if (formData.title && formData.description && formData.location) {
      onSubmit({
        ...formData,
        banner: bannerFile || undefined,
      });
      onClose();
      // Reset form
      setFormData({
        title: '',
        description: '',
        location: '',
        fee: '',
        autoApproveMembers: false,
        isPrivate: true,
      });
      setBannerFile(null);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setFormData({
      title: '',
      description: '',
      location: '',
      fee: '',
      autoApproveMembers: false,
      isPrivate: true,
    });
    setBannerFile(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        showClose={false}
        className="p-0 bg-white/95 backdrop-blur-2xl rounded-[32px] w-full max-w-md max-h-[85vh] sm:max-h-[80vh] overflow-hidden flex flex-col border-white/20 shadow-elevated animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-50/50">
          <DialogTitle className="text-xl font-extrabold text-gray-900 tracking-tight">Create event</DialogTitle>
          <button onClick={handleClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Event Title */}
          <div>
            <label className="block text-sm font-medium text-[#959595] mb-2">
              Event title
            </label>
            <Input
              placeholder="Enter event title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full rounded-lg border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#959595] mb-2">
              Description
            </label>
            <Input
              placeholder="Enter a short description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full rounded-lg border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5]"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-[#959595] mb-2">
              Location
            </label>
            <Input
              placeholder="Enter event location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full rounded-lg border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5]"
            />
          </div>

          {/* Fee */}
          <div>
            <label className="block text-sm font-medium text-[#959595] mb-2">
              Fee
            </label>
            <Input
              placeholder="Enter joining fee"
              value={formData.fee}
              onChange={(e) => handleInputChange('fee', e.target.value)}
              className="w-full rounded-lg border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5]"
              type="number"
            />
          </div>

          {/* Membership Settings */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-[#000000]">
                Membership settings
              </label>
              <p className="text-xs text-[#959595]">Auto approve members</p>
            </div>
            <Switch
              checked={formData.autoApproveMembers}
              onCheckedChange={(checked) =>
                handleInputChange('autoApproveMembers', checked)
              }
              className="data-[state=checked]:bg-[#0E9DA5]"
            />
          </div>

          {/* Make Group Private */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-[#000000]">
                Make group private
              </label>
              <p className="text-xs text-[#959595]">
                Lock group to become private
              </p>
            </div>
            <Switch
              checked={formData.isPrivate}
              onCheckedChange={(checked) =>
                handleInputChange('isPrivate', checked)
              }
              className="data-[state=checked]:bg-[#0E9DA5]"
            />
          </div>

          {/* Banner Upload */}
          <div>
            <label className="block text-sm font-medium text-[#959595] mb-2">
              Banner
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#0E9DA5] transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
                id="banner-upload"
              />
              <label htmlFor="banner-upload" className="cursor-pointer">
                <Image className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-[#959595]">
                  Click here to upload banner
                </p>
                {bannerFile && (
                  <p className="text-xs text-[#0E9DA5] mt-1">
                    {bannerFile.name}
                  </p>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 flex gap-3 flex-shrink-0 border-t border-gray-100">
          <Button
            onClick={handleClose}
            variant="ghost"
            className="flex-1 h-12 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 h-12 rounded-2xl bg-[#0E9DA5] hover:bg-[#0a7a80] text-white font-bold shadow-glow hover:shadow-lg transition-all"
          >
            Create Event
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
