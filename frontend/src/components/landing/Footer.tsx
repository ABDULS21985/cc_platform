'use client';

import { Instagram, MessagesSquare } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0b1215] text-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand Column */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full border-2 border-[#009ca6] flex items-center justify-center text-[#009ca6] font-bold text-xl">
              C
            </div>
            <span className="text-xl font-semibold">Community circle pay</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            CCPay is an all-in-one platform for community management, combining secure authentication, messaging, payments, AI analytics, and event planning to streamline engagement and operations.
          </p>
          <div className="flex space-x-4">
            <Link href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
              <Instagram className="w-5 h-5 text-black" />
            </Link>
            <Link href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
              {/* X / Twitter Icon */}
              <svg className="w-5 h-5 text-black" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </Link>
            <Link href="#" className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors">
              <MessagesSquare className="w-5 h-5 text-black" />
            </Link>
          </div>
        </div>

        {/* Navigate Column */}
        <div>
          <h3 className="text-lg font-semibold mb-6">Navigate</h3>
          <ul className="space-y-4">
            {['Home', 'Community', 'Be an ambassador', 'About us'].map((item) => (
              <li key={item}>
                <Link href="#" className="text-gray-400 hover:text-[#009ca6] transition-colors">
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Resources Column */}
        <div>
          <h3 className="text-lg font-semibold mb-6">Resources</h3>
          <ul className="space-y-4">
            {['FAQ\'s', 'Support', 'Blog', 'Privacy policy'].map((item) => (
              <li key={item}>
                <Link href="#" className="text-gray-400 hover:text-[#009ca6] transition-colors">
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Us Column */}
        <div>
          <h3 className="text-lg font-semibold mb-6">Contact Us</h3>
          <ul className="space-y-4">
            <li>
              <Link href="mailto:supportccpay@gmail.com" className="text-gray-400 hover:text-[#009ca6] transition-colors break-words">
                supportccpay@gmail.com
              </Link>
            </li>
            <li>
              <Link href="#" className="text-gray-400 hover:text-[#009ca6] transition-colors">
                Whatsapp
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
