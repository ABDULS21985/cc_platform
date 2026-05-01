'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { ApiService } from '@/services/api';
import toast from 'react-hot-toast';
import { toastAxiosError } from '@/hooks/useAxiosError';

export default function EnterBVN() {
  const [bvn, setBvn] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleContinue = async () => {
    if (bvn.length !== 11) {
        toast.error('Please enter a valid 11-digit BVN');
        return;
    }
    if (!dateOfBirth) {
        toast.error('Please enter your Date of Birth');
        return;
    }

    setIsLoading(true);
    try {
        const response = await ApiService.verification.verifyBvn({
            bvn,
            date_of_birth: dateOfBirth
        });
        
        // response.data is VerificationResponse
        const apiResponse = response.data;
        const verificationData = apiResponse.data;

        if (apiResponse.success && verificationData) {
             if (verificationData.status === 'verified' || verificationData.status === 'success') {
                 toast.success('Verification Successful');
                 router.push('/verification-success');
             } else if (verificationData.task_id) {
                 // Async processing
                 router.push(`/verifying?taskId=${verificationData.task_id}`);
             } else {
                 toast.success('Verification request submitted');
                 router.push('/verification-success');
             }
        } else {
             toastAxiosError(apiResponse.message, 'Verification failed');
        }

    } catch (error: any) {
        console.error('BVN Verification Error:', error);
        toastAxiosError(error, 'BVN Verification failed. Please check your details and try again.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-[#f8fafc] relative overflow-hidden">
        {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
         <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-50" />
         <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-[440px] z-10 glass-card p-6 sm:p-8 rounded-2xl shadow-elevated border border-white/50 backdrop-blur-xl animate-scale-in">
        <div className="w-full mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button 
              onClick={() => router.back()}
              className="inline-flex items-center text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full p-2 mb-4 hover:bg-gray-50 smooth-transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Enter your BVN
            </h1>
            <p className="text-gray-500 text-sm">
               You can find your BVN by dialing <span className="font-mono bg-gray-100 px-1 rounded">*565*0#</span> on your phone.
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                BVN
              </label>
              <Input
                type="text"
                placeholder="Enter your 11-digit BVN"
                value={bvn}
                onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, ''); // Only numbers
                    if (val.length <= 11) setBvn(val);
                }}
                className="input-modern w-full tracking-widest"
                maxLength={11}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="input-modern w-full pl-10"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 ml-1">This must match the DOB on your BVN record.</p>
            </div>

            <Button
              onClick={handleContinue}
              disabled={isLoading}
              className="btn-primary w-full py-6 text-base font-semibold shadow-soft hover-glow"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
                </span>
                ) : 'Verify Identity'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
