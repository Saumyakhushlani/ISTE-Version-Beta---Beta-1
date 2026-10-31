'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  CreditCard, 
  Clock, 
  Scale, 
  FileText, 
  Settings, 
  Bell, 
  ChevronDown, 
  ArrowRight, 
  ShieldCheck, 
  Upload,
  User,
  LogOut,
  Building2
} from 'lucide-react';
import './globals.css';
import StatementUploadModal from '@/components/StatementUploadModal';
import { useAuthStore } from '@/lib/auth-store';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { user, isAuthenticated, isInitialized, checkAuth, logout } = useAuthStore();

  const isAuthPage = pathname === '/login' || pathname === '/register' || pathname === '/onboarding';

  useEffect(() => {
    checkAuth().then((authOk) => {
      if (!authOk && !isAuthPage) {
        router.push('/login');
      }
    });
  }, [checkAuth, isAuthPage, router]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinks = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Transactions', href: '/transactions', icon: CreditCard },
    { name: 'Recurring Payments', href: '/recurring', icon: Clock },
    { name: 'Decision Lab', href: '/lab', icon: Scale },
    { name: 'Reports', href: '/anomalies', icon: FileText },
    { name: 'Account & Profile', href: '/profile', icon: User },
    { name: 'Privacy & Security', href: '/privacy', icon: Settings },
  ];

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'AK';
  };

  const displayName = user?.profile?.full_name || user?.name || (user?.email ? user.email.split('@')[0] : 'Aarav Kumar');
  const userInitials = getInitials(displayName, user?.email);

  // If viewing login, registration, or onboarding pages, render clean container without sidebar
  if (isAuthPage) {
    return (
      <html lang="en">
        <head>
          <title>Financial Decision Lab | Personal Finance Assistant</title>
          <meta name="description" content="A personal finance assistant that shows its work and proves every calculation." />
        </head>
        <body className="bg-slate-900 text-slate-100 min-h-screen antialiased">
          {children}
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head>
        <title>Financial Decision Lab | Personal Finance Assistant</title>
        <meta name="description" content="A personal finance assistant that shows its work and proves every calculation." />
      </head>
      <body className="bg-slate-50 text-slate-900 flex h-screen overflow-hidden antialiased">
        {/* Left Sidebar */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 select-none z-20">
          <div>
            {/* Logo */}
            <div className="h-16 px-6 border-b border-slate-100 flex items-center gap-3">
              <div className="flex items-end gap-1 h-5">
                <span className="w-1.5 h-3 bg-blue-600 rounded-sm"></span>
                <span className="w-1.5 h-5 bg-blue-600 rounded-sm"></span>
                <span className="w-1.5 h-4 bg-blue-600 rounded-sm"></span>
              </div>
              <span className="font-bold text-slate-900 text-base tracking-tight">
                Financial Decision Lab
              </span>
            </div>

            {/* Navigation links */}
            <nav className="p-3 space-y-1 mt-2">
              {navLinks.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-blue-600 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebarActivePill"
                        className="absolute inset-0 bg-blue-50 rounded-lg -z-0"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span className="relative z-10">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Bottom: Upload Button & Data Health Mini-Card */}
          <div className="p-4 border-t border-slate-100 space-y-3">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Statement</span>
            </button>

            <Link 
              href="/privacy"
              className="block bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl p-3.5 transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Data Health</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">96%</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden my-2">
                <motion.div 
                  className="h-full bg-emerald-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: '96%' }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[11px] text-slate-500">Transactions categorized</p>
            </Link>
          </div>
        </aside>

        {/* Right Application Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Header */}
          <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 select-none z-10">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">Overview</span>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-bold text-slate-800">
                {pathname === '/' ? 'Dashboard' : pathname.replace('/', '').toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Statement Upload Button */}
              <button
                onClick={() => setIsUploadOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold shadow-xs transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Statement</span>
              </button>

              {/* Data Ready Badge */}
              <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-3">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <div>
                  <p className="text-xs font-semibold text-slate-800 leading-none">Data Ready</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Live Reconciled</p>
                </div>
              </div>

              {/* Bell Icon */}
              <button 
                title="Notifications"
                className="p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition relative"
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 bg-rose-500 rounded-full absolute top-1.5 right-1.5"></span>
              </button>

              {/* User Avatar with Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 pl-2 border-l border-slate-200 hover:opacity-80 transition cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200">
                    {userInitials}
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-slate-800 leading-tight">{displayName}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-30"
                  >
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900">{displayName}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email || 'user@example.com'}</p>
                    </div>

                    <Link
                      href="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Profile & Settings</span>
                    </Link>

                    <Link
                      href="/onboarding"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Onboarding Wizard</span>
                    </Link>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </header>

          {/* Main Scrollable Viewport */}
          <main className="flex-1 overflow-y-auto bg-slate-50">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="h-full"
            >
              {children}
            </motion.div>
          </main>
        </div>

        {/* Global Statement Upload Modal */}
        <StatementUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      </body>
    </html>
  );
}
