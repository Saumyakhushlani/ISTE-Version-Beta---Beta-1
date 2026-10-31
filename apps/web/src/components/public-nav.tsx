'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';

export function PublicNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex items-end gap-1 h-5">
            <span className="w-1.5 h-3 bg-primary rounded-sm shadow-sm" />
            <span className="w-1.5 h-5 bg-primary rounded-sm shadow-sm" />
            <span className="w-1.5 h-4 bg-primary rounded-sm shadow-sm" />
          </div>
          <span className="font-bold text-foreground text-base tracking-tight">
            Financial Decision Lab
          </span>
        </Link>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-muted-foreground">
          <a href="#overview" className="hover:text-foreground transition-colors">
            Overview
          </a>
          <a href="#pillars" className="hover:text-foreground transition-colors">
            Core Pillars
          </a>
          <a href="#how-it-works" className="hover:text-foreground transition-colors">
            How It Works
          </a>
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Data Security
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="hidden sm:flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted rounded-lg border border-border transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex items-center gap-1.5 transition-all active:scale-95 border border-neutral-800 dark:border-white/20"
          >
            Launch Demo
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-foreground rounded-lg border border-border bg-card"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-border bg-background/95 backdrop-blur-md px-6 py-4 space-y-3">
          <a
            href="#overview"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-foreground py-1"
          >
            Overview
          </a>
          <a
            href="#pillars"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-foreground py-1"
          >
            Core Pillars
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-foreground py-1"
          >
            How It Works
          </a>
          <div className="pt-2 border-t border-border flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 text-xs font-semibold text-foreground border border-border rounded-lg bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2 text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg"
            >
              Launch Demo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
