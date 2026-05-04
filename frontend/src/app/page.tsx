'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Hero from '@/components/layout/Hero';
import { StatsStrip } from '@/components/landing/StatsStrip';
import { PartnerStrip } from '@/components/landing/PartnerStrip';
import { SplitWidget } from '@/components/landing/SplitWidget';
import { Personas } from '@/components/landing/Personas';
import { FeatureTabs } from '@/components/landing/FeatureTabs';
import { Testimonials } from '@/components/landing/Testimonials';
import { PricingBand } from '@/components/landing/PricingBand';
import { StickyCta } from '@/components/landing/StickyCta';
import Security from '@/components/landing/Security';
import Accessibility from '@/components/landing/Accessibility';
import FAQ from '@/components/landing/FAQ';
import Footer from '@/components/landing/Footer';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { isTokenExpired } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token && !isTokenExpired(token)) {
      router.replace('/dashboard');
    }
  }, [router, isTokenExpired]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Hero />
      <StatsStrip />
      <PartnerStrip />
      <SplitWidget />
      <Personas />
      <FeatureTabs />
      <Testimonials />
      <PricingBand />
      <Security />
      <Accessibility />
      <FAQ />
      <Footer />
      <StickyCta />
    </div>
  );
}
