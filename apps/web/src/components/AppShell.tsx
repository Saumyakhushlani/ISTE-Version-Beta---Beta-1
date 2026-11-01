'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  UploadCloud,
  CreditCard, 
  Clock, 
  Scale, 
  Calculator,
  FileText, 
  Settings, 
  ChevronDown, 
  User,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  TrendingUp,
  Target,
  X
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import StatementUploadModal from '@/components/StatementUploadModal';
import { useAuthStore } from '@/lib/auth-store';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { user, checkAuth, logout } = useAuthStore();

  // Load persisted collapse state
  useEffect(() => {
    try {
      const saved = localStorage.getItem('fdl_sidebar_collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    } catch {}
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('fdl_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const isPublicPage =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/how-it-works' ||
    pathname === '/privacy';

  useEffect(() => {
    checkAuth().then((authOk) => {
      if (!authOk && !isPublicPage) {
        router.push('/login');
      }
    });
  }, [checkAuth, isPublicPage, router]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Goals Planner', href: '/goals', icon: Target },
    { name: 'Decision Lab', href: '/lab', icon: Scale },
    { name: 'Investments', href: '/investments', icon: TrendingUp },
    { name: 'Upload Statement', href: '/upload', icon: UploadCloud },
    { name: 'Transactions', href: '/transactions', icon: CreditCard },
    { name: 'Recurring Payments', href: '/recurring', icon: Clock },
    { name: 'Tax Intelligence', href: '/tax', icon: Calculator },
    { name: 'Reports & Anomalies', href: '/anomalies', icon: FileText },
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

  if (isPublicPage) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground overflow-y-auto">
        {children}
      </div>
    );
  }

  const currentSection = navLinks.find(l => l.href === pathname)?.name || 'Dashboard';

  return (
    <div className="flex h-screen overflow-hidden w-full bg-background text-foreground antialiased font-sans">
      {/* Desktop Sidebar */}
      <aside 
        className={`hidden md:flex flex-col justify-between shrink-0 select-none z-20 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div>
          {/* Logo Header (Clean - single collapse toggle resides in top header) */}
          <div className={`h-16 border-b border-sidebar-border flex items-center transition-all duration-300 ${
            isCollapsed ? 'justify-center px-2' : 'px-5'
          }`}>
            <Link 
              href="/dashboard" 
              className="flex items-center gap-3 overflow-hidden"
              title="Financial Decision Lab"
            >
              <div className="flex items-end gap-1 h-5 shrink-0">
                <span className="w-1.5 h-3 bg-primary rounded-sm shadow-sm" />
                <span className="w-1.5 h-5 bg-primary rounded-sm shadow-sm" />
                <span className="w-1.5 h-4 bg-primary rounded-sm shadow-sm" />
              </div>
              {!isCollapsed && (
                <span className="font-bold text-foreground text-base tracking-tight truncate whitespace-nowrap">
                  Financial Decision Lab
                </span>
              )}
            </Link>
          </div>

          {/* Navigation links */}
          <nav className="p-3 space-y-1.5">
            {navLinks.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={isCollapsed ? item.name : undefined}
                  className={`group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
                    isCollapsed 
                      ? 'w-10 h-10 p-0 justify-center mx-auto' 
                      : 'px-3.5 py-2.5 gap-3'
                  } ${
                    isActive
                      ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-emerald-400 font-semibold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                  }`}
                >
                  {/* Left accent bar indicator when active in expanded mode */}
                  {isActive && !isCollapsed && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary dark:bg-emerald-400 rounded-r-full" />
                  )}
                  <Icon 
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive 
                        ? 'text-primary dark:text-emerald-400' 
                        : 'text-muted-foreground group-hover:text-foreground'
                    }`} 
                  />
                  {!isCollapsed && (
                    <span className="truncate whitespace-nowrap">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile Drawer (Overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-xs"
            />

            {/* Drawer Content */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full flex flex-col justify-between z-10 shadow-xl"
            >
              <div>
                <div className="h-16 px-6 border-b border-sidebar-border flex items-center justify-between">
                  <Link href="/dashboard" className="flex items-center gap-3">
                    <div className="flex items-end gap-1 h-5">
                      <span className="w-1.5 h-3 bg-primary rounded-sm shadow-sm" />
                      <span className="w-1.5 h-5 bg-primary rounded-sm shadow-sm" />
                      <span className="w-1.5 h-4 bg-primary rounded-sm shadow-sm" />
                    </div>
                    <span className="font-bold text-foreground text-base tracking-tight">
                      Financial Decision Lab
                    </span>
                  </Link>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="p-3 space-y-1.5">
                  {navLinks.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-primary/10 dark:bg-primary/20 text-primary dark:text-emerald-400 font-semibold shadow-xs'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                        }`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary dark:bg-emerald-400 rounded-r-full" />
                        )}
                        <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-primary dark:text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'}`} />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Right Application Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-card border-b border-border px-4 sm:px-6 flex items-center justify-between shrink-0 select-none z-10">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 md:hidden text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Sidebar Collapse Toggle Button (Single Toggle) */}
            <button
              type="button"
              onClick={toggleSidebar}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden md:flex items-center justify-center p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline">Overview</span>
              <span className="text-muted-foreground/40 hidden sm:inline">/</span>
              <span className="text-sm font-bold text-foreground">
                {currentSection}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Data Ready Badge */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <p className="text-xs font-semibold text-foreground leading-none">Data Ready</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">Live Reconciled</p>
              </div>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Avatar with Dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 pl-2 border-l border-border hover:opacity-80 transition cursor-pointer"
              >
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center border border-primary/30">
                  {userInitials}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-foreground leading-tight">{displayName}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg py-1.5 z-30"
                >
                  <div className="px-3.5 py-2 border-b border-border">
                    <p className="text-xs font-bold text-foreground">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email || 'user@example.com'}</p>
                  </div>

                  <Link
                    href="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition"
                  >
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Profile & Settings</span>
                  </Link>

                  <div className="my-1 border-t border-border" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition text-left cursor-pointer"
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

      {/* Global Statement Upload Modal */}
      <StatementUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
}
