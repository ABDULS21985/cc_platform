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

interface MakePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: () => void;
}

export function MakePaymentModal({
  isOpen,
  onClose,
  onSend,
}: MakePaymentModalProps) {
  const [selectedWallet, setSelectedWallet] = useState('Tech community');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const handleSend = () => {
    onSend();
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
        <h2 className="text-[1.2rem]  p-4 text-center font-bold text-[#000000]">
          Make payment
        </h2>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Select wallet
            </label>
            <Select value={selectedWallet} onValueChange={setSelectedWallet}>
              <SelectTrigger className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-lg">
                <SelectItem
                  value="Tech community"
                  className="cursor-pointer hover:bg-gray-50"
                >
                  Tech community
                </SelectItem>
                <SelectItem
                  value="Design community"
                  className="cursor-pointer hover:bg-gray-50"
                >
                  Design community
                </SelectItem>
                <SelectItem
                  value="Business community"
                  className="cursor-pointer hover:bg-gray-50"
                >
                  Business community
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Recipient
            </label>
            <Select value={recipient} onValueChange={setRecipient}>
              <SelectTrigger className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none">
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 rounded-lg">
                <SelectItem
                  value="user1"
                  className="cursor-pointer hover:bg-gray-50"
                >
                  John Doe
                </SelectItem>
                <SelectItem
                  value="user2"
                  className="cursor-pointer hover:bg-gray-50"
                >
                  Jane Smith
                </SelectItem>
                <SelectItem
                  value="user3"
                  className="cursor-pointer hover:bg-gray-50"
                >
                  Mike Johnson
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

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Note (Optional)
            </label>
            <Input
              type="text"
              placeholder="Write note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full h-9 rounded-full border border-gray-200 focus:border-[#4ab5ba] focus:ring-1 focus:ring-[#4ab5ba] focus:outline-none"
            />
          </div>
        </div>

        <div className="p-4  flex gap-3">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 bg-gray-300 text-[#000000] hover:bg-gray-400 border-gray-300"
          >
            Cancel
          </Button>
          <Button onClick={handleSend} className="flex-1  text-white">
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
