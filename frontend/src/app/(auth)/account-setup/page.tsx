'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInView } from '@/hooks/useInView';
import { ApiService, SignupPayload } from '@/services/api';
import toast from 'react-hot-toast';
import { toastAxiosError } from '@/hooks/useAxiosError';

export default function AccountSetupForm() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    email: '',
    phoneNumber: '',
    gender: '',
    password: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const router = useRouter();
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error for the field being typed in
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleContinue = async () => {
    // Basic local validation before API call
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        toast.error('Please fill in all required fields');
        setFieldErrors({
          firstName: !formData.firstName ? 'First name is required' : '',
          lastName: !formData.lastName ? 'Last name is required' : '',
          email: !formData.email ? 'Email is required' : '',
          password: !formData.password ? 'Password is required' : ''
        });
        return;
    }

    setIsLoading(true);
    setFieldErrors({}); // Reset errors before submission

    try {
        const payload: SignupPayload = {
            email: formData.email,
            password: formData.password,
            firstname: formData.firstName,
            lastname: formData.lastName,
            phone_number: formData.phoneNumber || null,
            date_of_birth: formData.dateOfBirth,
            nin: null,
            role: 'user',
        };

        await ApiService.auth.signup(payload);
        toast.success('Account created! Please verify your email.');
        router.push(`/verify-otp?email=${encodeURIComponent(formData.email)}`);

    } catch (error: any) {
        // Handle 422 Validation Errors mapped from backend
        if (error.response?.status === 422 && error.response?.data?.errors?.json) {
            const apiErrors = error.response.data.errors.json;
            const newFieldErrors: Record<string, string> = {};
            
            if (apiErrors.firstname) newFieldErrors.firstName = apiErrors.firstname[0];
            if (apiErrors.lastname) newFieldErrors.lastName = apiErrors.lastname[0];
            if (apiErrors.date_of_birth) newFieldErrors.dateOfBirth = apiErrors.date_of_birth[0];
            if (apiErrors.email) newFieldErrors.email = apiErrors.email[0];
            if (apiErrors.phone_number) newFieldErrors.phoneNumber = apiErrors.phone_number[0];
            if (apiErrors.password) newFieldErrors.password = apiErrors.password[0];
            if (apiErrors.gender) newFieldErrors.gender = apiErrors.gender[0];
            
            setFieldErrors(newFieldErrors);
            toast.error('Please fix the errors in the form.');
        } else {
            toastAxiosError(error, 'Signup failed. Please try again.');
        }
        console.error('Signup Error:', error);
    } finally {
        setIsLoading(false);
    }
  };

  const genderOptions = ['Male', 'Female'];

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-white font-sans overflow-hidden">
      
      {/* Left Side - Premium Visuals */}
      <div className="hidden lg:flex lg:w-5/12 relative h-full overflow-hidden gradient-primary flex-col justify-between p-10">
        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#043336]/80 via-[#0E9DA5]/20 to-transparent z-0" />
        
        <div className="absolute top-20 -left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-40 right-10 w-64 h-64 bg-teal-300/20 rounded-full blur-3xl animate-bounce-slow" />

        <div className="relative z-20">
          <Link href="/" className="inline-block hover-scale smooth-transition">
            <div className="bg-white p-2.5 rounded-2xl shadow-elevated flex items-center justify-center w-fit">
              <Image
                src="/images/main-logo.svg"
                alt="Community Circle logo"
                width={40}
                height={40}
                className="w-10 h-10"
              />
            </div>
          </Link>
        </div>

        <div className="relative z-10 w-full mb-6">
          <div className="relative w-full aspect-video flex items-center justify-center mb-8 max-h-[220px]">
            <div className="absolute inset-0 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 transform -rotate-3 animate-pulse-scale" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl transform rotate-3 border border-white/10" />
            
            <div className="relative z-10 text-center p-6">
              <div className="w-14 h-14 bg-white/20 rounded-2xl mx-auto mb-3 flex items-center justify-center backdrop-blur-sm">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
              </div>
              <p className="text-white font-medium text-base tracking-wide">
                Join the circle.
              </p>
            </div>
          </div>

          <div className="animate-fade-in delay-300">
            <h2 className="text-3xl xl:text-4xl font-extrabold text-white leading-[1.2] mb-3 tracking-tight">
              Create your profile<br />and belong.
            </h2>
            <p className="text-teal-50 text-base font-medium leading-relaxed opacity-90 max-w-sm">
              Set up your account to start engaging with communities that align with your passions.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-7/12 flex flex-col justify-center items-center p-6 sm:px-12 lg:px-16 bg-[#fdfdfd] relative h-full overflow-y-auto lg:overflow-hidden">
        
        <div className="lg:hidden absolute top-4 left-4 z-20">
          <Link href="/">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
              <Image src="/images/main-logo.svg" alt="Logo" width={28} height={28} className="w-7 h-7" />
            </div>
          </Link>
        </div>

        <div 
          ref={ref}
          className={`w-full max-w-[480px] transition-all duration-1000 ${isInView ? 'animate-slide-in-right opacity-100' : 'opacity-0 translate-x-12'}`}
        >
          {/* Header */}
          <div className="mb-4 lg:mb-6 flex flex-col pt-12 lg:pt-0">
            <button 
              onClick={() => router.back()}
              className="inline-flex w-fit items-center text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-full p-1.5 mb-3 hover:bg-gray-50 smooth-transition shadow-sm hover-lift"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-1">
              Set up your account
            </h1>
            <p className="text-gray-500 text-sm sm:text-base">
              Input details as shown on your legal documents.
            </p>
          </div>

          <div className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs sm:text-sm font-bold text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className={`h-11 px-3 sm:px-4 bg-gray-50 rounded-xl transition-all shadow-sm text-sm ${fieldErrors.firstName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:bg-white focus:border-[#0E9DA5] focus:ring-[#0E9DA5]'}`}
                  />
                  {fieldErrors.firstName && <p className="text-red-500 text-xs font-medium pl-1">{fieldErrors.firstName}</p>}
                </div>
                <div className="space-y-1">
                  <label className="block text-xs sm:text-sm font-bold text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Last name"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className={`h-11 px-3 sm:px-4 bg-gray-50 rounded-xl transition-all shadow-sm text-sm ${fieldErrors.lastName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:bg-white focus:border-[#0E9DA5] focus:ring-[#0E9DA5]'}`}
                  />
                  {fieldErrors.lastName && <p className="text-red-500 text-xs font-medium pl-1">{fieldErrors.lastName}</p>}
                </div>
            </div>

            {/* Email and Phone Number Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`h-11 px-3 sm:px-4 bg-gray-50 rounded-xl transition-all shadow-sm text-sm ${fieldErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:bg-white focus:border-[#0E9DA5] focus:ring-[#0E9DA5]'}`}
                />
                {fieldErrors.email && <p className="text-red-500 text-xs font-medium pl-1">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="+234..."
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                  className={`h-11 px-3 sm:px-4 bg-gray-50 rounded-xl transition-all shadow-sm text-sm ${fieldErrors.phoneNumber ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:bg-white focus:border-[#0E9DA5] focus:ring-[#0E9DA5]'}`}
                />
                {fieldErrors.phoneNumber && <p className="text-red-500 text-xs font-medium pl-1">{fieldErrors.phoneNumber}</p>}
              </div>
            </div>

            {/* Date of Birth and Gender Row */}
            <div className="grid grid-cols-2 gap-4">
               {/* Gender */}
               <div className="space-y-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700">
                  Gender
                </label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleInputChange('gender', value)}
                >
                  <SelectTrigger className={`h-11 px-3 sm:px-4 bg-gray-50 rounded-xl transition-all shadow-sm text-sm ${fieldErrors.gender ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:bg-white focus:border-[#0E9DA5] focus:ring-[#0E9DA5]'}`}>
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-100 rounded-xl shadow-elevated">
                    {genderOptions.map((option) => (
                      <SelectItem
                        key={option}
                        value={option}
                        className="cursor-pointer hover:bg-[#E6F6F3] focus:bg-[#E6F6F3] transition-colors py-2 text-sm"
                      >
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldErrors.gender && <p className="text-red-500 text-xs font-medium pl-1">{fieldErrors.gender}</p>}
              </div>

               {/* Date of Birth */}
               <div className="space-y-1">
                <label className="block text-xs sm:text-sm font-bold text-gray-700">
                  Date of Birth
                </label>
                <Input
                  type="date" 
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className={`h-11 px-3 sm:px-4 bg-gray-50 rounded-xl transition-all shadow-sm text-gray-700 text-sm ${fieldErrors.dateOfBirth ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:bg-white focus:border-[#0E9DA5] focus:ring-[#0E9DA5]'}`}
                />
                {fieldErrors.dateOfBirth && <p className="text-red-500 text-xs font-medium pl-1">{fieldErrors.dateOfBirth}</p>}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs sm:text-sm font-bold text-gray-700">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`h-11 px-3 sm:px-4 pr-10 bg-gray-50 rounded-xl transition-all shadow-sm text-sm ${fieldErrors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-200 focus:bg-white focus:border-[#0E9DA5] focus:ring-[#0E9DA5]'}`}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0E9DA5] transition-colors p-1.5 rounded-full hover:bg-[#E6F6F3]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
              </div>
              {fieldErrors.password && <p className="text-red-500 text-xs font-medium pl-1">{fieldErrors.password}</p>}
            </div>

            {/* Submit Button */}
            <Button
              className="w-full h-12 mt-4 lg:mt-6 bg-[#0E9DA5] hover:bg-[#0a7a80] text-white font-bold text-base rounded-2xl shadow-glow hover:shadow-lg hover-lift smooth-transition"
              onClick={handleContinue}
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Continue'
              )}
            </Button>

            {/* Terms Notice */}
            <p className="text-xs sm:text-sm text-center text-gray-500 pt-2">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="text-[#0E9DA5] hover:text-[#0a7a80] hover:underline font-bold transition-colors underline-offset-4">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-[#0E9DA5] hover:text-[#0a7a80] hover:underline font-bold transition-colors underline-offset-4">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
