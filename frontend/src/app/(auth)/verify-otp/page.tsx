"use client";

import React, { useState, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInView } from "@/hooks/useInView";
import { ApiService, VerifyOTPPyload } from "@/services/api";
import toast from "react-hot-toast";
import { toastAxiosError } from "@/hooks/useAxiosError";

function OTPVerificationContent() {
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const handleContinue = async () => {
    const otpValue = otp.join("");
    if (otpValue.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    if (!email) {
      toast.error("Email not found. Please sign up again.");
      return;
    }

    setIsLoading(true);
    try {
      const verifyPayload: VerifyOTPPyload = {
        email,
        otp: otpValue,
      };
      await ApiService.auth.verifyEmail(verifyPayload);
      toast.success("Email verified! Please sign in.");
      router.push("/signin");
    } catch (error: any) {
      toastAxiosError(error);
      console.error("Verification Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;
    try {
      await ApiService.auth.resendOtp(email);
      toast.success("OTP resent successfully");
    } catch (error) {
      toastAxiosError(error, "Failed to resend OTP.");
      console.error("Resend Error:", error);
    }
  };

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    const newOtp = [...otp];

    for (let i = 0; i < pastedData.length && i < 6; i++) {
      if (/^\d$/.test(pastedData[i])) {
        newOtp[i] = pastedData[i];
      }
    }

    setOtp(newOtp);

    const nextEmptyIndex = newOtp.findIndex((val) => val === "");
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#f8fafc] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-50" />
        <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-50" />
      </div>

      <div
        ref={ref}
        className={`w-full max-w-[440px] z-10 transition-all duration-700 ${isInView ? "animate-scale-in opacity-100" : "opacity-0 translate-y-4"}`}
      >
        <div className="glass-card p-8 rounded-2xl shadow-elevated border border-white/50 backdrop-blur-xl">
          {/* Header */}
          <div className="mb-8 ">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center text-gray-500 hover:text-gray-900 border border-gray-200 rounded-full p-2 mb-6 hover:bg-gray-50 smooth-transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-[#e0f2f3] rounded-full flex items-center justify-center text-3xl animate-pulse-slow">
                📱
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
              Verify OTP
            </h1>
            <p className="text-gray-500 text-sm text-center">
              We've sent a 6-digit code to{" "}
              <span className="font-semibold text-gray-800">
                {email || "your email"}
              </span>
            </p>
          </div>

          <div className="mb-8">
            <div className="flex gap-2 sm:gap-3 justify-center mb-6">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-10 h-10 sm:w-12 sm:h-12 text-center text-lg font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-[#0E9DA5]/10 focus:border-[#0E9DA5] transition-all bg-white shadow-sm"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={handleResend}
                className="text-[#0E9DA5] text-sm font-semibold hover:text-[#0b7d84] smooth-transition hover:underline"
              >
                Resend code
              </button>
            </div>
          </div>

          <Button
            onClick={handleContinue}
            className="btn-primary w-full py-6 text-base font-semibold shadow-soft hover-glow"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Verifying...
              </span>
            ) : (
              "Verify & Continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function OTPVerification() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OTPVerificationContent />
    </Suspense>
  );
}
