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
import Integrations from '@/components/ui/integrations-4';
import { FeatureCard, type FeatureType } from '@/components/ui/grid-feature-cards';
import PerspectiveHero from '@/components/ui/perspective-hero';

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

          {/* Centered Navigation Links - Never wraps, clean spacing */}
          <div className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 text-sm font-medium text-muted-foreground shrink-0">
            <a href="#overview" className="hover:text-foreground transition-colors whitespace-nowrap">
              Overview
            </a>
            <a href="#ingestion" className="hover:text-foreground transition-colors whitespace-nowrap">
              Bank Ingestion
            </a>
            <a href="#pillars" className="hover:text-foreground transition-colors whitespace-nowrap">
              Pillars &amp; Math
            </a>
            <Link href="/how-it-works" className="hover:text-foreground transition-colors whitespace-nowrap font-medium text-emerald-600 dark:text-emerald-400">
              How It Works &amp; Architecture
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors whitespace-nowrap">
              Privacy &amp; Security
            </Link>
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
              href="#overview"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Overview
            </a>
            <a
              href="#ingestion"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Bank Ingestion
            </a>
            <a
              href="#pillars"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Pillars &amp; Math
            </a>
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-emerald-600 dark:text-emerald-400 font-semibold py-1"
            >
              How It Works &amp; Architecture
            </Link>
            <Link
              href="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Privacy &amp; Security
            </Link>
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
            2. HERO SECTION (ISOMETRIC 3D PERSPECTIVE SHOWCASE)
        ======================================================== */}
        <PerspectiveHero />

        {/* ========================================================
            2.5 UNIVERSAL BANK & PAYMENT INGESTION
        ======================================================== */}
        <section id="ingestion" className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/60 bg-card/20">
          <div className="max-w-6xl mx-auto">
            <Integrations />
          </div>
        </section>

        {/* ========================================================
            2.6 6 CORE ARCHITECTURAL INVARIANTS & PILLARS
        ======================================================== */}
        <section id="pillars" className="py-24 px-6 sm:px-8 lg:px-12 max-w-6xl mx-auto border-t border-border/60">
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
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {FDL_PILLARS.map((pillar) => (
              <motion.div key={pillar.title} variants={itemVariants}>
                <FeatureCard feature={pillar} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ========================================================
            3. TECHNICAL ARCHITECTURE TEASER CARD
        ======================================================== */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-border/60 bg-gradient-to-b from-card/30 via-background to-background">
          <div className="max-w-4xl mx-auto rounded-3xl border border-border bg-card/80 p-8 sm:p-12 text-center space-y-6 shadow-sm backdrop-blur-xs">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-xs text-primary font-medium font-mono">
              <Cpu className="w-3.5 h-3.5 animate-pulse" />
              DEEP-DIVE TECHNICAL SPECIFICATION
            </div>
            
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Looking for the Mathematical Proof &amp; Architecture?
            </h2>
            
            <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              We’ve moved all our 12-stage engineering pipelines, 5,000-run Monte Carlo simulation formulas, integer paise guarantees, and anti-hallucination regex guardrails to a dedicated technical architecture page.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition shadow-sm"
              >
                View Architecture &amp; Formulas <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border bg-background text-foreground font-semibold text-sm hover:bg-muted transition"
              >
                Open Decision Lab Demo
              </Link>
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
