"use client";

import { useAuth } from "@/hooks/useAuth";
import { toastAxiosError } from "@/hooks/useAxiosError";
import { ApiService } from "@/services/api";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from 'sonner';

export default function Protected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isTokenExpired } = useAuth();

  const logout = async () => {
    try {
      await ApiService.auth.logout();
    } catch (error) {
      console.error("Logout failed", error);
      toastAxiosError(error);
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      toast.error("Session expired. Please log in again.");
      router.replace("/signin");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token || isTokenExpired(token)) {
      logout();
    }
  }, [router]);
  
  return <>{children}</>;
}
