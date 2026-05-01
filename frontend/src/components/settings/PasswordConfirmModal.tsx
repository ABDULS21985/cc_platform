'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface PasswordConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (password: string) => void;
  title: string;
}

export function PasswordConfirmModal({
  isOpen,
  onClose,
  onNext,
  title,
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('');

  const handleConfirm = () => {
    onNext(password);
  };

  const handleCancel = () => {
    onClose();
    setPassword('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 bg-white rounded-lg w-full max-w-md overflow-hidden">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="text-lg font-bold text-[#000000]">
            Please enter password to confirm and save standing instructions
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Title
            </label>
            <Input
              type="text"
              value={title}
              readOnly
              className="w-full h-10 rounded-lg border border-gray-200 bg-gray-50 text-gray-600"
            />
          </div> */}

          <div>
            <label className="block text-sm font-medium text-[#000000] mb-2">
              Password
            </label>
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 rounded-lg border border-gray-200 focus:border-[#0E9DA5] focus:ring-1 focus:ring-[#0E9DA5] focus:outline-none"
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
            onClick={handleConfirm}
            className="flex-1 bg-[#0E9DA5] hover:bg-[#0d8a91] text-white"
          >
            Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
