'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check } from 'lucide-react';
import { useInView } from '@/hooks/useInView';

export default function InterestSelection() {
  const [selectedInterests, setSelectedInterests] = useState([
    'Education',
    'Weather',
  ]);
  const router = useRouter();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const interests = [
    'Technology', 'Sport', 'Finances', 'Education', 'Gaming',
    'Music', 'Agriculture', 'Nature', 'News',
    'Entertainment', 'Movies', 'Lifestyle', 'Science', 'Books',
    'Society', 'Health', 'Beauty', 'Business', 'Fashion',
    'Food and drinks', 'Careers', 'Politics', 'Travel'
  ];

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  const handleContinue = () => {
    router.push('/signin');
  };

  const handleSkip = () => {
    router.push('/signin');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f8fafc] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
         <div className="absolute top-[10%] left-[50%] -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-b from-[#0E9DA5]/5 to-transparent blur-3xl opacity-60" />
      </div>

      <div 
        ref={ref}
        className={`w-full max-w-[600px] z-10 transition-all duration-700 ${isInView ? 'animate-scale-in opacity-100' : 'opacity-0 translate-y-4'}`}
      >
        <div className="glass-card p-6 sm:p-8 rounded-2xl shadow-elevated border border-white/50 backdrop-blur-xl">
           {/* Header */}
          <div className="mb-8 text-center pt-4">
             <div className="flex justify-center mb-6">
               <div className="w-16 h-16 bg-[#e0f2f3] rounded-full flex items-center justify-center text-3xl animate-bounce-slow">
                 ✨
               </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              What are you interested in?
            </h1>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Select a few topics so we can personalize your experience and show you communities you'll love.
            </p>
          </div>

          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-3">
              {interests.map((interest, index) => {
                 const isSelected = selectedInterests.includes(interest);
                 return (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border
                      ${isSelected 
                        ? 'bg-[#0E9DA5] text-white border-[#0E9DA5] shadow-lg scale-105' 
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#0E9DA5]/50 hover:bg-[#0E9DA5]/5'
                      }
                    `}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span className="flex items-center gap-1.5">
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      {interest}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-3 max-w-sm mx-auto">
            <Button
              onClick={handleContinue}
              className="btn-primary w-full py-6 text-base font-semibold shadow-soft hover-glow"
            >
              Continue ({selectedInterests.length} selected)
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
