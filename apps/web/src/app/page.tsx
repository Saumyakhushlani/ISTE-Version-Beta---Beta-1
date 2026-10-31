'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Wallet, 
  CheckCircle2, 
  TrendingUp, 
  Cpu, 
  Lock, 
  FileCheck, 
  AlertOctagon, 
  Building2, 
  ChevronRight, 
  Search, 
  Bell, 
  CreditCard, 
  Clock, 
  Scale, 
  Settings, 
  LayoutDashboard, 
  UploadCloud, 
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import InkOrbitFeatures from '@/components/ui/ink-orbit-features';
import EnterpriseAIPipeline from '@/components/ui/ai-agent-pipeline';
import FinancialPipelineBeam from '@/components/ui/financial-pipeline-beam';
import Integrations from '@/components/ui/integrations-4';
import { FeatureCard, type FeatureType } from '@/components/ui/grid-feature-cards';

const FDL_PILLARS: FeatureType[] = [
  {
    title: '100% Local-First & Air-Gapped',
    icon: Lock,
    badge: 'CORE USP · PRIVACY',
    description:
      'Runs completely offline on your local device. Statements, transactions, and balances remain strictly in your local SQLite database (fdl.db). Zero cloud transmission, zero telemetry, absolute data privacy.',
  },
  {
    title: 'Deterministic Integer Paise Math',
    icon: Cpu,
    badge: '0 FLOAT DRIFT',
    description:
      'All calculations are executed in integer paise (1 INR = 100 Paise). The LLM is completely isolated from computing balances, safety buffers, or affordability verdicts.',
  },
  {
    title: '5,000 Monte Carlo Simulations',
    icon: TrendingUp,
    badge: 'SEED=42',
    description:
      'Simulates 5,000 daily spend trajectories under random shocks to establish reproducible P10 (conservative), P50 (median), and P90 headroom probability percentiles.',
  },
  {
    title: 'Dynamic Volatility Buffer',
    icon: ShieldCheck,
    badge: 'ADAPTIVE',
    description:
      'Measures income volatility via Coefficient of Variation. Freelancers with irregular credits automatically receive an elevated safety reserve multiplier (up to 2.0x essentials).',
  },
  {
    title: '8-Step Reasoning Ledger',
    icon: Layers,
    badge: 'AUDITABLE',
    description:
      'Every verdict produces an immutable mathematical audit trail linking starting balance, expected cash flows, recurring obligations, safety buffers, and final headroom.',
  },
  {
    title: 'Number-Verification Guard',
    icon: FileCheck,
    badge: 'ANTI-HALLUCINATION',
    description:
      'When generating natural English narration, a strict regex guard validates every numerical figure cited against the Reasoning Ledger. Any unverified figure defaults to template math.',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.45, ease: 'easeOut' } 
  },
};

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 flex flex-col justify-between overflow-x-hidden font-sans">
      {/* ========================================================
          1. NAVIGATION BAR
      ======================================================== */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/90 backdrop-blur-md transition-colors">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex items-end gap-1 h-5">
              <span className="w-1.5 h-3 bg-primary rounded-sm shadow-sm" />
              <span className="w-1.5 h-5 bg-primary rounded-sm shadow-sm" />
              <span className="w-1.5 h-4 bg-primary rounded-sm shadow-sm" />
            </div>
            <span className="font-bold text-foreground text-lg tracking-tight">
              Financial Decision Lab
            </span>
          </Link>

          {/* Centered Navigation Links */}
          <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#overview" className="hover:text-foreground transition-colors">
              Getting started
            </a>
            <a href="#pipeline" className="hover:text-foreground transition-colors">
              Live Pipeline
            </a>
            <a href="#data-cleaning" className="hover:text-foreground transition-colors">
              Data Cleaning
            </a>
            <a href="#integrations" className="hover:text-foreground transition-colors">
              Supported Banks
            </a>
            <a href="#engine-flow" className="hover:text-foreground transition-colors">
              Engine Flow
            </a>
            <a href="#pillars" className="hover:text-foreground transition-colors">
              Pillars &amp; Math
            </a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How It Works
            </a>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy &amp; Security
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.08)] active:scale-95 flex items-center gap-1.5 border border-neutral-800 dark:border-white/20"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
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

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-border bg-background/95 backdrop-blur-md px-6 py-4 space-y-3">
            <a
              href="#overview"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Getting started
            </a>
            <a
              href="#pipeline"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Live Pipeline
            </a>
            <a
              href="#data-cleaning"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Data Cleaning
            </a>
            <a
              href="#integrations"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Supported Banks
            </a>
            <a
              href="#engine-flow"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Engine Flow
            </a>
            <a
              href="#pillars"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Pillars &amp; Math
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
                className="w-full text-center py-2 text-sm font-medium text-foreground border border-border rounded-lg bg-card"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-lg shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ========================================================
            2. HERO SECTION WITH CLEAN SHADOWS & DASHBOARD MOCKUP
        ======================================================== */}
        <section id="overview" className="relative flex flex-col items-center justify-start pt-14 pb-24 px-4 sm:px-6 lg:px-8">
          {/* Top Pill Announcement Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-border/80 transition-colors"
          >
            <span>Deterministic Math Engine 2.0 is live!</span>
            <Link
              href="#pillars"
              className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
            >
              Read more
              <ArrowRight size={12} />
            </Link>
          </motion.div>

          {/* Master Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-center max-w-4xl px-4 leading-[1.12] tracking-tight text-foreground"
          >
            Can I afford this next month? <br className="hidden sm:inline" />
            <span className="text-foreground">Proven step-by-step.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base text-center max-w-2xl px-6 mt-6 mb-10 text-muted-foreground leading-relaxed"
          >
            The personal finance assistant that shows its work and proves every calculation.
            Zero LLM hallucinations, 5,000 Monte Carlo runs, and dynamic safety buffers.
          </motion.p>

          {/* CTA Action Buttons (Refined shadows & borders in light/dark mode) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center gap-3.5 relative z-10 mb-14"
          >
            <Link
              href="/login"
              className="px-7 py-3 rounded-lg text-sm font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.14)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-neutral-800 dark:border-white/20"
            >
              Get started
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-lg text-sm font-semibold bg-card border border-border text-foreground hover:bg-muted shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-sm transition-all"
            >
              Live Demo
            </Link>
          </motion.div>

          {/* ========================================================
              DASHBOARD PREVIEW MOCKUP WITH REFINED AMBIENT ELEVATION
          ======================================================== */}
          <div className="w-full max-w-6xl relative mt-2">
            {/* Dark mode horizon glow / Light mode clean ambient line */}
            <div
              className="absolute left-1/2 -top-6 -translate-x-1/2 w-[80%] h-32 rounded-full blur-3xl opacity-0 dark:opacity-30 pointer-events-none z-0"
              style={{
                background: 'radial-gradient(ellipse at center, var(--ring) 0%, var(--primary) 40%, transparent 75%)',
              }}
              aria-hidden="true"
            />
            {/* Subtle Horizon line accent */}
            <div 
              className="absolute -top-[1px] left-1/2 -translate-x-1/2 w-3/4 h-[1px] z-20 pointer-events-none bg-gradient-to-r from-transparent via-primary/40 dark:via-primary/80 to-transparent" 
              aria-hidden="true"
            />

            {/* Dashboard Container Box */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.35 }}
              className="relative z-10 rounded-2xl border border-border bg-card text-card-foreground shadow-[0_12px_36px_-10px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.03)] dark:shadow-[0_25px_65px_-15px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row min-h-[580px]">
                {/* ----------------- Mini-Sidebar ----------------- */}
                <div className="w-full lg:w-56 bg-sidebar border-r border-sidebar-border p-4 flex flex-col justify-between shrink-0">
                  <div className="space-y-6">
                    {/* Brand */}
                    <div className="flex items-center gap-2.5 px-2 py-1">
                      <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      </div>
                      <span className="text-sm font-bold text-foreground tracking-tight">
                        FDL Studio
                      </span>
                    </div>

                    {/* Nav Items */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-sidebar-accent text-foreground font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <LayoutDashboard className="w-4 h-4 text-primary" />
                        <span>Dashboard</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar-foreground hover:text-foreground transition-colors cursor-pointer">
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload CSV</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar-foreground hover:text-foreground transition-colors cursor-pointer">
                        <CreditCard className="w-4 h-4" />
                        <span>Transactions</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar-foreground hover:text-foreground transition-colors cursor-pointer">
                        <Clock className="w-4 h-4" />
                        <span>Recurring</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar-foreground hover:text-foreground transition-colors cursor-pointer">
                        <Scale className="w-4 h-4" />
                        <span>Decision Lab</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar-foreground hover:text-foreground transition-colors cursor-pointer">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom User Pill */}
                  <div className="pt-4 border-t border-sidebar-border flex items-center gap-2.5 px-2">
                    <div className="w-8 h-8 rounded-full bg-primary/25 border border-primary/40 text-foreground font-bold text-xs flex items-center justify-center">
                      AK
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">Aarav Kumar</p>
                      <p className="text-[10px] text-muted-foreground truncate">Salaried Engineer</p>
                    </div>
                  </div>
                </div>

                {/* ----------------- Main Dashboard Body ----------------- */}
                <div className="flex-1 p-5 sm:p-6 space-y-5 bg-background">
                  {/* Top Bar inside mockup */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Dashboard</h3>
                      <p className="text-xs text-muted-foreground">
                        Welcome back, Aarav! Here&apos;s your verified cash-flow headroom.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
                        <input
                          type="text"
                          readOnly
                          placeholder="Search transactions..."
                          className="bg-card border border-border text-xs rounded-lg pl-8 pr-3 py-1.5 w-44 text-muted-foreground focus:outline-none shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                        />
                      </div>
                      <div className="p-2 rounded-lg border border-border bg-card relative shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                        <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="w-1.5 h-1.5 bg-primary rounded-full absolute top-1.5 right-1.5" />
                      </div>
                    </div>
                  </div>

                  {/* 4 Metric KPI Cards with clean subtle shadow */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Card 1 */}
                    <div className="bg-card border border-border rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Total Liquid Funds</span>
                        <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                          <Wallet className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xl font-bold font-mono text-foreground">₹1,85,000</p>
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          +12% from last month
                        </p>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-card border border-border rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Affordability Headroom</span>
                        <div className="w-7 h-7 rounded-lg bg-chart-1/15 text-chart-1 flex items-center justify-center">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xl font-bold font-mono text-foreground">+₹42,000</p>
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          P50 Median verified
                        </p>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-card border border-border rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Safety Buffer</span>
                        <div className="w-7 h-7 rounded-lg bg-chart-4/15 text-chart-4 flex items-center justify-center">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xl font-bold font-mono text-foreground">₹58,000</p>
                        <p className="text-[10px] font-semibold text-muted-foreground mt-0.5">
                          Floor + Essentials × 1.2k
                        </p>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-card border border-border rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Data Gate Status</span>
                        <div className="w-7 h-7 rounded-lg bg-chart-2/15 text-chart-2 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xl font-bold font-mono text-foreground">100%</p>
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          4/4 Checks passed
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Area Chart + Donut Chart */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                    {/* Left: 90-Day Cash Flow Forecast Area Chart */}
                    <div className="lg:col-span-7 bg-card border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">Revenue &amp; Cash-Flow Trajectory</h4>
                          <p className="text-[11px] text-muted-foreground">5,000 Monte Carlo paths vs Buffer Floor</p>
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground border border-border px-2 py-0.5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                          Last 6 months
                        </span>
                      </div>

                      {/* SVG Line & Area Graphic */}
                      <div className="w-full h-40 pt-2 relative">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--ring)" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="var(--ring)" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="0" y1="20" x2="400" y2="20" stroke="var(--border)" strokeDasharray="3 3" opacity="0.6" />
                          <line x1="0" y1="60" x2="400" y2="60" stroke="var(--border)" strokeDasharray="3 3" opacity="0.6" />
                          <line x1="0" y1="100" x2="400" y2="100" stroke="var(--border)" strokeDasharray="3 3" opacity="0.6" />

                          {/* Emergency Buffer Floor Line */}
                          <line x1="0" y1="90" x2="400" y2="90" stroke="var(--destructive)" strokeWidth="1.5" strokeDasharray="4 4" />

                          {/* Shaded Area under Curve */}
                          <path
                            d="M 0,75 Q 70,55 130,62 T 260,40 T 400,20 L 400,120 L 0,120 Z"
                            fill="url(#chartGradient)"
                          />

                          {/* Trajectory Main Line */}
                          <path
                            d="M 0,75 Q 70,55 130,62 T 260,40 T 400,20"
                            fill="none"
                            stroke="var(--ring)"
                            strokeWidth="2.5"
                          />

                          {/* Glowing Data Dots */}
                          <circle cx="0" cy="75" r="3" fill="var(--foreground)" />
                          <circle cx="80" cy="58" r="3" fill="var(--foreground)" />
                          <circle cx="160" cy="62" r="3" fill="var(--foreground)" />
                          <circle cx="240" cy="45" r="3" fill="var(--foreground)" />
                          <circle cx="320" cy="32" r="3" fill="var(--foreground)" />
                          <circle cx="400" cy="20" r="4" fill="var(--ring)" stroke="var(--card)" strokeWidth="2" />
                        </svg>

                        {/* Chart Footnote Labels */}
                        <div className="flex justify-between text-[9px] text-muted-foreground mt-2 px-1">
                          <span>Jan</span>
                          <span>Feb</span>
                          <span>Mar</span>
                          <span>Apr</span>
                          <span>May</span>
                          <span>Jun</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Spend & Headroom Donut Breakdown */}
                    <div className="lg:col-span-5 bg-card border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold text-foreground">Allocation Pipeline</h4>
                        <span className="text-[10px] text-muted-foreground">View All</span>
                      </div>

                      <div className="flex items-center justify-center py-2">
                        {/* Segmented Ring Graphic */}
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            {/* Segment 1: Fixed Obligations (45%) */}
                            <circle
                              cx="18"
                              cy="18"
                              r="14"
                              fill="none"
                              stroke="var(--ring)"
                              strokeWidth="4.5"
                              strokeDasharray="45 55"
                              strokeDashoffset="0"
                            />
                            {/* Segment 2: Variable Spend (25%) */}
                            <circle
                              cx="18"
                              cy="18"
                              r="14"
                              fill="none"
                              stroke="var(--chart-4)"
                              strokeWidth="4.5"
                              strokeDasharray="25 75"
                              strokeDashoffset="-45"
                            />
                            {/* Segment 3: Safety Buffer (20%) */}
                            <circle
                              cx="18"
                              cy="18"
                              r="14"
                              fill="none"
                              stroke="var(--destructive)"
                              strokeWidth="4.5"
                              strokeDasharray="20 80"
                              strokeDashoffset="-70"
                            />
                            {/* Segment 4: Headroom (10%) */}
                            <circle
                              cx="18"
                              cy="18"
                              r="14"
                              fill="none"
                              stroke="var(--chart-2)"
                              strokeWidth="4.5"
                              strokeDasharray="10 90"
                              strokeDashoffset="-90"
                            />
                          </svg>
                          <div className="absolute text-center">
                            <span className="text-xs font-bold font-mono text-foreground leading-none block">₹1.85L</span>
                            <span className="text-[8px] text-muted-foreground leading-none">Net Total</span>
                          </div>
                        </div>
                      </div>

                      {/* Legend Items */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-border">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-ring" />
                          <span className="text-muted-foreground">Fixed: 45.0%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-chart-4" />
                          <span className="text-muted-foreground">Variable: 25.0%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-destructive" />
                          <span className="text-muted-foreground">Buffer: 20.0%</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-chart-2" />
                          <span className="text-muted-foreground">Headroom: 10.0%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Upcoming Debits & Audited Verifications */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                    {/* Left: Scheduled Obligations */}
                    <div className="bg-card border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-foreground">Upcoming Scheduled Debits</h4>
                        <span className="text-[10px] text-muted-foreground">View All</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/80">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                              SIP
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">Zerodha Mutual Fund SIP</p>
                              <p className="text-[10px] text-muted-foreground">Due 5th of next month</p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-foreground">₹25,000</span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/80">
                          <div className="flex items-center gap-2.5">
                            <div className="w-6 h-6 rounded-md bg-chart-2/20 text-chart-2 flex items-center justify-center font-bold text-[10px]">
                              RENT
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">Apartment Rental Transfer</p>
                              <p className="text-[10px] text-muted-foreground">Due 1st of next month</p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-foreground">₹32,000</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Audited Ledger Verifications */}
                    <div className="bg-card border border-border rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-foreground">Recent Ledger Verifications</h4>
                        <span className="text-[10px] text-muted-foreground">View All</span>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/80">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <div>
                              <p className="font-semibold text-foreground">Query: iPhone 16 (₹80,000 next month)</p>
                              <p className="text-[10px] text-muted-foreground">Verdict: AFFORDABLE · Ledger Verified</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            Passed
                          </span>
                        </div>

                        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/80">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <div>
                              <p className="font-semibold text-foreground">Query: Goa Trip (₹35,000 this month)</p>
                              <p className="text-[10px] text-muted-foreground">Verdict: AFFORDABLE · Headroom +₹42k</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            Passed
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ========================================================
            2.5 - 2.8 UNIFIED END-TO-END FINANCIAL DECISION PIPELINE
        ======================================================== */}
        <div className="relative w-full bg-background overflow-hidden border-t border-border/60">
          {/* Subtle ambient background glow spanning the entire pipeline */}
          <div 
            className="absolute left-1/2 top-1/3 -translate-x-1/2 w-[850px] h-[850px] rounded-full blur-[160px] opacity-10 dark:opacity-20 pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(59,130,246,0.08) 50%, transparent 80%)'
            }}
          />

          {/* Continuous vertical pipeline connecting spine in the background */}
          <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-[1px] bg-gradient-to-b from-transparent via-border to-transparent pointer-events-none opacity-40" />

          {/* Stage 1: Universal Bank & Statement Ingestion */}
          <section id="integrations" className="relative z-10 pt-20 pb-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-3 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                STAGE 01 ? UNIVERSAL STATEMENT INGESTION
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Connect your accounts without sharing credentials.
              </h2>
              <p className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
                Parse statement PDFs and CSVs offline from every major Indian bank and UPI provider. Zero third-party aggregation APIs, zero cloud data egress.
              </p>
            </div>
            <Integrations />
          </section>

          {/* Visual Connecting Stream from Stage 1 -> Stage 2 */}
          <div className="relative z-10 flex flex-col items-center justify-center my-6">
            <div className="w-[1.5px] h-10 bg-gradient-to-b from-border via-emerald-500/60 to-border" />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/90 backdrop-blur-md text-[10px] font-mono font-semibold text-muted-foreground my-2 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>RAW DATA STREAMS INTO RECONCILIATION GATE</span>
            </div>
            <div className="w-[1.5px] h-10 bg-gradient-to-b from-border via-emerald-500/60 to-border" />
          </div>

          {/* Stage 2: Normalization, Deduplication & Sufficiency Gate */}
          <section id="data-cleaning" className="relative z-10 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-3 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                STAGE 02 ? NORMALIZATION &amp; RECONCILIATION
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Sanitize UPI noise, pair transfers, and prove balance integrity.
              </h2>
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
                Cleans chaotic merchant strings, pairs internal inter-account transfers to avoid double-counting, and strictly verifies Opening + ∑Tx = Closing (Δ = 0 paise).
              </p>
            </div>
            <FinancialPipelineBeam />
          </section>

          {/* Visual Connecting Stream from Stage 2 -> Stage 3 */}
          <div className="relative z-10 flex flex-col items-center justify-center my-6">
            <div className="w-[1.5px] h-10 bg-gradient-to-b from-border via-emerald-500/60 to-border" />
            <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/90 backdrop-blur-md text-[10px] font-mono font-semibold text-muted-foreground my-2 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>VERIFIED CASH FLOW STREAMS INTO DETERMINISTIC CORE</span>
            </div>
            <div className="w-[1.5px] h-10 bg-gradient-to-b from-border via-emerald-500/60 to-border" />
          </div>

          {/* Stage 3: Deterministic Monte Carlo Simulation & Reasoning Ledger */}
          <section id="engine-flow" className="relative z-10 pt-10 pb-20 px-4 sm:px-6 lg:px-8">
            <InkOrbitFeatures theme="auto" />
          </section>
        </div>

        {/* ========================================================
            3. WHY FINANCIAL DECISION LAB (6 CORE ARCHITECTURE PILLARS)
        ======================================================== */}
        <section id="pillars" className="py-24 px-6 sm:px-8 lg:px-12 max-w-6xl mx-auto border-t border-border">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-2">
              Why Financial Decision Lab?
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Six architectural pillars built for zero error tolerance.
            </h3>
            <p className="text-sm text-muted-foreground mt-3">
              Financial decisions shouldn&apos;t rely on probabilistic LLM guesswork. Every metric in FDL is strictly grounded in deterministic code.
            </p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 divide-x divide-y divide-dashed border border-dashed border-border rounded-2xl overflow-hidden bg-card/25 sm:grid-cols-2 md:grid-cols-3 shadow-sm"
          >
            {FDL_PILLARS.map((feature, i) => (
              <FeatureCard key={i} feature={feature} />
            ))}
          </motion.div>

        </section>

        {/* ========================================================
            4. HOW THE PLATFORM WORKS (3-STEP JOURNEY & CORE EQUATIONS)
        ======================================================== */}
        <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/60 bg-gradient-to-b from-background via-card/10 to-background">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400 font-medium mb-3 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                THE PLATFORM FLOW · CORE EQUATIONS
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                From statement to decision in 3 simple steps.
              </h3>
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
                Clean separation of ingestion, verification, and decision reporting — powered by 100% deterministic mathematical formulas. Zero LLM math calculations.
              </p>
            </div>

            {/* 3 Step Cards - Balanced High-Tech Design */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
              
              {/* Step 1: Login & Ingestion */}
              <div className="bg-card border border-border/80 hover:border-emerald-500/40 rounded-2xl p-6 relative flex flex-col justify-between shadow-xs transition-all duration-300 group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono flex items-center justify-center border border-emerald-500/20">
                      01
                    </span>
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      AIR-GAPPED · 0 EGRESS
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4 text-emerald-500" />
                    Statement Ingestion &amp; Dedup
                  </h4>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed min-h-[36px]">
                    Parse statement PDFs and CSVs locally. Cryptographically hashes rows and pairs internal transfers to eliminate duplicate expenses.
                  </p>

                  {/* Terminal Code Console */}
                  <div className="mt-5 rounded-xl border border-border/80 bg-slate-950 p-3.5 text-slate-100 font-mono shadow-inner text-left">
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                        <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                        <span className="ml-1 text-slate-300 font-semibold">engine/dedupe.py</span>
                      </div>
                      <span className="text-emerald-400 font-bold">100% Local</span>
                    </div>

                    <div className="space-y-2 text-[11px] leading-relaxed">
                      <div>
                        <span className="text-slate-500">// SHA-256 Idempotent Hash</span>
                        <div className="text-emerald-400 font-bold">
                          fp = sha256(acc_id + date + paise + desc)
                        </div>
                      </div>
                      <div className="pt-1 border-t border-slate-800/80">
                        <span className="text-slate-500">// Internal Transfer Pairing (±₹25 fee)</span>
                        <div className="text-sky-300 font-bold">
                          pair = sgn(T₁) ≠ sgn(T₂) &amp;&amp; |Δt| ≤ 2d
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Parameter Pills */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Fee: ±₹25 (2,500p)
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Window: ≤ 2 Days
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                      Cloud Egress = 0
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border mt-5 text-xs text-muted-foreground flex items-center justify-between">
                  <Link href="/login" className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 hover:underline">
                    Go to Login <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <span className="text-[10px] font-mono text-muted-foreground">Local fdl.db</span>
                </div>
              </div>

              {/* Step 2: Reconciliation Gate */}
              <div className="bg-card border border-border/80 hover:border-emerald-500/40 rounded-2xl p-6 relative flex flex-col justify-between shadow-xs transition-all duration-300 group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono flex items-center justify-center border border-emerald-500/20">
                      02
                    </span>
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      RECONCILIATION · Δ = 0
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Balance Gate &amp; Sufficiency
                  </h4>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed min-h-[36px]">
                    Strict mathematical verification before running calculations. Enforces exact balance anchors and checks 90-day history continuity.
                  </p>

                  {/* Terminal Code Console */}
                  <div className="mt-5 rounded-xl border border-border/80 bg-slate-950 p-3.5 text-slate-100 font-mono shadow-inner text-left ring-1 ring-emerald-500/20">
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                        <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                        <span className="ml-1 text-slate-300 font-semibold">engine/sufficiency.py</span>
                      </div>
                      <span className="text-emerald-400 font-bold">Δ = 0 Paise</span>
                    </div>

                    <div className="space-y-2 text-[11px] leading-relaxed">
                      <div>
                        <span className="text-slate-500">// Exact Balance Anchor Assertion</span>
                        <div className="text-emerald-400 font-bold">
                          Δ = (Opening + ∑ Tx) - Closing == 0
                        </div>
                      </div>
                      <div className="pt-1 border-t border-slate-800/80">
                        <span className="text-slate-500">// 4-Point Data Sufficiency Gate</span>
                        <div className="text-amber-400 font-bold">
                          assert days ≥ 90 &amp;&amp; gap ≤ 7d &amp;&amp; income ≥ 2
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Parameter Pills */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      History: ≥ 90 Days
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Max Gap: ≤ 7 Days
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                      Outlier Z ≤ 3.5 MAD
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border mt-5 text-xs text-muted-foreground flex items-center justify-between">
                  <Link href="/upload" className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 hover:underline">
                    Upload &amp; Reconcile <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <span className="text-[10px] font-mono text-muted-foreground">0 Float Drift</span>
                </div>
              </div>

              {/* Step 3: Analysis & Decision Lab */}
              <div className="bg-card border border-border/80 hover:border-emerald-500/40 rounded-2xl p-6 relative flex flex-col justify-between shadow-xs transition-all duration-300 group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs font-mono flex items-center justify-center border border-emerald-500/20">
                      03
                    </span>
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      SEED 42 · P10/P50/P90
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Monte Carlo Decision Lab
                  </h4>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed min-h-[36px]">
                    Simulate 5,000 cash-flow paths under random shocks. Computes adaptive safety buffers and proves headroom in an 8-step audit ledger.
                  </p>

                  {/* Terminal Code Console */}
                  <div className="mt-5 rounded-xl border border-border/80 bg-slate-950 p-3.5 text-slate-100 font-mono shadow-inner text-left">
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800 text-[10px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500/80" />
                        <span className="w-2 h-2 rounded-full bg-amber-500/80" />
                        <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                        <span className="ml-1 text-slate-300 font-semibold">engine/affordability.py</span>
                      </div>
                      <span className="text-purple-400 font-bold">5,000 Paths</span>
                    </div>

                    <div className="space-y-2 text-[11px] leading-relaxed">
                      <div>
                        <span className="text-slate-500">// Cash-Flow Evolution (Horizon: 90d)</span>
                        <div className="text-sky-300 font-bold">
                          B(t) = B(t-1) + Income(t) - Commit(t) - Var(t)
                        </div>
                      </div>
                      <div className="pt-1 border-t border-slate-800/80">
                        <span className="text-slate-500">// Headroom Formula (P10 Conservative)</span>
                        <div className="text-emerald-400 font-bold">
                          Headroom_10 = B_min(P10) - Buffer - Price
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Key Parameter Pills */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Floor: ₹5,000
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      Buffer k: 1.0x - 2.0x
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold">
                      Regex Number Guard
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border mt-5 text-xs text-muted-foreground flex items-center justify-between">
                  <Link href="/lab" className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 hover:underline">
                    Open Decision Lab <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <span className="text-[10px] font-mono text-muted-foreground">8-Step Proof</span>
                </div>
              </div>

            </div>

            {/* Platform Mathematical Domain Invariants Strip */}
            <div className="mt-12 p-5 sm:p-6 rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-foreground font-mono uppercase tracking-wider">
                    Domain Invariants &amp; Threshold Reference (Appendix B)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Enforced deterministically in Python engine &amp; TypeScript contracts
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-2.5 rounded-xl bg-background/70 border border-border/60">
                  <div className="text-[9.5px] font-mono text-muted-foreground">MIN_HISTORY</div>
                  <div className="text-xs font-bold text-foreground font-mono mt-0.5">≥ 90 Days</div>
                  <div className="text-[9px] text-emerald-500 font-mono mt-0.5">Full Confidence</div>
                </div>
                <div className="p-2.5 rounded-xl bg-background/70 border border-border/60">
                  <div className="text-[9.5px] font-mono text-muted-foreground">MAX_GAP_DAYS</div>
                  <div className="text-xs font-bold text-foreground font-mono mt-0.5">≤ 7 Days</div>
                  <div className="text-[9px] text-emerald-500 font-mono mt-0.5">Continuity Bound</div>
                </div>
                <div className="p-2.5 rounded-xl bg-background/70 border border-border/60">
                  <div className="text-[9.5px] font-mono text-muted-foreground">MONTE_CARLO</div>
                  <div className="text-xs font-bold text-foreground font-mono mt-0.5">5,000 Runs</div>
                  <div className="text-[9px] text-emerald-500 font-mono mt-0.5">Seed = 42</div>
                </div>
                <div className="p-2.5 rounded-xl bg-background/70 border border-border/60">
                  <div className="text-[9.5px] font-mono text-muted-foreground">BUFFER_FLOOR</div>
                  <div className="text-xs font-bold text-foreground font-mono mt-0.5">₹5,000.00</div>
                  <div className="text-[9px] text-emerald-500 font-mono mt-0.5">500,000 Paise</div>
                </div>
                <div className="p-2.5 rounded-xl bg-background/70 border border-border/60">
                  <div className="text-[9.5px] font-mono text-muted-foreground">OUTLIER_MOD_Z</div>
                  <div className="text-xs font-bold text-foreground font-mono mt-0.5">&gt; 3.5 MAD</div>
                  <div className="text-[9px] text-emerald-500 font-mono mt-0.5">Spike Filter</div>
                </div>
                <div className="p-2.5 rounded-xl bg-background/70 border border-border/60">
                  <div className="text-[9.5px] font-mono text-muted-foreground">TRANSFER_TOL</div>
                  <div className="text-xs font-bold text-foreground font-mono mt-0.5">±₹25.00</div>
                  <div className="text-[9px] text-emerald-500 font-mono mt-0.5">2,500 Paise Fee</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            5. BOTTOM CALL TO ACTION
        ======================================================== */}
        <section className="py-20 px-6 sm:px-8 border-t border-border text-center bg-card">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-3xl font-extrabold tracking-tight text-foreground">
              Ready to know exactly what you can afford?
            </h3>
            <p className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto">
              Experience personal finance intelligence that never hallucinates and shows its work step-by-step.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 font-semibold text-sm hover:opacity-90 transition-all shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-95 border border-neutral-800 dark:border-white/20"
              >
                Sign In &amp; Upload Statement
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border text-foreground font-semibold text-sm hover:bg-muted transition-all shadow-[0_1px_3px_rgba(0,0,0,0.03)]"
              >
                Explore Live Demo
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================
          6. FOOTER
      ======================================================== */}
      <footer className="border-t border-border py-8 px-6 bg-background text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Financial Decision Lab</span>
            <span>—</span>
            <span>Deterministic Financial Math &amp; Reasoning Ledger</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy &amp; Air-Gap Audit</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Login</Link>
            <Link href="/dashboard" className="hover:text-foreground transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
