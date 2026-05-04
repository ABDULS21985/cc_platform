'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiService } from '@/services/api';
import { toast } from 'sonner';
import { CheckCircle2, ShieldAlert, Loader2 } from 'lucide-react';
import { toastAxiosError } from '@/hooks/useAxiosError';

export function VerificationContent() {
  const [verificationData, setVerificationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // BVN Form State
  const [bvn, setBvn] = useState('');
  const [dobBvn, setDobBvn] = useState('');
  const [verifyingBvn, setVerifyingBvn] = useState(false);

  // NIN Form State
  const [nin, setNin] = useState('');
  const [dobNin, setDobNin] = useState('');
  const [verifyingNin, setVerifyingNin] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
      try {
          const res = await ApiService.verification.getStatus();
          // res.data is VerificationStatus
          if (res.data.success && res.data.data) {
              const statusData = res.data.data;
              // Map API status to the shape expected by UI
              const updated = {
                  bvn_verified: statusData.verification_type === 'bvn' && statusData.verified,
                  nin_verified: statusData.verification_type === 'nin' && statusData.verified,
                  status: statusData.status
              };
              setVerificationData(updated);
              localStorage.setItem('verification_data', JSON.stringify(updated));
          }
      } catch (error) {
          console.error('Failed to load verification status', error);
      } finally {
          setLoading(false);
      }
  };

  const verifyBvn = async () => {
    if (!bvn || !dobBvn) {
        toast.error('Please enter BVN and Date of Birth');
        return;
    }
    setVerifyingBvn(true);
    try {
        const response = await ApiService.verification.verifyBvn({ bvn, date_of_birth: dobBvn });
        const apiResponse = response.data;
        
        if (apiResponse.success && apiResponse.data) {
            if (apiResponse.data.task_id) {
                toast.success('Verification started...');
                // In settings, we might want to poll in place or redirect
                // For now, let's redirect to the verifying page like auth flow
                window.location.href = `/verifying?taskId=${apiResponse.data.task_id}&returnUrl=/dashboard/settings`;
            } else if (apiResponse.data.status === 'verified' || apiResponse.data.status === 'success') {
                toast.success('BVN Verified Successfully');
                loadStatus();
            }
        }
    } catch (error: any) {
        console.error(error);
        toastAxiosError(error, 'BVN Verification Failed. Please check your details and try again.');
    } finally {
        setVerifyingBvn(false);
    }
  };

  const verifyNin = async () => {
    if (!nin || !dobNin) {
        toast.error('Please enter NIN and Date of Birth');
        return;
    }
    setVerifyingNin(true);
    try {
        const response = await ApiService.verification.verifyNin({ nin, date_of_birth: dobNin });
        const apiResponse = response.data;

        if (apiResponse.success && apiResponse.data) {
            if (apiResponse.data.task_id) {
                toast.success('Verification started...');
                window.location.href = `/verifying?taskId=${apiResponse.data.task_id}&returnUrl=/dashboard/settings`;
            } else if (apiResponse.data.status === 'verified' || apiResponse.data.status === 'success') {
                toast.success('NIN Verified Successfully');
                loadStatus();
            }
        }
    } catch (error: any) {
        toastAxiosError(error, 'NIN Verification Failed. Please check your details and try again.');
    } finally {
        setVerifyingNin(false);
    }
  };

  if (loading && !verificationData) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8 animate-fade-in">
        <div>
            <h3 className="text-lg font-semibold mb-2">Identity Verification</h3>
            <p className="text-gray-500 text-sm">Verify your identity to increase limits and access full features.</p>
        </div>

        {/* BVN Section */}
        <div className="border rounded-xl p-6 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-50 p-2 rounded-lg">
                        <span className="font-bold text-blue-600">BVN</span>
                    </div>
                    <div>
                        <h4 className="font-medium">Bank Verification Number</h4>
                        <p className="text-xs text-gray-500">Link your BVN to verify your account</p>
                    </div>
                </div>
                {verificationData?.bvn_verified ? (
                     <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-medium">
                         <CheckCircle2 className="w-4 h-4" /> Verified
                     </span>
                ) : (
                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-medium">
                        <ShieldAlert className="w-4 h-4" /> Unverified
                    </span>
                )}
            </div>

            {!verificationData?.bvn_verified && (
                <div className="space-y-4 max-w-md mt-6">
                    <div className="space-y-2">
                        <Label>BVN Number</Label>
                        <Input 
                            placeholder="12345678901" 
                            value={bvn}
                            onChange={(e) => setBvn(e.target.value)}
                            maxLength={11}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input 
                            type="date" 
                            value={dobBvn}
                            onChange={(e) => setDobBvn(e.target.value)}
                        />
                    </div>
                    <Button 
                        onClick={verifyBvn} 
                        disabled={verifyingBvn}
                        className="w-full bg-[#0E9DA5] hover:bg-[#0b7d84]"
                    >
                        {verifyingBvn ? <Loader2 className="animate-spin" /> : 'Verify BVN'}
                    </Button>
                </div>
            )}
        </div>

        {/* NIN Section */}
        <div className="border rounded-xl p-6 bg-white shadow-sm">
             <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="bg-green-50 p-2 rounded-lg">
                        <span className="font-bold text-green-600">NIN</span>
                    </div>
                    <div>
                        <h4 className="font-medium">National Identity Number</h4>
                        <p className="text-xs text-gray-500">Link your NIN for advanced verification</p>
                    </div>
                </div>
                {verificationData?.nin_verified ? (
                     <span className="flex items-center gap-1 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-medium">
                         <CheckCircle2 className="w-4 h-4" /> Verified
                     </span>
                ) : (
                    <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-xs font-medium">
                        <ShieldAlert className="w-4 h-4" /> Unverified
                    </span>
                )}
            </div>

            {!verificationData?.nin_verified && (
                <div className="space-y-4 max-w-md mt-6">
                    <div className="space-y-2">
                        <Label>NIN Number</Label>
                        <Input 
                            placeholder="12345678901"
                            value={nin}
                            onChange={(e) => setNin(e.target.value)}
                            maxLength={11}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input 
                            type="date" 
                            value={dobNin}
                            onChange={(e) => setDobNin(e.target.value)}
                        />
                    </div>
                    <Button 
                        onClick={verifyNin} 
                        disabled={verifyingNin}
                        className="w-full bg-[#0E9DA5] hover:bg-[#0b7d84]"
                    >
                        {verifyingNin ? <Loader2 className="animate-spin" /> : 'Verify NIN'}
                    </Button>
                </div>
            )}
        </div>
    </div>
  );
}
