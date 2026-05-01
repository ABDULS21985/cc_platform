'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInView } from '@/hooks/useInView';

export default function HeaderUpload() {
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
    router.push('/upload-selfie');
  };
  
  const handleContinue = () => {
     router.push('/upload-selfie');
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f8fafc] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
         <div className="absolute bottom-[20%] left-[20%] w-[500px] h-[500px] rounded-full bg-gradient-to-t from-[#0E9DA5]/5 to-transparent blur-3xl opacity-60" />
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
                 🖼️
               </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Upload a header
            </h1>
            <p className="text-gray-500 text-sm">
              People who visit your profile will see your header. Make it count!
            </p>
          </div>

          <div className="mb-8">
            <div className="relative group w-full h-40 sm:h-48 rounded-xl overflow-hidden transition-all duration-300">
               <div className={`
                w-full h-full flex items-center justify-center
                ${selectedImage ? 'border-none' : 'border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-[#0E9DA5]'}
              `}>
                {selectedImage ? (
                  <img
                    src={selectedImage}
                    alt="Header"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center text-gray-400 group-hover:text-[#0E9DA5] transition-colors">
                    <ImageIcon className="w-10 h-10 mb-2" />
                    <span className="text-sm font-medium">Click to upload header</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
               <div className="absolute bottom-4 right-4 w-10 h-10 bg-white/80 backdrop-blur text-gray-700 rounded-full flex items-center justify-center shadow-md pointer-events-none transition-transform group-hover:scale-110">
                  <Camera className="w-5 h-5" />
                </div>
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
