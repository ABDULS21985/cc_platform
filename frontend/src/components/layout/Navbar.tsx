'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Menu, X } from 'lucide-react';
import { Button } from '../ui/button';

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="px-4 sm:px-6 lg:px-8 py-4 animate-fade-in-down">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center animate-fade-in-left">
            <Link href="/">
              <Image
                src="/images/main-logo.svg"
                alt="Community Core"
                width={120}
                height={32}
                className="h-8 w-auto hover-scale smooth-transition cursor-pointer"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 animate-fade-in delay-200">
            <Link
              href="/"
              className="text-[#1e1e1e] hover:text-[#0E9DA5] font-[600] smooth-transition relative group"
            >
              Home
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#0E9DA5] group-hover:w-full smooth-transition"></span>
            </Link>
            <Link
              href="#"
              className="text-[#1e1e1e] hover:text-[#0E9DA5] font-[600] smooth-transition relative group"
            >
              About us
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#0E9DA5] group-hover:w-full smooth-transition"></span>
            </Link>
            <div className="flex items-center space-x-1 group cursor-pointer">
              <a
                href="#"
                className="text-[#1e1e1e] hover:text-[#0E9DA5] font-[600] smooth-transition relative"
              >
                Features
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#0E9DA5] group-hover:w-full smooth-transition"></span>
              </a>
              <ChevronDown className="w-4 h-4 text-[#1e1e1e] group-hover:text-[#0E9DA5] group-hover:rotate-180 smooth-transition" />
            </div>
            <div className="flex items-center space-x-1 group cursor-pointer">
              <a
                href="#"
                className="text-[#1e1e1e] hover:text-[#0E9DA5] font-[600] smooth-transition relative"
              >
                FAQ
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#0E9DA5] group-hover:w-full smooth-transition"></span>
              </a>
              <ChevronDown className="w-4 h-4 text-[#1e1e1e] group-hover:text-[#0E9DA5] group-hover:rotate-180 smooth-transition" />
            </div>
          </div>

          {/* Desktop Action Buttons */}
          <div className="hidden md:flex items-center space-x-4 animate-fade-in-right delay-300">
            <Link
              href="/get-started"
              className="text-[#000000] hover:text-[#0E9DA5] font-[600] smooth-transition hover-scale"
            >
              Sign up
            </Link>
            <Link href="/get-started">
              <Button className="btn-primary shadow-soft hover-glow">
                Download app
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden btn-icon animate-fade-in-right"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-[#000000] animate-scale-in" />
            ) : (
              <Menu className="w-6 h-6 text-[#000000] animate-scale-in" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-gray-200 animate-fade-in-down">
            <div className="flex flex-col space-y-4">
              <Link
                href="/"
                className="text-[#000000] hover:text-[#0E9DA5] smooth-transition hover-scale inline-block animate-fade-in-left delay-100"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="#"
                className="text-[#000000] hover:text-[#0E9DA5] smooth-transition hover-scale inline-block animate-fade-in-left delay-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About us
              </Link>
              <div className="flex items-center space-x-1 animate-fade-in-left delay-300">
                <a
                  href="#"
                  className="text-[#000000] hover:text-[#0E9DA5] smooth-transition"
                >
                  Features
                </a>
                <ChevronDown className="w-4 h-4 text-[#000000]" />
              </div>
              <div className="flex items-center space-x-1 animate-fade-in-left delay-400">
                <a
                  href="#"
                  className="text-[#000000] hover:text-[#0E9DA5] smooth-transition"
                >
                  FAQ
                </a>
                <ChevronDown className="w-4 h-4 text-[#000000]" />
              </div>
              <div className="pt-4 space-y-2 animate-fade-in-up delay-500">
                <Link
                  href="/get-started"
                  className="w-full text-left text-[#000000] hover:text-[#0E9DA5] font-[600] smooth-transition hover-scale inline-block"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign up
                </Link>
                <Link href="/get-started" onClick={() => setIsMobileMenuOpen(false)} className="block w-full">
                  <Button className="btn-primary w-full shadow-soft hover-glow">
                    Download app
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
