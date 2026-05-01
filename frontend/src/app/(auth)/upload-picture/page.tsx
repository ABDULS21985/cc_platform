'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, ArrowLeft, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInView } from '@/hooks/useInView';

export default function ProfilePictureUpload() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const router = useRouter();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);
    }
  };

  const handleSkip = () => {
    router.push('/upload-header');
  };

  const handleContinue = () => {
     router.push('/upload-header');
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f8fafc] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
         <div className="absolute top-[30%] right-[30%] w-[600px] h-[600px] rounded-full bg-gradient-to-r from-[#0E9DA5]/5 to-transparent blur-3xl opacity-60" />
      </div>

      <div 
        ref={ref}
        className={`w-full max-w-[500px] z-10 transition-all duration-700 ${isInView ? 'animate-scale-in opacity-100' : 'opacity-0 translate-y-4'}`}
      >
        <div className="glass-card p-6 sm:p-8 rounded-2xl shadow-elevated border border-white/50 backdrop-blur-xl">
           {/* Header */}
          <div className="mb-6 text-center">
             <div className="flex justify-center mb-6">
               <div className="w-16 h-16 bg-[#e0f2f3] rounded-full flex items-center justify-center text-3xl animate-bounce-slow">
                 📸
               </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Upload your profile picture
            </h1>
            <p className="text-gray-500 text-sm">
              Upload your favourite picture or company logo to make your profile stand out.
            </p>
          </div>

          <div className="mb-8 flex justify-center">
            <div className="relative group">
              <div className={`
                relative w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300
                ${selectedImage ? 'border-4 border-[#0E9DA5] shadow-lg' : 'border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-[#0E9DA5]'}
              `}>
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400 group-hover:text-[#0E9DA5] transition-colors">
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-xs font-medium">Upload</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer rounded-full"
              />
              
              {!selectedImage && (
                <div className="absolute bottom-0 right-0 w-10 h-10 bg-[#0E9DA5] rounded-full flex items-center justify-center border-4 border-white shadow-md pointer-events-none transition-transform group-hover:scale-110">
                  <Camera className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <Button
              onClick={handleContinue}
              className="btn-primary w-full py-6 text-base font-semibold shadow-soft hover-glow"
              disabled={!selectedImage}
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
  );
}
