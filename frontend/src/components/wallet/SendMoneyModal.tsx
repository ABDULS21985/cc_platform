'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SendMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (amount: string, recipient: string) => void;
}

export function SendMoneyModal({
  isOpen,
  onClose,
  onSend,
}: SendMoneyModalProps) {
  const [account, setAccount] = useState('');
  const [bank, setBank] = useState('');
  const [amount, setAmount] = useState('');

  const handleSend = () => {
    if (account && bank && amount) {
      onSend(amount, account);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showClose={false}
        className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden"
      >
        <h2 className="text-[1.2rem] p-4 text-center font-bold text-[#000000]">
          Withdraw funds
        </h2>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Account
            </label>
            <Input
              type="text"
              placeholder="Enter account number"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Select bank
            </label>
            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none">
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-lg">
                <SelectItem
                  value="gtb"
                  className="cursor-pointer hover:bg-gray-50"
                >
                  GTB Bank
                </SelectItem>
                <SelectItem
                  value="zenith"
                  className="cursor-pointer hover:bg-gray-50"
                >
                  Zenith Bank
                </SelectItem>
                <SelectItem
                  value="access"
                  className="cursor-pointer hover:bg-gray-50"
                >
                  Access Bank
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Amount (N)
            </label>
            <Input
              type="text"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none"
            />
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
            onClick={handleSend}
            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
          >
            Make payment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
