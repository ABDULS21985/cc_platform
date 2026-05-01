'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { useInView } from '@/hooks/useInView';

export default function FAQ() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'Is CCPay free to use?',
      answer: 'CCPay offers both free and premium plans. Our basic plan is free for small communities, while our premium plans offer advanced features for larger organizations. View our pricing page for more details.'
    },
    {
      question: 'How secure is my data?',
      answer: 'Security is our top priority. We use bank-grade encryption (AES-256), strictly adhere to GDPR & PCI DSS compliance, and employ multi-factor authentication to ensure your community\'s data and funds are always safe.'
    },
    {
        question: 'Can I manage multiple communities?',
        answer: 'Yes! You can create and manage multiple communities under a single account. Switch between them easily and keep your finances and members organized separately.'
    },
    {
      question: 'How do I withdraw my funds?',
      answer: 'Withdrawals are simple. You can link your bank account or mobile money wallet and transfer funds instantly. We support major banks and payment providers.'
    },
     {
      question: 'Do you offer support for student associations?',
      answer: 'Absolutely. We have specialized tools for student unions and associations, including dues collection, event ticketing, and member directories.'
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white" ref={ref}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className={`text-center mb-16 transition-opacity duration-700 ${isInView ? 'animate-fade-in-down' : 'opacity-0'}`}>
          <div className="inline-flex items-center space-x-2 bg-gray-50 rounded-full px-4 py-1 mb-6 border border-gray-100">
            <span className="text-[#009ca6]">?</span>
            <span className="text-sm font-medium text-gray-800">FAQ's</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-black leading-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-500 text-lg">
            Everything you need to know about CCPay.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index} 
              className={`border border-gray-200 rounded-2xl overflow-hidden transition-all duration-500 ${isInView ? `animate-fade-in-up delay-${index * 100}` : 'opacity-0'}`}
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none bg-white hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg font-semibold text-gray-900">{faq.question}</span>
                <span className={`p-2 rounded-full ${openIndex === index ? 'bg-[#009ca6] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {openIndex === index ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </span>
              </button>
              
              <div 
                className={`transition-all duration-300 ease-in-out ${openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="p-6 pt-0 text-gray-600 leading-relaxed bg-white">
                  {faq.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
