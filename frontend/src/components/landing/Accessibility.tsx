'use client';

import { useInView } from '@/hooks/useInView';
import Image from 'next/image';

export default function Accessibility() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#f5f5f6]" ref={ref}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`text-center mb-16 transition-opacity duration-700 ${isInView ? 'animate-fade-in-down' : 'opacity-0'}`}>
          <div className="inline-flex items-center space-x-2 bg-white rounded-full px-4 py-1 mb-6 shadow-sm">
            <span className="text-orange-500">🔥</span>
            <span className="text-sm font-medium text-gray-800">Why ccpay?</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-black leading-tight mb-4">
            <span className="text-[#009ca6]">Accessible</span> Anywhere, Anytime
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
            We built CCPay to give every community, big or small, the tools to thrive. It’s not just software; it’s your digital co-pilot.
          </p>
        </div>

        {/* Images Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px] lg:h-[600px]">
          {/* Main Large Image (Left) */}
          <div className={`relative rounded-2xl overflow-hidden h-full shadow-lg transition-opacity duration-700 delay-200 ${isInView ? 'animate-fade-in-right' : 'opacity-0'}`}>
             <div className="bg-gray-300 w-full h-full relative">
                 <Image
                    src="/images/accessibility-1.jpg"
                    alt="Man working on computer"
                    fill
                    className="object-cover"
                 />
                 <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-200">
                    [Man working placeholder]
                 </div>
             </div>
          </div>

          {/* Right Column: Two stacked images */}
          <div className="flex flex-col gap-6 h-full">
            {/* Top Right */}
            <div className={`relative rounded-2xl overflow-hidden h-1/2 shadow-lg transition-opacity duration-700 delay-300 ${isInView ? 'animate-fade-in-left' : 'opacity-0'}`}>
               <div className="bg-gray-300 w-full h-full relative">
                 <Image
                    src="/images/accessibility-2.jpg"
                    alt="Couple looking at tablet"
                    fill
                    className="object-cover"
                 />
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-200">
                    [Couple placeholder]
                 </div>
               </div>
            </div>

            {/* Bottom Right */}
            <div className={`relative rounded-2xl overflow-hidden h-1/2 shadow-lg transition-opacity duration-700 delay-400 ${isInView ? 'animate-fade-in-left' : 'opacity-0'}`}>
               <div className="bg-gray-300 w-full h-full relative">
                 <Image
                    src="/images/accessibility-3.jpg"
                    alt="Woman waving on video call"
                    fill
                    className="object-cover"
                 />
                  <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-200">
                    [Woman waving placeholder]
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
