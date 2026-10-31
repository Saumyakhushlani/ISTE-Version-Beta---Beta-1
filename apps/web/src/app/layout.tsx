'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Outfit } from 'next/font/google';
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
  Sun,
  Moon,
  UploadCloud
} from 'lucide-react';
import { ThemeProvider, useTheme } from '@/components/theme-context';
import './globals.css';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();

  // Public standalone pages without side panel or internal app headers
  const isPublicPage = pathname === '/' || pathname === '/login';

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Upload Statement', href: '/upload', icon: UploadCloud },
    { name: 'Transactions', href: '/transactions', icon: CreditCard },
    { name: 'Recurring Payments', href: '/recurring', icon: Clock },
    { name: 'Decision Lab', href: '/lab', icon: Scale },
    { name: 'Reports & Anomalies', href: '/anomalies', icon: FileText },
    { name: 'Account & Settings', href: '/privacy', icon: Settings },
  ];

  if (isPublicPage) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground overflow-y-auto">
        {children}
      </div>
    );
  }

  // Determine current page section name
  const currentSection = navLinks.find(l => l.href === pathname)?.name || 'Dashboard';

  return (
    <div className="flex h-screen overflow-hidden w-full bg-background text-foreground antialiased font-sans">
      {/* Left Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col justify-between shrink-0 select-none z-20">
        <div>
          {/* Logo */}
          <Link href="/dashboard" className="h-16 px-6 border-b border-sidebar-border flex items-center gap-3">
            <div className="flex items-end gap-1 h-5">
              <span className="w-1.5 h-3 bg-primary rounded-sm shadow-sm" />
              <span className="w-1.5 h-5 bg-primary rounded-sm shadow-sm" />
              <span className="w-1.5 h-4 bg-primary rounded-sm shadow-sm" />
            </div>
            <span className="font-bold text-foreground text-base tracking-tight">
              Financial Decision Lab
            </span>
          </Link>

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
                      ? 'text-foreground font-semibold'
                      : 'text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActivePill"
                      className="absolute inset-0 bg-primary/20 dark:bg-primary/25 border-l-2 border-primary rounded-lg -z-0"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className={`w-4 h-4 relative z-10 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="relative z-10">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom: Data Health Mini-Card */}
        <div className="p-4 border-t border-sidebar-border">
          <Link 
            href="/privacy"
            className="block bg-card hover:bg-sidebar-accent border border-sidebar-border rounded-xl p-3.5 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Data Health</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-foreground">96%</span>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden my-2">
              <motion.div 
                className="h-full bg-primary rounded-full"
                initial={{ width: 0 }}
                animate={{ width: '96%' }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Transactions categorized</p>
          </Link>
        </div>
      </aside>

      {/* Right Application Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between shrink-0 select-none z-10">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">Overview</span>
            <span className="text-border">/</span>
            <span className="text-sm font-bold text-foreground">{currentSection}</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Account Filter */}
            <div className="relative">
              <select className="appearance-none bg-card border border-border text-xs font-medium text-foreground pl-3 pr-8 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm">
                <option value="all">All Accounts</option>
                <option value="hdfc">HDFC Bank (•••• 4821)</option>
                <option value="sbi">SBI Savings (•••• 4421)</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Time Range Filter */}
            <div className="relative">
              <select className="appearance-none bg-card border border-border text-xs font-medium text-foreground pl-3 pr-8 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer shadow-sm">
                <option value="6m">Last 6 Months</option>
                <option value="3m">Last 3 Months</option>
                <option value="1y">Past 1 Year</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-2.5 pointer-events-none" />
            </div>

            {/* Data Ready Badge */}
            <div className="hidden sm:flex items-center gap-2 border-l border-border pl-4">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <div>
                <p className="text-xs font-semibold text-foreground leading-none">Data Ready</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Statement Synced</p>
              </div>
            </div>

            {/* Theme Toggle (Light / Dark) */}
            <button 
              onClick={toggleTheme}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition relative border border-border"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-foreground" />
              )}
            </button>

            {/* Bell Icon */}
            <button 
              title="Notifications"
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition relative"
            >
              <Bell className="w-4 h-4" />
              <span className="w-2 h-2 bg-destructive rounded-full absolute top-1.5 right-1.5" />
            </button>

            {/* User Avatar */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-border">
              <div className="w-8 h-8 rounded-full bg-muted text-foreground font-semibold text-xs flex items-center justify-center border border-border">
                AK
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-foreground leading-tight">Aarav Kumar</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
          </div>
        </header>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto bg-background text-foreground">
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
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <head>
        <title>Financial Decision Lab | Personal Finance Assistant</title>
        <meta name="description" content="A personal finance assistant that shows its work and proves every calculation." />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased font-sans">
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
