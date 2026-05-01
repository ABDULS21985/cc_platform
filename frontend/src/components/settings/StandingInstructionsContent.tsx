'use client';

import { useState } from 'react';
import { AddInstructionsModal } from './AddInstructionsModal';
import { PasswordConfirmModal } from './PasswordConfirmModal';
import { SplitPaymentModal } from './SplitPaymentModal';

export function StandingInstructionsContent() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [currentTitle, setCurrentTitle] = useState('');

  const handleAddClick = () => {
    setIsAddModalOpen(true);
  };

  const handleAddModalNext = (data: any) => {
    setCurrentTitle(data.title);
    setIsAddModalOpen(false);
    setIsPasswordModalOpen(true);
  };

  const handlePasswordModalNext = (password: string) => {
    setIsPasswordModalOpen(false);
    setIsSplitModalOpen(true);
  };

  const handleSplitModalComplete = (data: any) => {
    setIsSplitModalOpen(false);
    // Handle completion logic here
    console.log('Standing instruction created:', data);
  };

  const handleCloseAllModals = () => {
    setIsAddModalOpen(false);
    setIsPasswordModalOpen(false);
    setIsSplitModalOpen(false);
    setCurrentTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div></div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#0E9DA5] text-white rounded-full hover:bg-[#0d8a91] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add
        </button>
      </div>

      {/* Standing Instructions Cards */}
      <div className="space-y-4">
        {/* Standing Instruction Card 1 */}
        <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-[#000000]">Yalleman</h3>
              <p className="text-sm text-[#525252]">Standing Instruction</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-[#000000]">N120</p>
            <p className="text-sm text-[#525252]">/Monthly</p>
          </div>
        </div>

        {/* Standing Instruction Card 2 */}
        <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-[#000000]">Yalleman</h3>
              <p className="text-sm text-[#525252]">Standing Instruction</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-[#000000]">N120</p>
            <p className="text-sm text-[#525252]">/Monthly</p>
          </div>
        </div>

        {/* Standing Instruction Card 3 */}
        <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-[#000000]">Yalleman</h3>
              <p className="text-sm text-[#525252]">Standing Instruction</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium text-[#000000]">N120</p>
            <p className="text-sm text-[#525252]">/Monthly</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AddInstructionsModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAllModals}
        onNext={handleAddModalNext}
      />

      <PasswordConfirmModal
        isOpen={isPasswordModalOpen}
        onClose={handleCloseAllModals}
        onNext={handlePasswordModalNext}
        title={currentTitle}
      />

      <SplitPaymentModal
        isOpen={isSplitModalOpen}
        onClose={handleCloseAllModals}
        onComplete={handleSplitModalComplete}
        title={currentTitle}
      />
    </div>
  );
}
