'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Menu, 
  X, 
  ChevronDown, 
  ArrowRight, 
  LogOut, 
  Sparkles, 
  Cpu, 
  FileSpreadsheet, 
  Calculator, 
  ShieldCheck,
  LayoutDashboard
} from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { useAuthStore } from '@/lib/auth-store';

interface PublicNavProps {
  activeItem?: 'home' | 'how-it-works' | 'privacy';
}

const HOW_IT_WORKS_LINKS = [
  {
    title: 'How It Works Overview',
    href: '/how-it-works',
    description: 'High-level architectural walkthrough and system design',
    icon: Sparkles,
  },
  {
    title: 'Architecture & Pipeline',
    href: '/how-it-works#pipeline-architecture',
    description: 'Multi-stage deterministic engine & local SQLite storage',
    icon: Cpu,
  },
  {
    title: 'Data Cleaning & Ingestion',
    href: '/how-it-works#data-cleaning',
    description: 'UPI, NEFT/IMPS normalization and merchant categorization',
    icon: FileSpreadsheet,
  },
  {
    title: 'Formulas & Math Engine',
    href: '/how-it-works#equations',
    description: 'Monte Carlo simulations, Dynamic Volatility Buffer & Headroom',
    icon: Calculator,
  },
  {
    title: 'Engineering Invariants',
    href: '/how-it-works#domain-invariants',
    description: 'Integer paise only, signed amounts & anti-hallucination rules',
    icon: ShieldCheck,
  },
];

export function PublicNav({ activeItem }: PublicNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [mobileHowItWorksOpen, setMobileHowItWorksOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isAuthenticated, isInitialized, checkAuth, logout } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Handle clicking outside the desktop dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setHowItWorksOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setHowItWorksOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setHowItWorksOpen(false);
    }, 150);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/90 backdrop-blur-md transition-colors">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex items-end gap-1 h-5">
            <span className="w-1.5 h-3 bg-primary rounded-sm shadow-sm transition-transform group-hover:scale-y-110" />
            <span className="w-1.5 h-5 bg-primary rounded-sm shadow-sm transition-transform group-hover:scale-y-110" />
            <span className="w-1.5 h-4 bg-primary rounded-sm shadow-sm transition-transform group-hover:scale-y-110" />
          </div>
          <span className="font-bold text-foreground text-base sm:text-lg tracking-tight whitespace-nowrap">
            Financial Decision Lab
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 text-sm font-medium text-muted-foreground shrink-0">
          <Link 
            href="/#how-it-helps" 
            className="hover:text-foreground transition-colors whitespace-nowrap"
          >
            Features
          </Link>

          {/* How It Works Dropdown */}
          <div 
            ref={dropdownRef}
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <button
              type="button"
              onClick={() => setHowItWorksOpen(!howItWorksOpen)}
              className={`flex items-center gap-1.5 hover:text-foreground transition-colors whitespace-nowrap py-1 ${
                activeItem === 'how-it-works' || howItWorksOpen ? 'text-foreground font-semibold' : ''
              }`}
              aria-expanded={howItWorksOpen}
            >
              <span>How It Works</span>
              <ChevronDown 
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  howItWorksOpen ? 'rotate-180 text-foreground' : 'text-muted-foreground'
                }`} 
              />
            </button>

            {/* Dropdown Menu Popover */}
            {howItWorksOpen && (
              <div 
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-84 sm:w-96 p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-2xl z-50 text-foreground animate-in fade-in zoom-in-95 duration-150 before:content-[''] before:absolute before:-top-3 before:left-0 before:right-0 before:h-3"
              >
                <div className="px-3 py-2 border-b border-border/60 mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    System Architecture &amp; Engines
                  </span>
                  <Link 
                    href="/how-it-works"
                    onClick={() => setHowItWorksOpen(false)}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    View All <ArrowRight className="w-2.5 h-2.5" />
                  </Link>
                </div>
                <div className="space-y-1">
                  {HOW_IT_WORKS_LINKS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setHowItWorksOpen(false)}
                        className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors group"
                      >
                        <div className="p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0 mt-0.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Link 
            href="/privacy" 
            className={`hover:text-foreground transition-colors whitespace-nowrap ${
              activeItem === 'privacy' ? 'text-foreground font-semibold' : ''
            }`}
          >
            Privacy &amp; Security
          </Link>

          <Link 
            href="/#faq" 
            className="hover:text-foreground transition-colors whitespace-nowrap"
          >
            FAQ
          </Link>
        </div>

        {/* Action Buttons (Right) */}
        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <ThemeToggle />

          {/* Conditional Auth Rendering */}
          {isAuthenticated ? (
            <>
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors shadow-xs flex items-center gap-1.5 whitespace-nowrap"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
                Dashboard
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-all shadow-xs active:scale-95 flex items-center gap-1.5 whitespace-nowrap border border-neutral-800 dark:border-white/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 transition-colors whitespace-nowrap"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-all shadow-xs active:scale-95 flex items-center gap-1.5 whitespace-nowrap border border-neutral-800 dark:border-white/20"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile / Tablet Menu Button */}
        <div className="flex lg:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-foreground rounded-lg border border-border bg-card"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 py-4 space-y-3 z-50 shadow-xl">
          <Link
            href="/#how-it-helps"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-foreground py-1"
          >
            Features
          </Link>

          {/* Mobile Accordion for How It Works */}
          <div>
            <button
              type="button"
              onClick={() => setMobileHowItWorksOpen(!mobileHowItWorksOpen)}
              className="flex items-center justify-between w-full text-sm font-medium text-foreground py-1"
            >
              <span>How It Works</span>
              <ChevronDown 
                className={`w-4 h-4 transition-transform ${
                  mobileHowItWorksOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {mobileHowItWorksOpen && (
              <div className="pl-3 mt-1.5 space-y-2 border-l-2 border-primary/30">
                {HOW_IT_WORKS_LINKS.map((sublink) => (
                  <Link
                    key={sublink.href}
                    href={sublink.href}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setMobileHowItWorksOpen(false);
                    }}
                    className="block text-xs text-muted-foreground hover:text-foreground py-1"
                  >
                    {sublink.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/privacy"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-foreground py-1"
          >
            Privacy &amp; Security
          </Link>

          <Link
            href="/#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-medium text-foreground py-1"
          >
            FAQ
          </Link>

          {/* Mobile Auth Buttons */}
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-foreground border border-border rounded-lg bg-card flex items-center justify-center gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-center py-2 text-sm font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg shadow-sm flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-foreground border border-border rounded-lg bg-card"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg shadow-sm"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
