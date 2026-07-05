'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="fixed w-full top-0 z-50 bg-white border-b border-slate-200 shadow-md">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 group"
            onClick={closeMenu}
          >
            <Image
              src="/assets/svg/clarivex_logo_white.svg"
              alt="Clarivex Logo"
              width={300}
              height={90}
              priority
              style={{ width: "180px", height: "auto" }}
              className="group-hover:shadow-lg group-hover:shadow-powder-500/50 transition-all"
            />
      
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="px-3 py-2 text-dark-blue hover:text-powder-600 transition-colors font-medium"
            >
              Home 
            </Link>
          <p>&nbsp;&nbsp;|&nbsp;&nbsp;</p>
            <Link
              href="/solutions"
              className="px-3 py-2 text-dark-blue hover:text-powder-600 transition-colors font-medium"
            >
              Solutions
            </Link>
                <p>&nbsp;&nbsp;|&nbsp;&nbsp;</p>
            <Link
              href="/contact"
              className="px-3 py-2 text-dark-blue hover:text-powder-600 transition-colors font-medium"
            >
              Contact
            </Link>
            <p>&nbsp;&nbsp;|&nbsp;&nbsp;</p>
            <Link
              href="/timesheet"
              className="px-3 py-2 text-dark-blue hover:text-powder-600 transition-colors font-medium"
            >
              Timesheet
            </Link>
            <p>&nbsp;&nbsp;|&nbsp;&nbsp;</p>
            <Link
              href="/trip-planner"
              className="px-3 py-2 text-dark-blue hover:text-powder-600 transition-colors font-medium"
            >
              Trip Planner
            </Link>
            <p>&nbsp;&nbsp;|&nbsp;&nbsp;</p>
            <Link
              href="/language"
              className="px-3 py-2 text-dark-blue hover:text-powder-600 transition-colors font-medium"
            >
              Language
            </Link>
            <p>&nbsp;&nbsp;|&nbsp;&nbsp;</p>
            <Link
              href="/financial-analysis"
              className="px-3 py-2 text-dark-blue hover:text-powder-600 transition-colors font-medium"
            >
              Financial Analysis
            </Link>
            <p>&nbsp;&nbsp;|&nbsp;&nbsp;</p>
            <Link
              href="/weight"
              className="px-3 py-2 text-dark-blue hover:text-powder-600 transition-colors font-medium"
            >
              Weight
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-dark-blue hover:text-powder-600 focus:outline-none transition-colors"
            aria-expanded="false"
          >
            <svg
              className={`h-6 w-6 transition-transform ${isOpen ? 'rotate-90' : ''}`}
              stroke="currentColor"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-slate-50 border-t border-slate-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-dark-blue hover:text-powder-600 hover:bg-slate-100 transition-colors"
              onClick={closeMenu}
            >
              Home
            </Link>
            <Link
              href="/solutions"
              className="block px-3 py-2 rounded-md text-base font-medium text-dark-blue hover:text-powder-600 hover:bg-slate-100 transition-colors"
              onClick={closeMenu}
            >
              Solutions
            </Link>
            <Link
              href="/contact"
              className="block px-3 py-2 rounded-md text-base font-medium bg-gradient-to-r from-powder-500 to-powder-600 text-white hover:shadow-lg transition-all"
              onClick={closeMenu}
            >
              Contact
            </Link>
            <Link
              href="/timesheet"
              className="block px-3 py-2 rounded-md text-base font-medium text-dark-blue hover:text-powder-600 hover:bg-slate-100 transition-colors"
              onClick={closeMenu}
            >
              Timesheet
            </Link>
            <Link
              href="/trip-planner"
              className="block px-3 py-2 rounded-md text-base font-medium text-dark-blue hover:text-powder-600 hover:bg-slate-100 transition-colors"
              onClick={closeMenu}
            >
              Trip Planner
            </Link>
            <Link
              href="/language"
              className="block px-3 py-2 rounded-md text-base font-medium text-dark-blue hover:text-powder-600 hover:bg-slate-100 transition-colors"
              onClick={closeMenu}
            >
              Language
            </Link>
            <Link
              href="/financial-analysis"
              className="block px-3 py-2 rounded-md text-base font-medium text-dark-blue hover:text-powder-600 hover:bg-slate-100 transition-colors"
              onClick={closeMenu}
            >
              Financial Analysis
            </Link>
            <Link
              href="/weight"
              className="block px-3 py-2 rounded-md text-base font-medium text-dark-blue hover:text-powder-600 hover:bg-slate-100 transition-colors"
              onClick={closeMenu}
            >
              Weight
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
