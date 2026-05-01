'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { GoogleIcon, AppleIcon } from '@/constants/auth-icons';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useInView } from '@/hooks/useInView';

export default function GetStartedPage() {
  const router = useRouter();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const handleCreateAccount = () => {
    router.push('/account-setup');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">
      {/* Left Side - Premium Visuals */}
      <div className="lg:w-1/2 relative w-full min-h-[40vh] lg:min-h-screen overflow-hidden gradient-primary flex flex-col">
        {/* Animated Background Textures */}
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#043336]/60 via-transparent to-transparent z-0" />
        
        {/* Floating Decorative Elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-teal-300/20 rounded-full blur-3xl animate-bounce-slow" />

        {/* Logo */}
        <Link
          href="/"
          className="absolute top-8 left-8 sm:top-10 sm:left-10 z-20 hover-scale smooth-transition"
        >
          <div className="bg-white p-2.5 rounded-2xl shadow-elevated flex items-center justify-center">
            <Image
              src="/images/main-logo.svg"
              alt="Community Circle logo"
              width={48}
              height={48}
              className="w-10 h-10 sm:w-12 sm:h-12"
            />
          </div>
        </Link>

        {/* Content Container */}
        <div className="relative z-10 flex-grow flex flex-col justify-center items-center px-8 lg:px-16 mt-24 lg:mt-0">
          
          {/* Glassmorphic Image Display */}
          <div className="relative w-full max-w-[500px] aspect-square flex items-center justify-center mb-8 lg:mb-12">
            <div className="absolute inset-0 bg-white/5 rounded-[3rem] backdrop-blur-md border border-white/10 transform rotate-3 animate-pulse-scale" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[3rem] transform -rotate-3 border border-white/10" />
            
            <div className="relative w-[70%] sm:w-[60%] animate-fade-in-up delay-100 z-10">
              <Image
                src="/images/left-get-started.svg"
                alt="Happy community"
                width={420}
                height={280}
                className="w-full h-auto drop-shadow-2xl rounded-2xl transform -rotate-6 hover:rotate-0 hover:scale-105 smooth-transition-slow shadow-elevated"
                style={{ transformOrigin: 'bottom right' }}
              />
            </div>
            <div className="absolute top-1/2 left-1/2 w-[70%] sm:w-[60%] animate-fade-in-up delay-300 z-20" style={{ transform: 'translate(-30%, -20%)' }}>
               <Image
                src="/images/right-get-started.svg"
                alt="Group discussion"
                width={420}
                height={280}
                className="w-full h-auto drop-shadow-2xl rounded-2xl transform rotate-6 hover:rotate-0 hover:scale-105 smooth-transition-slow shadow-elevated"
                style={{ transformOrigin: 'bottom left' }}
              />
            </div>
          </div>

          {/* Typography Section */}
          <div className="w-full text-center lg:text-left animate-fade-in delay-500">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-[1.2] mb-5 tracking-tight">
              Find and join communities<br className="hidden sm:block" /> that matter to you.
            </h2>
            <p className="text-teal-50 text-base sm:text-lg max-w-md mx-auto lg:mx-0 font-medium leading-relaxed opacity-90">
              Discover like-minded people, engage in shared goals, and grow together in a safe, vibrant space.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Premium Form */}
      <div 
        className="lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-20 bg-[#fdfdfd] relative"
        ref={ref}
      >
        <div className={`w-full max-w-[420px] space-y-10 transition-all duration-1000 ${isInView ? 'animate-slide-in-right opacity-100' : 'opacity-0 translate-x-12'}`}>
          
          <div className="text-center lg:text-left space-y-3">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#0E9DA5]/10 text-[#0E9DA5] font-semibold text-sm mb-4">
              Welcome to Community Circle
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
              Let's get started
            </h1>
            <p className="text-gray-500 text-lg">
              Join thousands of community members today.
            </p>
          </div>

          <div className="space-y-4">
            <button className="w-full flex items-center justify-center gap-4 px-4 py-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-gray-200 hover:bg-gray-50 hover-lift smooth-transition group shadow-sm text-gray-700 font-semibold text-base">
              <GoogleIcon className="w-6 h-6 group-hover:scale-110 smooth-transition" />
              <span>Continue with Google</span>
            </button>

            <button className="w-full flex items-center justify-center gap-4 px-4 py-4 bg-white border-2 border-gray-100 rounded-2xl hover:border-gray-200 hover:bg-gray-50 hover-lift smooth-transition group shadow-sm text-gray-700 font-semibold text-base">
              <AppleIcon className="w-6 h-6 group-hover:scale-110 smooth-transition" />
              <span>Continue with Apple</span>
            </button>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm uppercase font-bold tracking-widest">Or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <Button
            onClick={handleCreateAccount}
            className="w-full py-7 text-lg font-bold bg-[#0E9DA5] hover:bg-[#0a7a80] text-white rounded-2xl shadow-glow hover:shadow-lg hover-lift smooth-transition border border-transparent flex items-center justify-center"
          >
            Create account via email
          </Button>

          <p className="text-center text-base text-gray-600 font-medium pt-4">
            Already have an account?{' '}
            <Link
              href="/signin"
              className="text-[#0E9DA5] hover:text-[#0a7a80] font-bold smooth-transition hover:underline decoration-2 underline-offset-4"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

