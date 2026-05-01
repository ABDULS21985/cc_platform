'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function VerificationNotice() {
  const [verification, setVerification] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const storedVerification = localStorage.getItem('verification_data');
    if (storedVerification) {
      try {
        setVerification(JSON.parse(storedVerification));
      } catch (e) {
        console.error('Failed to parse verification data');
      }
    }
  }, []);

  if (!verification) return null;

  const { bvn_verified, nin_verified } = verification;

  // If both verified, don't show notice (or show success briefly?)
  if (bvn_verified && nin_verified) return null;

  return (
    <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 animate-fade-in">
      <div className="flex items-start gap-4">
        <div className="bg-red-100 p-2 rounded-lg">
          <ShieldAlert className="w-6 h-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Complete your verification
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            To enjoy full access to all features including higher transaction limits, please complete your identity verification.
          </p>
          
          <div className="flex flex-wrap gap-3">
            {!bvn_verified && (
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => router.push('/dashboard/settings?tab=verification')}
              >
                Verify BVN <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
            {!nin_verified && (
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => router.push('/dashboard/settings?tab=verification')}
              >
                Verify NIN <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
