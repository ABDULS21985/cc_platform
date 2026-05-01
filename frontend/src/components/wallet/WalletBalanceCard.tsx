'use client';

import { useState, useEffect } from 'react';
import { ApiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { MakePaymentModal } from './MakePaymentModal';
import { AccountDetailsModal } from './AccountDetailsModal';
import { SendMoneyModal } from './SendMoneyModal';
import { WithdrawMoneyModal } from './WithdrawMoneyModal';
import { TransactionPinModal } from './TransactionPinModal';
import { SuccessModal } from './SuccessModal';
import { toastAxiosError } from '@/hooks/useAxiosError';

export default function WalletBalanceCard() {
  const [balance, setBalance] = useState<string>('0.00');
  const [loading, setLoading] = useState(true);
  
  const [isMakePaymentOpen, setIsMakePaymentOpen] = useState(false);
  const [isAccountDetailsOpen, setIsAccountDetailsOpen] = useState(false);
  const [isSendMoneyOpen, setIsSendMoneyOpen] = useState(false);
  const [isWithdrawMoneyOpen, setIsWithdrawMoneyOpen] = useState(false);
  const [isSendPinOpen, setIsSendPinOpen] = useState(false);
  const [isWithdrawPinOpen, setIsWithdrawPinOpen] = useState(false);
  const [isSendSuccessOpen, setIsSendSuccessOpen] = useState(false);
  const [isWithdrawSuccessOpen, setIsWithdrawSuccessOpen] = useState(false);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  useEffect(() => {
    const fetchWallet = async () => {
        try {
            const response = await ApiService.wallet.getSummary();
            // response.data is WalletSummaryResponse, response.data.data is WalletSummaryData
            if (response.data.data.wallet) {
                setBalance(response.data.data.wallet.balance);
            }
        } catch (error) {
            console.error('Failed to fetch wallet', error);
            toastAxiosError(error, "Failed to load wallet balance.");
        } finally {
            setLoading(false);
        }
    };
    fetchWallet();
  }, []);

  const handleTopUp = () => {
    setIsMakePaymentOpen(true);
  };

  const handleMakePaymentClose = () => {
    setIsMakePaymentOpen(false);
  };

  const handleMakePaymentSend = () => {
    setIsMakePaymentOpen(false);
    setIsAccountDetailsOpen(true);
  };

  const handleAccountDetailsClose = () => {
    setIsAccountDetailsOpen(false);
  };

  const handleSendMoneyClose = () => {
    setIsSendMoneyOpen(false);
  };

  const handleWithdrawMoneyClose = () => {
    setIsWithdrawMoneyOpen(false);
  };

  // Send Money Flow
  const handleSendMoneySubmit = (amount: string, recipient: string) => {
    setTransactionAmount(amount);
    setRecipientName(recipient);
    setIsSendMoneyOpen(false);
    setIsSendPinOpen(true);
  };

  const handleSendPinClose = () => {
    setIsSendPinOpen(false);
  };

  const handleSendPinConfirm = () => {
    setIsSendPinOpen(false);
    setIsSendSuccessOpen(true);
  };

  const handleSendSuccessClose = () => {
    setIsSendSuccessOpen(false);
  };

  // Withdraw Money Flow
  const handleWithdrawMoneySubmit = (amount: string) => {
    setTransactionAmount(amount);
    setIsWithdrawMoneyOpen(false);
    setIsWithdrawPinOpen(true);
  };

  const handleWithdrawPinClose = () => {
    setIsWithdrawPinOpen(false);
  };

  const handleWithdrawPinConfirm = () => {
    setIsWithdrawPinOpen(false);
    setIsWithdrawSuccessOpen(true);
  };

  const handleWithdrawSuccessClose = () => {
    setIsWithdrawSuccessOpen(false);
  };

  return (
    <>
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0E9DA5] to-[#043336] rounded-[32px] p-8 text-white shadow-elevated border border-white/10 group">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/10 transition-colors duration-700" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

        <div className="relative z-10 space-y-8">
          {/* Header with title and Eye Icon */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10 w-fit">
              <span className="text-[10px] font-black uppercase tracking-widest text-teal-100">Active Balance</span>
              <button
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                className="text-white/60 hover:text-white transition-colors"
              >
                {isBalanceVisible ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
               <span className="font-black text-xs">NGN</span>
            </div>
          </div>

          {/* Balance Amount */}
          <div className="space-y-1">
            {loading ? (
               <div className="h-12 w-48 bg-white/10 animate-pulse rounded-2xl"></div>
            ) : (
               <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-teal-200/80">₦</span>
                  <h2 className="text-5xl font-black tracking-tighter">
                    {isBalanceVisible ? Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '••••••'}
                  </h2>
               </div>
            )}
            <p className="text-xs font-medium text-teal-100/60">Total available funds</p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleTopUp}
              className="flex-1 bg-white text-[#043336] hover:bg-teal-50 rounded-2xl h-12 font-extrabold text-sm shadow-lg transition-all active:scale-95"
            >
              Fund
            </Button>
            <Button
              onClick={() => setIsSendMoneyOpen(true)}
              className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white rounded-2xl h-12 font-extrabold text-sm transition-all active:scale-95"
            >
              Send
            </Button>
            <Button
              onClick={() => setIsWithdrawMoneyOpen(true)}
              className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 text-white rounded-2xl h-12 font-extrabold text-sm transition-all active:scale-95"
            >
              Withdraw
            </Button>
          </div>
        </div>
      </div>

      {/* Make Payment Modal */}
      <MakePaymentModal
        isOpen={isMakePaymentOpen}
        onClose={handleMakePaymentClose}
        onSend={handleMakePaymentSend}
      />

      {/* Account Details Modal */}
      <AccountDetailsModal
        isOpen={isAccountDetailsOpen}
        onClose={handleAccountDetailsClose}
      />

      {/* Send Money Modal */}
      <SendMoneyModal
        isOpen={isSendMoneyOpen}
        onClose={handleSendMoneyClose}
        onSend={handleSendMoneySubmit}
      />

      {/* Withdraw Money Modal */}
      <WithdrawMoneyModal
        isOpen={isWithdrawMoneyOpen}
        onClose={handleWithdrawMoneyClose}
        onConfirm={handleWithdrawMoneySubmit}
      />

      {/* Transaction Pin Modals */}
      <TransactionPinModal
        isOpen={isSendPinOpen}
        onClose={handleSendPinClose}
        onConfirm={handleSendPinConfirm}
        title="Confirm transfer"
        confirmButtonText="Send"
      />

      <TransactionPinModal
        isOpen={isWithdrawPinOpen}
        onClose={handleWithdrawPinClose}
        onConfirm={handleWithdrawPinConfirm}
        title="Withdraw funds"
        confirmButtonText="Withdraw"
      />

      {/* Success Modals */}
      <SuccessModal
        isOpen={isSendSuccessOpen}
        onClose={handleSendSuccessClose}
        amount={`₦${transactionAmount}`}
        message={`You have successfully sent ${transactionAmount} to ${recipientName}`}
        isWithdrawal={false}
      />

      <SuccessModal
        isOpen={isWithdrawSuccessOpen}
        onClose={handleWithdrawSuccessClose}
        amount={`₦${transactionAmount}`}
        message="Your withdrawal has been completed"
        isWithdrawal={true}
      />
    </>
  );
}
