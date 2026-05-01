'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useInView } from '@/hooks/useInView';

export default function DescribeYourself() {
  const [bio, setBio] = useState('');
  const router = useRouter();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const handleSkip = () => {
    router.push('/interests');
  };

  return (
   <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f8fafc] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[20%] w-[500px] h-[500px] rounded-full bg-gradient-to-b from-[#0E9DA5]/5 to-transparent blur-3xl opacity-60" />
      </div>

      <div 
        ref={ref}
        className={`w-full max-w-[500px] z-10 transition-all duration-700 ${isInView ? 'animate-scale-in opacity-100' : 'opacity-0 translate-y-4'}`}
      >
        <div className="glass-card p-6 sm:p-8 rounded-2xl shadow-elevated border border-white/50 backdrop-blur-xl">
           {/* Header */}
          <div className="mb-6">
            <button 
              onClick={() => router.back()}
              className="inline-flex items-center text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full p-2 mb-4 hover:bg-gray-50 smooth-transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Describe yourself
            </h1>
            <p className="text-gray-500 text-sm">
              Write a short description so people can get to know you better.
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 ml-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="I'm a software engineer who loves hiking..."
                rows={6}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0E9DA5]/20 focus:border-[#0E9DA5] placeholder-gray-400 text-sm resize-none shadow-sm transition-all"
              />
              <p className="text-xs text-gray-400 text-right">
                {bio.length} characters
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                onClick={handleSkip}
                className="btn-primary w-full py-6 text-base font-semibold shadow-soft hover-glow"
              >
                Continue
              </Button>

              <button
                onClick={handleSkip}
                className="text-gray-500 text-sm font-medium hover:text-gray-800 py-2 smooth-transition"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
