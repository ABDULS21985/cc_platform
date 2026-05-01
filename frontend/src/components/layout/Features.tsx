'use client';

import Image from 'next/image';
import { Flame } from 'lucide-react';
import { useInView } from '@/hooks/useInView';

export default function Features() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const features = [
    {
      title: 'Real time chat and AI messaging',
      description:
        'Stay connected with secure 1-on-1 or group chats. Get instant replies with our built-in AI assistant.',
      visual: '/images/feature-chat.svg',
      alt: 'Chat interface with AI messaging',
    },
    {
      title: 'Financial Tools That Work for You',
      description:
        'Collect membership dues, launch fundraising campaigns, split payments, and track expenses.',
      visual: '/images/feature-financial.svg',
      alt: 'Financial tools dashboard with charts',
    },
    {
      title: 'Secure Membership & Role Management',
      description:
        'Control who gets access and what they can do from super admins to regular members and guests.',
      visual: '/images/feature-membership.svg',
      alt: 'Membership management interface',
    },
    {
      title: 'Built-in AI Automation Tasks Handling',
      description:
        'Let AI handle routine tasks like sending reminders, generating newsletters, and assisting members with FAQs.',
      visual: '/images/feature-automation.svg',
      alt: 'AI automation tasks interface',
    },
    {
      title: 'Effortless Event Planning',
      description:
        'Create events, manage RSVPs, check in attendees with QR codes.',
      visual: '/images/feature-events.svg',
      alt: 'Event planning interface with QR codes',
    },
    {
      title: 'Data Driven Analytics',
      description: 'Make smarter decisions with predictive analytics.',
      visual: '/images/feature-membership.svg',
      alt: 'Analytics dashboard with charts',
    },
  ];

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 " ref={ref}>
      <div className="max-w-7xl mx-auto">
        {/* Features Tag */}
        <div className={`flex justify-center mb-6 transition-opacity duration-700 ${isInView ? 'animate-fade-in-down delay-100' : 'opacity-0'}`}>
          <div className="inline-flex items-center space-x-2 bg-[#f6fafb] border border-[#dff1f2] rounded-full px-4 py-2 hover-lift smooth-transition shadow-soft cursor-pointer">
            <Flame className="w-4 h-4 text-orange-500 animate-pulse-scale" />
            <span className="text-gray-700 text-sm font-medium">
              Our features
            </span>
          </div>
        </div>

        {/* Main Heading */}
        <div className={`text-center mb-4 transition-opacity duration-700 ${isInView ? 'animate-fade-in-up delay-200' : 'opacity-0'}`}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-black leading-tight">
            What You Can Do with CCPay
          </h2>
        </div>

        {/* Subheading */}
        <div className={`text-center mb-12 max-w-3xl mx-auto transition-opacity duration-700 ${isInView ? 'animate-fade-in delay-300' : 'opacity-0'}`}>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            Features tailored for your personal and career growth.
          </p>
        </div>

        {/* Features Grid */}
        <div className="space-y-8">
          {/* First Row - 3 equal cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.slice(0, 3).map((feature, index) => (
              <div
                key={index}
                className={`rounded-xl border-2 border-[#ffffff] p-6 hover-lift smooth-transition shadow-soft hover:shadow-elevated cursor-pointer transition-opacity duration-700 ${isInView ? `animate-fade-in-up delay-${400 + index * 100}` : 'opacity-0'}`}
                style={{
                  background:
                    'linear-gradient(to top, #FFFFFF 0%, #F5F5FFC9 79%, #F0F1FF00 100%)',
                }}
              >
                {/* Feature Visual */}
                <div className="mb-6">
                  <div className="h-48 flex items-center justify-center">
                    <Image
                      src={feature.visual}
                      alt={feature.alt}
                      width={300}
                      height={200}
                      className="w-full h-full object-contain hover-scale smooth-transition"
                    />
                  </div>
                </div>

                {/* Feature Content */}
                <div>
                  <h3 className="text-xl font-semibold text-black mb-3 leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Second Row - 1.5 + 0.75 + 0.75 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Wide card (4th feature) - 1.5 columns (2 out of 4) */}
            <div
              className={`lg:col-span-2 rounded-xl border-2 border-[#ffffff] p-6 hover-lift smooth-transition shadow-soft hover:shadow-elevated cursor-pointer transition-opacity duration-700 ${isInView ? 'animate-fade-in-up delay-700' : 'opacity-0'}`}
              style={{
                background:
                  'linear-gradient(to top, #FFFFFF 0%, #F5F5FFC9 79%, #F0F1FF00 100%)',
              }}
            >
              {/* Feature Visual */}
              <div className="mb-6">
                <div className="h-48 flex items-center justify-center">
                  <Image
                    src={features[3].visual}
                    alt={features[3].alt}
                    width={300}
                    height={200}
                    className="w-full h-full object-contain hover-scale smooth-transition"
                  />
                </div>
              </div>

              {/* Feature Content */}
              <div>
                <h3 className="text-xl font-semibold text-black mb-3 leading-tight">
                  {features[3].title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {features[3].description}
                </p>
              </div>
            </div>

            {/* Regular cards (5th and 6th features) - 0.75 columns each */}
            {features.slice(4, 6).map((feature, index) => (
              <div
                key={index + 4}
                className={`lg:col-span-1 rounded-xl border-2 border-[#ffffff] p-6 hover-lift smooth-transition shadow-soft hover:shadow-elevated cursor-pointer transition-opacity duration-700 ${isInView ? `animate-fade-in-up delay-${700 + (index + 1) * 100}` : 'opacity-0'}`}
                style={{
                  background:
                    'linear-gradient(to top, #FFFFFF 0%, #F5F5FFC9 79%, #F0F1FF00 100%)',
                }}
              >
                {/* Feature Visual */}
                <div className="mb-6">
                  <div className="h-48 flex items-center justify-center">
                    <Image
                      src={feature.visual}
                      alt={feature.alt}
                      width={300}
                      height={200}
                      className="w-full h-full object-contain hover-scale smooth-transition"
                    />
                  </div>
                </div>

                {/* Feature Content */}
                <div>
                  <h3 className="text-xl font-semibold text-black mb-3 leading-tight">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
