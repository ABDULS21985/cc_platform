'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function VerifyIdentity() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/bvn-verification');
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-[#f8fafc] relative overflow-hidden">
        {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
         <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-50" />
         <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-50" />
      </div>

      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
        <Image
          src="/images/main-logo.svg"
          alt="Community Circle"
          width={40}
          height={40}
          className="w-10 h-10"
        />
      </div>
      <div className="w-full max-w-[440px] z-10 glass-card p-6 sm:p-8 rounded-2xl shadow-elevated border border-white/50 backdrop-blur-xl animate-scale-in">
        <div className="w-full mx-auto">
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Verify your Identity
            </h1>
            <p className="text-gray-500 text-sm">
              To own a wallet you are required to verify your identity in compliance with the CBN
            </p>
          </div>

          <div className="mb-8 flex justify-center">
            <div className="relative w-32 h-32 bg-teal-50 rounded-full flex items-center justify-center animate-pulse-slow">
              <span className="text-4xl">🆔</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
                onClick={handleStart}
                className="btn-primary w-full py-6 text-base font-semibold shadow-soft hover-glow"
            >
              Start verification
            </Button>

            <Button
              onClick={handleSkip}
              className="w-full bg-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-900 py-6 text-sm font-medium transition-colors border-none shadow-none"
            >
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
