'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="fixed w-full top-0 z-50 bg-primary-dark border-b border-powder-500 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-2 group"
            onClick={closeMenu}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-powder-400 to-powder-600 rounded-lg flex items-center justify-center font-bold text-primary-dark text-lg group-hover:shadow-lg group-hover:shadow-powder-500/50 transition-all">
              C
            </div>
            <span className="hidden sm:block text-xl font-bold bg-gradient-to-r from-powder-400 to-powder-300 bg-clip-text text-transparent">
              Clarivex
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className="text-slate-200 hover:text-powder-400 transition-colors font-medium"
            >
              Home
            </Link>
            <Link
              href="/solutions"
              className="text-slate-200 hover:text-powder-400 transition-colors font-medium"
            >
              Solutions
            </Link>
            <Link
              href="/contact"
              className="px-6 py-2 bg-gradient-to-r from-powder-400 to-powder-500 text-primary-dark font-bold rounded-lg hover:shadow-lg hover:shadow-powder-400/50 transition-all"
            >
              Contact
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-powder-400 hover:text-powder-300 focus:outline-none transition-colors"
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
        <div className="md:hidden bg-secondary-dark border-t border-powder-500">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              href="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-powder-400 hover:bg-tertiary-dark transition-colors"
              onClick={closeMenu}
            >
              Home
            </Link>
            <Link
              href="/solutions"
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-200 hover:text-powder-400 hover:bg-tertiary-dark transition-colors"
              onClick={closeMenu}
            >
              Solutions
            </Link>
            <Link
              href="/contact"
              className="block px-3 py-2 rounded-md text-base font-medium bg-gradient-to-r from-powder-400 to-powder-500 text-primary-dark hover:shadow-lg transition-all"
              onClick={closeMenu}
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
