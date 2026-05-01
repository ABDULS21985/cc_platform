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

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: any) => void;
  title: string;
}

export function SplitPaymentModal({
  isOpen,
  onClose,
  onComplete,
  title,
}: SplitPaymentModalProps) {
  const [selectPayments, setSelectPayments] = useState('Sherifat Mobalaji');
  const [amount1, setAmount1] = useState('');
  const [amount2, setAmount2] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleCreateInstructions = () => {
    const formData = {
      title,
      selectPayments,
      amount1,
      amount2,
      startDate,
      endDate,
    };
    onComplete(formData);
  };

  const handleCancel = () => {
    onClose();
    // Reset form
    setSelectPayments('Sherifat Mobalaji');
    setAmount1('');
    setAmount2('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-lg font-bold text-[#000000]">
            Split payment
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Title
            </label>
            <Input
              type="text"
              value={title}
              readOnly
              className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 text-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Select payments
            </label>
            <Input
              type="text"
              value={selectPayments}
              onChange={(e) => setSelectPayments(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Amount
            </label>
            <Input
              type="text"
              placeholder="Enter amount"
              value={amount1}
              onChange={(e) => setAmount1(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Amount
            </label>
            <Input
              type="text"
              placeholder="Enter amount"
              value={amount2}
              onChange={(e) => setAmount2(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5] focus:outline-none"
            />
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
