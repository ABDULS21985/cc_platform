'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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

interface CreateSplitPaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateSplitPaymentDialog({
  isOpen,
  onClose,
}: CreateSplitPaymentDialogProps) {
  const [eventTitle, setEventTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [searchMembers, setSearchMembers] = useState('');
  const [splitEqually, setSplitEqually] = useState(false);
  const [memberAmounts, setMemberAmounts] = useState({
    'Abdulrahman ado': '',
    'Gimba Umar': '',
  });

  const handleCreate = () => {
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleMemberAmountChange = (memberName: string, value: string) => {
    setMemberAmounts((prev) => ({
      ...prev,
      [memberName]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-[#000000]">
            Create split payment
          </h2>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Event title
            </label>
            <Input
              placeholder="Enter event title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
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
              placeholder="Search members"
              value={searchMembers}
              onChange={(e) => setSearchMembers(e.target.value)}
              className="w-full rounded-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-[#000000] mb-1">
                Split equally
              </label>
              <p className="text-xs text-[#525252]">
                Share amount among your members
              </p>
            </div>
            <Switch checked={splitEqually} onCheckedChange={setSplitEqually} />
          </div>

          {!splitEqually && (
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(memberAmounts).map(([memberName, amount]) => (
                <div key={memberName}>
                  <label className="block text-sm font-medium text-[#000000] mb-2">
                    {memberName}
                  </label>
                  <Input
                    placeholder="Enter amount for this member"
                    value={amount}
                    onChange={(e) =>
                      handleMemberAmountChange(memberName, e.target.value)
                    }
                    className="w-full "
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleCreate}
              className="flex-1 bg-gray-300 text-[#000000] hover:bg-gray-400"
            >
              Create
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              className="flex-1 bg-gray-300 text-[#000000] hover:bg-gray-400 border-gray-300"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
