'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X, Camera, ScanFace } from 'lucide-react';
import { useInView } from '@/hooks/useInView';

export default function FaceVerification() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(
    '/images/profile-placeholder.jpg'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleContinue = () => {
    router.push('/verification-success');
  };

  const handleClose = () => {
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f8fafc] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-b from-[#0E9DA5]/5 to-transparent blur-3xl opacity-50" />
      </div>

      <div 
        ref={ref}
        className={`w-full max-w-[440px] z-10 transition-all duration-700 ${isInView ? 'animate-scale-in opacity-100' : 'opacity-0 translate-y-4'}`}
      >
        <div className="glass-card p-8 rounded-2xl shadow-elevated border border-white/50 backdrop-blur-xl relative">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full smooth-transition"
          >
            <X className="w-5 h-5" />
          </button>

           {/* Header */}
          <div className="mb-8 text-center pt-2">
             <div className="flex justify-center mb-6">
               <div className="w-16 h-16 bg-[#e0f2f3] rounded-full flex items-center justify-center text-3xl animate-pulse-slow text-[#0E9DA5]">
                 <ScanFace className="w-8 h-8" />
               </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Face Verification
            </h1>
            <p className="text-gray-500 text-sm">
              Upload a clear selfie that captures your face correctly to verify your identity.
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div
              className={`
                relative w-40 h-40 rounded-full overflow-hidden cursor-pointer group transition-all duration-300
                ${selectedImage ? 'border-4 border-[#0E9DA5] shadow-lg ring-4 ring-[#0E9DA5]/10' : 'border-4 border-dashed border-gray-200 hover:border-[#0E9DA5]'}
              `}
              onClick={triggerFileUpload}
            >
              <Image
                src={imagePreview}
                alt="Profile selfie"
                fill
                className={`object-cover transition-opacity duration-300 ${!selectedImage ? 'opacity-50 grayscale' : ''}`}
                unoptimized // Use unoptimized if placeholder is local and not processed
              />
              
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          <Button
            onClick={selectedImage ? handleContinue : triggerFileUpload}
            className={`w-full py-6 text-base font-semibold shadow-soft hover-glow ${selectedImage ? 'btn-primary' : 'btn-secondary'}`}
          >
            {selectedImage ? 'Verify Identity' : 'Upload Selfie'}
          </Button>
        </div>
      </div>
    </div>
  );
}
