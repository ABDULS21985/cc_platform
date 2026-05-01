'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, ArrowRight, Flame } from 'lucide-react';
import { Button } from '../ui/button';
import { useInView } from '@/hooks/useInView';

export default function Hero() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const heroImages = [
    { src: '/images/hero1.svg', alt: 'Community members working together' },
    { src: '/images/hero2.svg', alt: 'Team collaboration and learning' },
    { src: '/images/hero3.svg', alt: 'Community members networking outdoors' },
  ];

  // Auto-rotate images on mobile
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) =>
        prevIndex === heroImages.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <div className={`flex justify-center mb-6 transition-opacity duration-700 ${isInView ? 'animate-fade-in-down delay-100' : 'opacity-0'}`}>
          <div className="inline-flex items-center space-x-2 bg-[#f6fafb] border border-[#dff1f2] rounded-full px-4 py-2 hover-lift smooth-transition shadow-soft hover-glow cursor-pointer">
            <span className="text-[#050505] text-[0.875rem] font-[600]">
              The perfect place to connect
            </span>
            <div className="bg-[#0e9da5] p-1 rounded-full animate-pulse-scale">
              <ArrowRight className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>

        <div className={`text-center mb-6 transition-opacity duration-700 ${isInView ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black leading-tight">
            Connect, and grow with a community
          </h1>
        </div>

        <div className={`text-center mb-8 max-w-3xl mx-auto transition-opacity duration-700 ${isInView ? 'animate-fade-in delay-300' : 'opacity-0'}`}>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            An awesome and fun medium to find & stay connected with your peers
            with similar interests.
          </p>
        </div>

        <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 transition-opacity duration-700 ${isInView ? 'animate-fade-in-up delay-400' : 'opacity-0'}`}>
          <button className="flex items-center space-x-2 bg-white border border-[#e1e5ea] text-black px-8 h-[43px] rounded-sm hover-lift smooth-transition shadow-soft hover-glow group">
            <div className="border border-[#344054] p-1 rounded-full group-hover:bg-[#344054] smooth-transition">
              <Play className="w-3 h-3 text-[#344054] group-hover:text-white smooth-transition" />
            </div>

            <span className="font-medium">Watch Demo</span>
          </button>
          <Link href="/get-started">
            <Button className="btn-primary px-8 h-[43px] rounded-sm font-medium shadow-elevated hover-glow">
              Get Started
            </Button>
          </Link>
        </div>

        <div className="hidden md:grid grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className={`relative transition-opacity duration-700 ${isInView ? 'animate-fade-in-up delay-500' : 'opacity-0'}`}>
            <div className="aspect-[4/3] rounded-xl overflow-hidden hover-lift smooth-transition shadow-soft hover:shadow-elevated cursor-pointer">
              <Image
                src="/images/hero1.svg"
                alt="Community members working together"
                width={400}
                height={300}
                className="w-full h-full object-cover hover-scale smooth-transition-slow"
              />
            </div>
          </div>

          <div className={`relative transition-opacity duration-700 ${isInView ? 'animate-fade-in-up delay-600' : 'opacity-0'}`}>
            <div className="aspect-[4/3] rounded-xl overflow-hidden hover-lift smooth-transition shadow-soft hover:shadow-elevated cursor-pointer">
              <Image
                src="/images/hero2.svg"
                alt="Team collaboration and learning"
                width={400}
                height={300}
                className="w-full h-full object-cover hover-scale smooth-transition-slow"
              />
            </div>
          </div>

          <div className={`relative transition-opacity duration-700 ${isInView ? 'animate-fade-in-up delay-700' : 'opacity-0'}`}>
            <div className="aspect-[4/3] rounded-xl overflow-hidden hover-lift smooth-transition shadow-soft hover:shadow-elevated cursor-pointer">
              <Image
                src="/images/hero3.svg"
                alt="Community members networking outdoors"
                width={400}
                height={300}
                className="w-full h-full object-cover hover-scale smooth-transition-slow"
              />
            </div>
          </div>
        </div>

        {/* Mobile Auto-Rotating Images */}
        <div className={`md:hidden mt-8 transition-opacity duration-700 ${isInView ? 'animate-fade-in delay-500' : 'opacity-0'}`}>
          <div className="aspect-[4/3] rounded-xl overflow-hidden max-w-md mx-auto relative shadow-soft">
            <Image
              key={currentImageIndex} // Force re-render for smooth transition
              src={heroImages[currentImageIndex].src}
              alt={heroImages[currentImageIndex].alt}
              width={400}
              height={300}
              className="w-full h-full object-cover transition-opacity duration-500"
            />

            {/* Image indicators */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
              {heroImages.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full smooth-transition cursor-pointer hover-scale ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                  onClick={() => setCurrentImageIndex(index)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
