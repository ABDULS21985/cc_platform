'use client';

import { Lightbulb, Building2, Club, GraduationCap } from 'lucide-react';
import { useInView } from '@/hooks/useInView';

export default function TargetAudience() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const audienceGroups = [
    {
      icon: Lightbulb,
      title: 'Founders & Leaders',
      description: 'Easily manage teams, funds, and events in one place',
    },
    {
      icon: Building2,
      title: 'Institutions & NGOs',
      description: 'Institutions and NGO’s aiming to streamline operations.',
    },
    {
      icon: Club,
      title: 'Clubs & Associations',
      description: 'Focused on secure communication and financial growth',
    },
    {
      icon: GraduationCap,
      title: 'Students & Unions',
      description: 'Organizing events, collecting dues, and driving engagement',
    },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#f5f5f6]" ref={ref}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className={`text-center mb-16 transition-opacity duration-700 ${isInView ? 'animate-fade-in-down' : 'opacity-0'}`}>
          <div className="inline-flex items-center space-x-2 bg-white rounded-full px-4 py-1 mb-6 shadow-sm">
            <span className="text-orange-500">🔥</span>
            <span className="text-sm font-medium text-gray-800">who can use ccpay</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight max-w-4xl mx-auto">
            Designed for <span className="text-[#009ca6]">communities</span> of all kinds from student
            groups to professional associations
          </h2>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {audienceGroups.map((group, index) => (
            <div
              key={index}
              className={`bg-white rounded-2xl p-8 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${isInView ? `animate-fade-in-up delay-${index * 100}` : 'opacity-0'}`}
            >
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-6">
                <group.icon className="w-6 h-6 text-gray-900" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {group.title}
              </h3>
              <p className="text-gray-500">
                {group.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
