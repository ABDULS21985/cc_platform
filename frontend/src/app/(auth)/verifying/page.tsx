"use client";
import Image from "next/image";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiService } from "@/services/api";
import toast from "react-hot-toast";
import { toastAxiosError } from "@/hooks/useAxiosError";

function VerifyingContent() {
  const [dots, setDots] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get("taskId");

  // Loading dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Polling for task status
  useEffect(() => {
    if (!taskId) return;

    let intervalId: NodeJS.Timeout;

    const pollStatus = async () => {
      try {
        const response = await ApiService.verification.getTaskStatus(taskId);
        // response.data is TaskStatusResponse
        const taskData = response.data.data;
        const status = taskData.status?.toLowerCase();
        const state = taskData.state?.toLowerCase();

        if (status === "verified" || status === "success" || state === "success") {
          clearInterval(intervalId);
          toast.success("Verification Complete!");
          const returnUrl = searchParams.get("returnUrl");
          if (returnUrl) {
            router.push(returnUrl);
          } else {
            router.push("/verification-success");
          }
        } else if (status === "failed" || state === "failure") {
          clearInterval(intervalId);
          setErrorMsg(taskData.error || "Verification Failed: Please check your details.");
        }
        // If 'pending' or 'processing', do nothing and wait for next poll
      } catch (error) {
        toastAxiosError(
          error,
          "Error checking verification status. Please try again later.",
        );
        console.error("Polling Error:", error);
      }
    };

    intervalId = setInterval(pollStatus, 3000); // Poll every 3 seconds

    return () => clearInterval(intervalId);
  }, [taskId, router, searchParams]);

  // Fallback for no taskId (simulate delay then success for demo/fallback)
  useEffect(() => {
    if (!taskId) {
      const timeout = setTimeout(() => {
        // If we arrived here without a task ID, assume it was client-side transition demo?
        // Or just redirect back if invalid.
        // For now, let's just go to success if it was a manual nav, but strictly we should require taskId.
        // router.push('/verification-success');
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [taskId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-[#f8fafc] relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-50" />
        <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-[#0E9DA5]/10 to-[#0E9DA5]/5 blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-[400px] glass-card p-8 rounded-2xl shadow-elevated border border-white/50 backdrop-blur-xl animate-scale-in text-center">
        {errorMsg ? (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center animate-bounce-slow">
                <span className="text-3xl">❌</span>
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Verification Failed
            </h1>
            <p className="text-gray-500 text-sm mb-8">
              {errorMsg}
            </p>
            <button
              onClick={() => {
                const returnUrl = searchParams.get("returnUrl");
                if (returnUrl) {
                  router.push(returnUrl);
                } else {
                  router.push("/bvn-verification");
                }
              }}
              className="btn-primary w-full py-4 rounded-xl text-base font-semibold shadow-soft hover-glow"
            >
              {searchParams.get("returnUrl") ? "Return to Settings" : "Try Again"}
            </button>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-6">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-[#0E9DA5] rounded-full animate-spin"></div>

                <div className="absolute inset-2 bg-teal-50 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⏳</span>
                </div>
              </div>
            </div>

            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Verifying Identity{dots}
            </h1>
            <p className="text-gray-500 text-sm">
              We are confirming your details with the relevant authorities. This
              usually takes less than a minute.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function BVNVerificationLoading() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyingContent />
    </Suspense>
  );
}
