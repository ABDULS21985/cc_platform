'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AddInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (data: any) => void;
}

export function AddInstructionsModal({
  isOpen,
  onClose,
  onNext,
}: AddInstructionsModalProps) {
  const [title, setTitle] = useState('Sherifat Mobalaji');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleCreateInstructions = () => {
    const formData = {
      title,
      amount,
      frequency,
      startDate,
      endDate,
    };
    onNext(formData);
  };

  const handleCancel = () => {
    onClose();
    // Reset form
    setTitle('Sherifat Mobalaji');
    setAmount('');
    setFrequency('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-lg font-bold text-[#000000]">
            Add instructions
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Title - Full Width */}
          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Title
            </label>
            <Input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5] focus:outline-none"
            />
          </div>

          {/* Two Column Layout for remaining fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#000000] mb-2">
                Amount
              </label>
              <Input
                type="text"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#000000] mb-2">
                Frequency
              </label>
              <Input
                type="text"
                placeholder="Frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#000000] mb-2">
                Start date
              </label>
              <Select value={startDate} onValueChange={setStartDate}>
                <SelectTrigger className="w-full h-10 rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5] focus:outline-none">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg">
                  <SelectItem
                    value="today"
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    Today
                  </SelectItem>
                  <SelectItem
                    value="tomorrow"
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    Tomorrow
                  </SelectItem>
                  <SelectItem
                    value="next-week"
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    Next Week
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#000000] mb-2">
                End date
              </label>
              <Select value={endDate} onValueChange={setEndDate}>
                <SelectTrigger className="w-full h-10 rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5] focus:outline-none">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 rounded-lg">
                  <SelectItem
                    value="1-month"
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    1 Month
                  </SelectItem>
                  <SelectItem
                    value="3-months"
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    3 Months
                  </SelectItem>
                  <SelectItem
                    value="6-months"
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    6 Months
                  </SelectItem>
                  <SelectItem
                    value="1-year"
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    1 Year
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="p-4 flex gap-3">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateInstructions}
            className="flex-1 bg-[#0E9DA5] hover:bg-[#0d8a91] text-white"
          >
            Create instructions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
