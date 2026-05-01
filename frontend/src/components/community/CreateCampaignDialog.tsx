'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, X } from 'lucide-react';

interface CreateCampaignDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCampaignDialog({
  isOpen,
  onClose,
}: CreateCampaignDialogProps) {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState('');
  const [splitEqually, setSplitEqually] = useState(true);

  const handleCreate = () => {
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showClose={false} className="p-0 bg-white/95 backdrop-blur-2xl rounded-[32px] w-full max-w-md overflow-hidden border-white/20 shadow-elevated animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-50/50">
          <DialogTitle className="text-xl font-extrabold text-gray-900 tracking-tight">Create campaign</DialogTitle>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Title
            </label>
            <Input
              placeholder="Enter your campaign title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#000000] mb-2">
                Amount
              </label>
              <Input
                placeholder="Enter event location"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#000000] mb-2">
                End date
              </label>
              <Select value={endDate} onValueChange={setEndDate}>
                <SelectTrigger className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba]">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-md">
                  <SelectItem
                    value="2024-12-31"
                    className="text-sm cursor-pointer hover:bg-gray-50"
                  >
                    December 31, 2024
                  </SelectItem>
                  <SelectItem
                    value="2025-01-15"
                    className="text-sm cursor-pointer hover:bg-gray-50"
                  >
                    January 15, 2025
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Description
            </label>
            <Input
              placeholder="Enter a short description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Select members
            </label>
            <Input
              placeholder="Enter members names"
              value={selectedMembers}
              onChange={(e) => setSelectedMembers(e.target.value)}
              className="w-full rounded-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-[#000000] mb-1">
                Split equally
              </label>
              <p className="text-xs text-[#525252]">Share among your team</p>
            </div>
            <Switch checked={splitEqually} onCheckedChange={setSplitEqually} />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="flex-1 h-12 rounded-2xl text-gray-500 font-bold hover:bg-gray-50 transition-all"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="flex-1 h-12 rounded-2xl bg-[#0E9DA5] hover:bg-[#0a7a80] text-white font-bold shadow-glow hover:shadow-lg transition-all"
            >
              Create Campaign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
