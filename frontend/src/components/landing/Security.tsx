'use client';

import { useInView } from '@/hooks/useInView';
import Image from 'next/image';

export default function Security() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const features = [
    'End-to-end encryption (AES-256 & TLS 1.3)',
    'GDPR & PCI DSS compliant',
    'Multi-factor authentication',
    'Transparent data privacy policies'
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white overflow-hidden" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24">
          
          {/* Left: Content */}
          <div className={`w-full lg:w-1/2 order-2 lg:order-1 transition-opacity duration-1000 ${isInView ? 'animate-fade-in-right' : 'opacity-0'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight">
              Built for Security and Compliance
            </h2>
            <p className="text-gray-500 text-lg mb-10 leading-relaxed max-w-lg">
              Your data is protected with enterprise-grade encryption, multi-factor authentication, and strict regulatory compliance .
            </p>

            <div className="space-y-0 divide-y divide-gray-100">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="py-5 text-gray-800 font-medium text-lg"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Visual */}
          <div className={`w-full lg:w-1/2 order-1 lg:order-2 relative transition-opacity duration-1000 delay-300 ${isInView ? 'animate-fade-in-left' : 'opacity-0'}`}>
             <div className="relative rounded-3xl overflow-hidden aspect-[4/3] bg-teal-800 shadow-2xl">
                 {/* Placeholder for the image of people */}
                 <div className="absolute inset-0 bg-gradient-to-tr from-[#009ca6]/20 to-transparent mix-blend-overlay z-10"></div>
                  {/* In a real scenario, use actual image. Using a colored placeholder + gradient for now matching the vibe */}
                 <div className="relative w-full h-full bg-gray-200">
                    <Image
                        src="/images/security-people.jpg" // Assuming we'll have an image here, or I can use a placeholder
                        alt="Security and Compliance"
                        fill
                        className="object-cover"
                         // Fallback if image doesn't exist to color
                        onError={(e) => {
                             const target = e.target as HTMLImageElement;
                             target.style.display = 'none';
                             target.parentElement!.style.backgroundColor = '#d3d3d3';
                        }}
                    />
                     {/* If no image, show placeholder text */}
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-0">
                        [People Group Image Placeholder]
                    </div>
                 </div>
                 
                 {/* Decorative element background */}
                 <div className="absolute -right-10 -bottom-10 w-full h-full bg-[#009ca6] rounded-3xl -z-10 transform rotate-3"></div>
             </div>
             {/* The teal background shape from the design */}
             <div className="absolute top-0 right-0 w-[120%] h-[120%] bg-gradient-to-b from-teal-50 to-[#009ca6] -z-20 rounded-[50px] transform translate-x-20 -translate-y-10 opacity-20"></div>
          </div>

        </div>
      </div>
    </section>
  );
}
