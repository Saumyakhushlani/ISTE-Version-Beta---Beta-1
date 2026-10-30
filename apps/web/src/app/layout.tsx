'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FlaskConical, 
  ArrowLeftRight, 
  CalendarClock, 
  ShieldAlert, 
  Lock,
  Sparkles,
  HardDrive
} from 'lucide-react';
import './globals.css';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/lab', label: 'Decision Lab', icon: FlaskConical },
  { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { href: '/recurring', label: 'Recurring', icon: CalendarClock },
  { href: '/anomalies', label: 'Anomalies', icon: ShieldAlert },
  { href: '/privacy', label: 'Privacy & Egress', icon: Lock },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <html lang="en">
      <head>
        <title>Financial Decision Lab | Can I afford this next month?</title>
        <meta name="description" content="A personal finance assistant that shows its work, proves every calculation, and enforces zero hallucinations." />
      </head>
      <body className="bg-slate-950 text-slate-100 flex flex-col min-h-screen selection:bg-emerald-500/30 selection:text-emerald-200">
        {/* Navigation Bar */}
        <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-bold text-base text-white tracking-tight flex items-center gap-2.5 group">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] group-hover:scale-110 transition-transform"></span>
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent font-extrabold text-lg">
                Financial Decision Lab
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800/90 text-white shadow-sm border border-slate-700/60 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 px-2.5 py-1 rounded-full font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Data Gate: OK
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-900 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-full font-mono text-[11px]">
              <Lock className="w-3 h-3 text-indigo-400" />
              Air-Gap: Enforced
            </span>
          </div>
        </header>

        {/* Main Workspace Surface */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-900/80 bg-slate-950/60 px-6 py-4 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              <span>Local-First SQLite (<code className="text-slate-300">fdl.db</code>)</span>
              <span>•</span>
              <span>Zero-Math LLM Guard Enabled</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Financial Decision Lab v1.0.0 • Deterministic Financial Mathematics
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
