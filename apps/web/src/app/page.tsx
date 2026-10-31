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
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { FaqSection } from '@/components/ui/faq-section';
import { FooterSection } from '@/components/ui/footer-section';
import SplitText from '@/components/ui/split-text';
import Integrations from '@/components/ui/integrations-4';
import FinancialPipelineBeam from '@/components/ui/financial-pipeline-beam';
import RuixenBentoCards from '@/components/ui/ruixen-bento-cards';
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
    badge: 'SEED-42',
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

const FDL_FAQS = [
  {
    question: "How is Financial Decision Lab different from a regular budgeting app or ChatGPT?",
    answer: "Unlike generic AI chat tools that guess or make up numbers, Financial Decision Lab works like a real financial advisor. It calculates your exact balances, bills, and safety buffers using proven math — showing you the clear reasoning behind every recommendation so you never have to guess.",
  },
  {
    question: "Is my personal banking data and statement safe and private?",
    answer: "Yes, 100%. Your bank statements and financial transactions stay completely on your own device. We never sell your data, upload your financial statements to external clouds, or track your personal finances.",
  },
  {
    question: "How does the app know if I can afford a big purchase?",
    answer: "Whenever you ask about a purchase (like buying a laptop or planning a vacation), the app looks at your real bank balance, upcoming bills (like rent, EMIs, and investments), and typical daily spending. It reserves an emergency safety cushion and tells you clearly whether it's safe to buy, tight, or better to wait.",
  },
  {
    question: "Which banks and payment apps are supported?",
    answer: "You can upload statements from all major Indian banks including HDFC, SBI, ICICI, Axis, Kotak, and more, as well as digital records from Google Pay, PhonePe, and Paytm. Both standard PDF statements and CSV files work seamlessly.",
  },
  {
    question: "What if my monthly income is unpredictable or I'm a freelancer?",
    answer: "The app is designed for both salaried professionals and freelancers with irregular income. When earnings fluctuate, it automatically suggests a larger safety cushion so you are always prepared for slower months.",
  },
  {
    question: "Why does the app ask for at least 3 months of bank history?",
    answer: "A single month doesn't show your full financial picture — like quarterly bills, annual renewals, or seasonal spending. Having 3 months of statements helps the advisor give you truly accurate, trustworthy financial guidance.",
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
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Logo */}
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

          {/* Centered Navigation Links */}
          <div className="hidden lg:flex items-center justify-center gap-7 text-sm font-medium text-muted-foreground shrink-0">
            <a href="#how-it-helps" className="hover:text-foreground transition-colors whitespace-nowrap">
              Features
            </a>
            <Link href="/how-it-works" className="hover:text-foreground transition-colors whitespace-nowrap">
              How It Works
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors whitespace-nowrap">
              Privacy &amp; Security
            </Link>
            <a href="#faq" className="hover:text-foreground transition-colors whitespace-nowrap">
              FAQ
            </a>
          </div>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 transition-colors whitespace-nowrap"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-all shadow-xs active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile / Tablet Menu Button (shown on < lg screens) */}
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

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-border bg-background/95 backdrop-blur-md px-6 py-4 space-y-3">
            <a
              href="#how-it-helps"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Features
            </a>
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              How It Works
            </Link>
            <Link
              href="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Privacy &amp; Security
            </Link>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              FAQ
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

      <main className="flex-1 relative overflow-hidden">
        {/* Continuous Ambient Background Glow for unified canvas */}
        <div className="ambient-canvas-glow pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute top-[50%] left-1/3 -translate-x-1/2 w-[600px] h-[450px] rounded-full bg-emerald-500/5 blur-[140px]" />
          <div className="absolute top-[75%] right-1/4 w-[500px] h-[400px] rounded-full bg-primary/4 blur-[130px]" />
        </div>
        {/* ========================================================
            2. HERO SECTION WITH CLEAN SHADOWS & DASHBOARD MOCKUP
        ======================================================== */}
        <section id="overview" className="relative z-10 w-full overflow-hidden">
          <ContainerScroll
            titleComponent={
              <div className="flex flex-col items-center">
                {/* Top Pill Announcement Badge */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border bg-card text-xs text-muted-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-border/80 transition-colors"
                >
                  <span>Deterministic Math Engine 2.0 is live!</span>
                  <Link
                    href="/how-it-works"
                    className="flex items-center gap-1 font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    Read more
                    <ArrowRight size={12} />
                  </Link>
                </motion.div>

                {/* Master Headline with SplitText Animation */}
                <div className="max-w-5xl px-4 text-center">
                  <SplitText
                    tag="h1"
                    text="Your Complete Financial Advisor."
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] xl:text-6xl font-extrabold text-center leading-[1.15] tracking-tight text-foreground block sm:whitespace-nowrap"
                    effect="rise"
                    splitType="chars"
                    delay={30}
                    duration={0.8}
                    trigger="load"
                    hoverEffect="lift"
                    textAlign="center"
                  />
                  <div className="mt-1 sm:mt-2">
                    <SplitText
                      tag="span"
                      text="Proven Step-by-Step."
                      className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.4rem] xl:text-6xl font-extrabold text-center text-primary leading-[1.15] tracking-tight block sm:whitespace-nowrap"
                      effect="blur"
                      splitType="chars"
                      delay={35}
                      duration={0.9}
                      trigger="load"
                      hoverEffect="lift"
                      textAlign="center"
                    />
                  </div>
                </div>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="text-sm sm:text-base text-center max-w-2xl px-6 mt-3 mb-6 text-muted-foreground leading-relaxed"
                >
                  The intelligent financial advisor that proves every calculation and shows its work.
                  Plan cash flows, detect anomalies, track recurring bills, and make confident purchase decisions—backed by 100% verifiable math.
                </motion.p>

                {/* CTA Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex items-center gap-3.5 relative z-10 mb-6 sm:mb-8"
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
              </div>
            }
          >
            <div className="h-full w-full overflow-hidden select-none">
              <div className="flex flex-col lg:flex-row min-h-[580px]">

                {/* ----------------- Mini-Sidebar ----------------- */}

                <div className="w-full lg:w-52 bg-sidebar border-r border-sidebar-border p-3.5 flex flex-col justify-between shrink-0">

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

                      <div className="w-full h-28 pt-1 relative">

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
            </div>
          </ContainerScroll>
        </section>

        {/* ========================================================
            2.3 SIMPLE CUSTOMER VALUE BENTO GRID (HOW IT HELPS)
        ======================================================== */}
        <RuixenBentoCards />

        {/* ========================================================
            2.4 AUTOMATED TRANSACTION NORMALIZATION PIPELINE BEAM
        ======================================================== */}
        <section id="pipeline" className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-6xl mx-auto space-y-12">
            <div className="text-center max-w-3xl mx-auto">
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2 font-mono">
                DATA CLEANING &amp; STREAM PIPELINE
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Automated Transaction Normalization &amp; Transfer Pairing
              </h2>
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
                Watch how noisy Indian UPI descriptions, internal account transfers, and statement discrepancies are parsed, cleaned, and reconciled.
              </p>
            </div>

            <div className="w-full">
              <FinancialPipelineBeam />
            </div>
          </div>
        </section>

        {/* ========================================================
            2.5 UNIVERSAL BANK & PAYMENT INGESTION
        ======================================================== */}
        <section id="ingestion" className="pt-6 pb-20 px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-6xl mx-auto">
            <Integrations />
          </div>
        </section>

        {/* ========================================================
            2.6 6 CORE ARCHITECTURAL INVARIANTS & PILLARS
        ======================================================== */}
        <section id="pillars" className="py-20 px-6 sm:px-8 lg:px-12 max-w-6xl mx-auto relative">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-2 font-mono">
              ENGINEERING GUARANTEES
            </h2>
            <h3 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              6 Core Invariants Built Into Every Calculation
            </h3>
            <p className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
              Why Financial Decision Lab is fundamentally different from generic LLM chat wrappers.
            </p>
          </div>

          <motion.div
            initial={{ filter: 'blur(4px)', translateY: -8, opacity: 0 }}
            whileInView={{ filter: 'blur(0px)', translateY: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border border-dashed border-border rounded-2xl overflow-hidden bg-card/20 shadow-xs"
          >
            {FDL_PILLARS.map((pillar) => (
              <FeatureCard
                key={pillar.title}
                feature={pillar}
                className="lg:[&:not(:nth-child(3n))]:border-r lg:[&:not(:nth-child(3n))]:border-dashed lg:[&:not(:nth-child(3n))]:border-border lg:[&:nth-child(-n+3)]:border-b lg:[&:nth-child(-n+3)]:border-dashed lg:[&:nth-child(-n+3)]:border-border sm:max-lg:[&:not(:nth-child(2n))]:border-r sm:max-lg:[&:not(:nth-child(2n))]:border-dashed sm:max-lg:[&:not(:nth-child(2n))]:border-border sm:max-lg:[&:nth-child(-n+4)]:border-b sm:max-lg:[&:nth-child(-n+4)]:border-dashed sm:max-lg:[&:nth-child(-n+4)]:border-border max-sm:[&:not(:last-child)]:border-b max-sm:[&:not(:last-child)]:border-dashed max-sm:[&:not(:last-child)]:border-border"
              />
            ))}
          </motion.div>
        </section>

        {/* ========================================================
            4. FREQUENTLY ASKED QUESTIONS (FAQ)
        ======================================================== */}
        <section id="faq" className="py-8 relative">
          <FaqSection
            title="Frequently Asked Questions"
            description="Simple, clear answers about how Financial Decision Lab protects your money and keeps your data 100% private."
            items={FDL_FAQS}
            contactInfo={{
              title: "Want to see how your financial plan looks?",
              description: "Explore our interactive decision lab or try a live demo with sample bank data.",
              buttonText: "Explore Live Demo",
              onContact: () => {
                if (typeof window !== "undefined") {
                  window.location.href = "/dashboard";
                }
              },
            }}
          />
        </section>
      </main>

      {/* ========================================================
          6. FOOTER SECTION
      ======================================================== */}
      <FooterSection currentPath="home" />
    </div>
  );
}
