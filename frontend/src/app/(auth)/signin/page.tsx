'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { GoogleIcon, AppleIcon } from '@/constants/auth-icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useInView } from '@/hooks/useInView';
import { ApiService } from '@/services/api';
import toast from 'react-hot-toast';
import { toastAxiosError } from '@/hooks/useAxiosError';

export default function AccountLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const handleLogin = async () => {
    if (!email || !password) {
        toast.error('Please enter both email and password');
        return;
    }

    setIsLoading(true);
    try {
        const response = await ApiService.auth.login({ email, password });
        const loginData = response.data;
        
        if (loginData.tokens && loginData.tokens.access_token) {
            localStorage.setItem('access_token', loginData.tokens.access_token);
            localStorage.setItem('refresh_token', loginData.tokens.refresh_token);
            
            // Store user and verification details
            if (loginData.user) {
                localStorage.setItem('user_data', JSON.stringify(loginData.user));
            }
            if (loginData.verification) {
                localStorage.setItem('verification_data', JSON.stringify(loginData.verification));
            }
            
            toast.success('Logged in successfully!');
            router.push('/dashboard'); 
        } else {
             toast.error('Login failed: ' + (loginData.message || 'No token received'));
        } 
    } catch (error: any) {
        console.error('Login Error:', error);
        toastAxiosError(error, 'Login failed. Please check your credentials and try again.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-white font-sans overflow-hidden">
      
      {/* Left Side - Premium Visuals */}
      <div className="hidden lg:flex lg:w-5/12 relative h-full overflow-hidden gradient-primary flex-col justify-between p-12">
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#043336]/80 via-[#0E9DA5]/20 to-transparent z-0" />
        
        <div className="absolute top-20 -left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-40 right-10 w-64 h-64 bg-teal-300/20 rounded-full blur-3xl animate-bounce-slow" />

        <div className="relative z-20">
          <Link href="/" className="inline-block hover-scale smooth-transition">
            <div className="bg-white p-3 rounded-2xl shadow-elevated flex items-center justify-center w-fit">
              <Image
                src="/images/main-logo.svg"
                alt="Community Circle logo"
                width={48}
                height={48}
                className="w-10 h-10"
              />
            </div>
          </Link>
        </div>

        <div className="relative z-10 w-full mb-10">
          <div className="relative w-full aspect-video flex items-center justify-center mb-12 max-h-[260px]">
            <div className="absolute inset-0 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 transform -rotate-3 animate-pulse-scale" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl transform rotate-3 border border-white/10" />
            
            <div className="relative z-10 text-center p-8">
              <div className="w-16 h-16 bg-white/20 rounded-2xl mx-auto mb-4 flex items-center justify-center backdrop-blur-sm shadow-inner">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                </svg>
              </div>
              <p className="text-white font-medium text-lg tracking-wide">
                Welcome back.
              </p>
            </div>
          </div>

          <div className="animate-fade-in delay-300">
            <h2 className="text-4xl xl:text-5xl font-extrabold text-white leading-[1.2] mb-4 tracking-tight">
              Sign in to<br />your circle.
            </h2>
            <p className="text-teal-50 text-lg font-medium leading-relaxed opacity-90 max-w-md">
              Pick up right where you left off and stay connected with your communities.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-7/12 flex flex-col justify-center items-center p-6 sm:px-12 lg:px-20 bg-[#fdfdfd] relative h-full overflow-y-auto lg:overflow-hidden custom-scrollbar">
        
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-6 left-6 z-20">
          <Link href="/">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
              <Image
                src="/images/main-logo.svg"
                alt="Community Circle logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
            </div>
          </Link>
        </div>

        <div 
          ref={ref}
          className={`w-full max-w-[420px] pt-16 lg:pt-0 pb-10 transition-all duration-1000 ${isInView ? 'animate-slide-in-right opacity-100' : 'opacity-0 translate-x-12'}`}
        >
          {/* Header */}
          <div className="mb-8">
            <button 
              onClick={() => router.back()}
              className="inline-flex w-fit items-center text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-full p-2 mb-6 hover:bg-gray-50 smooth-transition shadow-sm hover-lift"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
              Sign In
            </h1>
            <p className="text-gray-500 text-base sm:text-lg">
              Please enter your details to sign in.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <button className="w-full flex items-center justify-center gap-4 px-4 py-3.5 bg-white border-2 border-gray-100 rounded-2xl hover:border-gray-200 hover:bg-gray-50 hover-lift smooth-transition group shadow-sm text-gray-700 font-semibold text-base">
              <GoogleIcon className="w-6 h-6 group-hover:scale-110 smooth-transition" />
              <span>Continue with Google</span>
            </button>

            <button className="w-full flex items-center justify-center gap-4 px-4 py-3.5 bg-white border-2 border-gray-100 rounded-2xl hover:border-gray-200 hover:bg-gray-50 hover-lift smooth-transition group shadow-sm text-gray-700 font-semibold text-base">
              <AppleIcon className="w-6 h-6 group-hover:scale-110 smooth-transition" />
              <span>Continue with Apple</span>
            </button>
          </div>

          <div className="relative flex items-center py-2 mb-6">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm uppercase font-bold tracking-widest">Or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <div className="space-y-5">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 px-4 bg-gray-50 border-gray-200 focus:bg-white focus:border-[#0E9DA5] focus:ring-[#0E9DA5] rounded-xl transition-all shadow-sm text-base"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 px-4 pr-12 bg-gray-50 border-gray-200 focus:bg-white focus:border-[#0E9DA5] focus:ring-[#0E9DA5] rounded-xl transition-all shadow-sm text-base"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0E9DA5] transition-colors p-2 rounded-full hover:bg-[#E6F6F3]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Link
                href="/forgot-password"
                className="text-sm font-bold text-[#0E9DA5] hover:text-[#0a7a80] smooth-transition hover:underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full h-14 mt-4 bg-[#0E9DA5] hover:bg-[#0a7a80] text-white font-bold text-lg rounded-2xl shadow-glow hover:shadow-lg hover-lift smooth-transition"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  Signing In...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>

            {/* Footer */}
            <p className="text-center text-base text-gray-600 font-medium pt-4">
              Don't have an account?{' '}
              <Link
                href="/get-started"
                className="text-[#0E9DA5] hover:text-[#0a7a80] font-bold smooth-transition hover:underline decoration-2 underline-offset-4"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
