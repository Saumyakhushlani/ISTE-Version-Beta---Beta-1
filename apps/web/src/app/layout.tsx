'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ShieldCheck
} from 'lucide-react';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navLinks = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Transactions', href: '/transactions', icon: CreditCard },
    { name: 'Recurring Payments', href: '/recurring', icon: Clock },
    { name: 'Decision Lab', href: '/lab', icon: Scale },
    { name: 'Reports', href: '/anomalies', icon: FileText },
    { name: 'Account & Settings', href: '/privacy', icon: Settings },
  ];

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

          {/* Sidebar Bottom: Data Health Mini-Card */}
          <div className="p-4 border-t border-slate-100">
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
              <span className="text-sm font-bold text-slate-800">Dashboard</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Account Filter */}
              <div className="relative">
                <select className="appearance-none bg-white border border-slate-200 text-xs font-medium text-slate-700 pl-3 pr-8 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm">
                  <option value="all">All Accounts</option>
                  <option value="hdfc">HDFC Bank (•••• 4821)</option>
                  <option value="sbi">SBI Savings (•••• 4421)</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              {/* Time Range Filter */}
              <div className="relative">
                <select className="appearance-none bg-white border border-slate-200 text-xs font-medium text-slate-700 pl-3 pr-8 py-1.5 rounded-lg focus:outline-none focus:border-blue-500 cursor-pointer shadow-sm">
                  <option value="6m">Last 6 Months</option>
                  <option value="3m">Last 3 Months</option>
                  <option value="1y">Past 1 Year</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>

              {/* Data Ready Badge */}
              <div className="hidden sm:flex items-center gap-2 border-l border-slate-200 pl-4">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <div>
                  <p className="text-xs font-semibold text-slate-800 leading-none">Data Ready</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-none">Last updated: 30 Oct 2024, 10:45 AM</p>
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

              {/* User Avatar */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center">
                  AK
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">Aarav Kumar</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
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
      </body>
    </html>
  );
}
