"use client";

import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/layout/Hero";
import Features from "@/components/layout/Features";
import TargetAudience from "@/components/landing/TargetAudience";
import FinancialFeatures from "@/components/landing/FinancialFeatures";
import Security from "@/components/landing/Security";
import Accessibility from "@/components/landing/Accessibility";
import FAQ from "@/components/landing/FAQ";
import Footer from "@/components/landing/Footer";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { isTokenExpired } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (token && !isTokenExpired(token)) {
      router.replace("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f5f5f6]">
      <Navbar />
      <Hero />
      <TargetAudience />
      <Features />
      <FinancialFeatures />
      <Security />
      <Accessibility />
      <FAQ />
      <Footer />
    </div>
  );
}
