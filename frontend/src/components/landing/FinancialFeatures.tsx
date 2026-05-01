'use client';

import { useInView } from '@/hooks/useInView';
import Image from 'next/image';

export default function FinancialFeatures() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const features = [
    'Automated Payments',
    'Payment Splitting',
    'Fundraising Campaigns',
    'Multi-Method Transactions',
    'Expense Tracking & Approval'
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#f5f5f6]" ref={ref}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-20">
          
          {/* Left: Phone Mockup */}
          <div className={`w-full lg:w-1/2 relative flex justify-center lg:justify-start transition-opacity duration-1000 ${isInView ? 'animate-fade-in-right' : 'opacity-0'}`}>
            <div className="relative w-[300px] h-[600px] bg-black rounded-[40px] border-[8px] border-gray-800 shadow-2xl overflow-hidden">
             {/* Notch */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-[30px] w-[120px] bg-black rounded-b-2xl z-20"></div>
              {/* Screen Content Placeholder - In a real app, this would be a screenshot or UI components */}
              <div className="w-full h-full bg-white pt-10 px-4">
                 {/* Abstract UI representation */}
                 <div className="h-8 w-8 bg-gray-200 rounded-full mb-6"></div>
                 <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
                 <div className="h-4 w-1/2 bg-gray-100 rounded mb-8"></div>
                 
                 <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                    <div className="h-10 w-10 bg-blue-100 rounded-full mb-2"></div>
                    <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                 </div>
                 <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                    <div className="h-10 w-10 bg-green-100 rounded-full mb-2"></div>
                    <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
                 </div>
              </div>
            </div>
            {/* Glow effect back drop */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[650px] bg-gray-200/50 rounded-[50px] -z-10 blur-xl"></div>
          </div>

          {/* Right: Content */}
          <div className={`w-full lg:w-1/2 transition-opacity duration-1000 delay-300 ${isInView ? 'animate-fade-in-left' : 'opacity-0'}`}>
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6 leading-tight">
              Take <span className="text-[#009ca6]">control</span> of your community’s finances .
            </h2>
            <p className="text-gray-500 text-lg mb-10 leading-relaxed">
              CCPay empowers associations, clubs, student groups, and NGOs to manage payments, fundraising, and expense tracking effortlessly all in one secure platform.
            </p>

            <div className="space-y-0 divide-y divide-gray-100">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="py-4 text-gray-800 font-medium text-lg hover:bg-gray-50 px-4 -mx-4 rounded-lg transition-colors cursor-default"
                >
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
