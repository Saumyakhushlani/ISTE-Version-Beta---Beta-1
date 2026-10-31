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
  X,
  Code2,
  FileSpreadsheet,
  Binary,
  Compass,
  Database,
  Check
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

export default function HowItWorksPage() {
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
          <div className="hidden lg:flex items-center justify-center gap-6 xl:gap-8 text-sm font-medium text-muted-foreground shrink-0">
            <Link href="/" className="hover:text-foreground transition-colors whitespace-nowrap">
              Product Overview
            </Link>
            <a href="#pipeline-architecture" className="hover:text-foreground transition-colors whitespace-nowrap text-foreground font-semibold">
              Architecture &amp; Pipeline
            </a>
            <a href="#data-cleaning" className="hover:text-foreground transition-colors whitespace-nowrap">
              Data Cleaning
            </a>
            <a href="#equations" className="hover:text-foreground transition-colors whitespace-nowrap">
              Formulas &amp; Math
            </a>
            <a href="#domain-invariants" className="hover:text-foreground transition-colors whitespace-nowrap">
              Invariants Reference
            </a>
            <Link href="/privacy" className="hover:text-foreground transition-colors whitespace-nowrap">
              Privacy &amp; Security
            </Link>
          </div>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
            >
              Open Decision Lab <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
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
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Product Overview
            </Link>
            <a
              href="#pipeline-architecture"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1 font-semibold"
            >
              Architecture &amp; Pipeline
            </a>
            <a
              href="#data-cleaning"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Data Cleaning &amp; Gate
            </a>
            <a
              href="#equations"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Formulas &amp; Math
            </a>
            <a
              href="#domain-invariants"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Invariants Reference
            </a>
            <Link
              href="/privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-medium text-foreground py-1"
            >
              Privacy &amp; Security
            </Link>
            <div className="pt-2 border-t border-border flex flex-col gap-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg shadow-sm"
              >
                Open Decision Lab
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {/* ========================================================
            2. HERO SECTION FOR TECHNICAL DEEP-DIVE
        ======================================================== */}
        <section className="relative flex flex-col items-center justify-start pt-16 pb-20 px-4 sm:px-6 lg:px-8 border-b border-border/60 bg-gradient-to-b from-card/30 via-background to-background">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/25 bg-primary/10 text-xs text-primary font-medium mb-6 shadow-xs font-mono">
            <Cpu className="w-3.5 h-3.5 animate-pulse" />
            TECHNICAL ARCHITECTURE &amp; FINANCIAL ENGINE SPECIFICATION
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-center max-w-4xl text-foreground leading-[1.12]">
            How Financial Decision Lab Works Under the Hood
          </h1>

          <p className="mt-5 text-base sm:text-lg text-muted-foreground text-center max-w-3xl leading-relaxed">
            A comprehensive architectural breakdown of our deterministic 12-stage financial calculation pipeline, mathematical formulas, sufficiency gates, and anti-hallucination regex guardrails.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-mono text-muted-foreground">
            <span className="px-3 py-1.5 rounded-lg bg-card border border-border flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              100% Deterministic Python Engine
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-card border border-border flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              Zero Floating-Point Drift (Integer Paise)
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-card border border-border flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              Zero LLM Arithmetic
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-card border border-border flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              5,000 Monte Carlo Runs (Seed=42)
            </span>
          </div>
        </section>

        {/* ========================================================
            3. SECTION 1: 3-STEP PIPELINE FLOW
        ======================================================== */}
        <section id="pipeline-architecture" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2 font-mono">
              THE 3-TIER OPERATIONAL PIPELINE
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              From Raw Statement to Verifiable Proof in 3 Steps
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
              Clean, strict separation between untrusted raw input parsing, deterministic mathematical calculation, and guarded natural-language presentation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {/* Step 01 */}
            <div className="bg-card border border-border rounded-2xl p-7 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs group">
              <div>
                <span className="text-primary font-mono font-bold text-sm mb-4 block">
                  STAGE 01
                </span>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  Ingestion &amp; SHA-256 Dedup
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Statement parsing for PDF, CSV, and Excel (HDFC, SBI, ICICI, Axis). Generates SHA-256 fingerprint hashes to ensure overlapping statement files are never double-counted.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-border/50 text-xs font-mono text-muted-foreground">
                Output: Sanitized Transaction Stream
              </div>
            </div>

            {/* Step 02 */}
            <div className="bg-card border border-border rounded-2xl p-7 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs group">
              <div>
                <span className="text-primary font-mono font-bold text-sm mb-4 block">
                  STAGE 02
                </span>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-primary" />
                  Deterministic Engine &amp; Gate
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Evaluates the 4-point data sufficiency gate (&ge; 90 days history, max gap &le; 7 days). Executes balance continuity reconciliation: <span className="font-mono text-primary font-semibold">Opening + &Sigma;Tx = Closing</span>.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-border/50 text-xs font-mono text-muted-foreground">
                Output: Verified Reasoning Ledger
              </div>
            </div>

            {/* Step 03 */}
            <div className="bg-card border border-border rounded-2xl p-7 flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs group">
              <div>
                <span className="text-primary font-mono font-bold text-sm mb-4 block">
                  STAGE 03
                </span>
                <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-primary" />
                  Monte Carlo &amp; Guarded Output
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  5,000 Monte Carlo daily spend simulations calculate conservative P10, median P50, and optimistic P90 headroom. LLM translates structured ledger to plain narration with regex number guard verification.
                </p>
              </div>
              <div className="pt-6 mt-6 border-t border-border/50 text-xs font-mono text-muted-foreground">
                Output: Affordability Verdict + Headroom
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            4. SECTION 2: INTERACTIVE DATA PIPELINE BEAM & INTEGRATIONS
        ======================================================== */}
        <section id="data-cleaning" className="py-20 border-t border-border/60 bg-card/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
            <div className="text-center max-w-3xl mx-auto">
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2 font-mono">
                DATA CLEANING &amp; STREAM PIPELINE
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Automated Transaction Normalization &amp; Transfer Pairing
              </h2>
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
                Watch how noisy Indian UPI descriptions, internal account transfers, and statement discrepancies are parsed, cleaned, and reconciled.
              </p>
            </div>

            <div className="w-full">
              <FinancialPipelineBeam />
            </div>

            <div className="w-full pt-8">
              <Integrations />
            </div>
          </div>
        </section>

        {/* ========================================================
            5. SECTION 3: AI VERIFICATION & NUMBER GUARD PIPELINE
        ======================================================== */}
        <section className="py-20 border-t border-border/60">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2 font-mono">
                ZERO-HALLUCINATION NARRATION
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Dual-Tier AI Architecture with Number Verification Guard
              </h2>
              <p className="text-sm text-muted-foreground mt-3 max-w-2xl mx-auto leading-relaxed">
                The LLM is strictly confined to natural language comprehension and narration. Every figure cited must exist verbatim in the mathematical Reasoning Ledger.
              </p>
            </div>

            <EnterpriseAIPipeline />
          </div>
        </section>

        {/* ========================================================
            6. SECTION 4: THE 6 CORE ARCHITECTURAL PILLARS
        ======================================================== */}
        <section id="pillars" className="py-20 px-6 sm:px-8 lg:px-12 max-w-6xl mx-auto border-t border-border">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="text-xs font-bold uppercase tracking-widest text-primary mb-2 font-mono">
              ENGINEERING GUARANTEES
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              6 Core Invariants Built Into Every Calculation
            </h2>
            <p className="text-sm text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
              Why Financial Decision Lab is fundamentally different from generic LLM chat wrappers.
            </p>
          </div>

          <InkOrbitFeatures />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-40px' }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12"
          >
            {FDL_PILLARS.map((pillar) => (
              <motion.div key={pillar.title} variants={itemVariants}>
                <FeatureCard feature={pillar} />
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* ========================================================
            7. SECTION 5: THE 8 MATHEMATICAL EQUATIONS
        ======================================================== */}
        <section id="equations" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-border/60 bg-gradient-to-b from-background via-card/15 to-background">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/25 bg-primary/10 text-xs text-primary font-medium mb-3 shadow-xs font-mono">
                <Binary className="w-3.5 h-3.5" />
                EXACT FORMULAS &amp; ALGORITHMS
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                The 8 Core Mathematical Equations Powering Every Verdict
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-2xl mx-auto leading-relaxed">
                Every calculation is executed in integer paise with zero floating-point drift. Here are the 8 fundamental mathematical invariants enforced by our deterministic engine.
              </p>
            </div>

            {/* 8 Equations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Equation 1 */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary">
                      INGESTION &middot; DEDUP
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      0 Duplicates
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground mb-2">
                    SHA-256 Idempotent Hash
                  </h3>
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border/70 font-mono text-[10.5px] text-foreground font-semibold leading-relaxed mb-3">
                    <span className="text-primary font-bold">Fingerprint</span> = SHA256(acc_id || date || paise || desc)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Guarantees duplicate files or overlapping statement date ranges are never double-counted into ledger history.
                  </p>
                </div>
              </div>

              {/* Equation 2 */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary">
                      INTERNAL TRANSFERS
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      &plusmn;₹25 Tolerance
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground mb-2">
                    Transfer Cancellation
                  </h3>
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border/70 font-mono text-[10.5px] text-foreground font-semibold leading-relaxed mb-3">
                    <span className="text-primary font-bold">sgn(T₁)</span> &ne; sgn(T₂) &and; |&Delta;t| &le; 2d &and; |T₁ + T₂| &le; Fee
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Pairs intra-account transfers between savings accounts so funds shifted to secondary accounts are not treated as expenses.
                  </p>
                </div>
              </div>

              {/* Equation 3 */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary">
                      BALANCE CONTINUITY
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                      &Delta; = 0 Paise
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground mb-2">
                    Balance Anchor Equation
                  </h3>
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border/70 font-mono text-[10.5px] text-foreground font-semibold leading-relaxed mb-3">
                    <span className="text-primary font-bold">Opening</span> + &Sigma; Tx = Closing Balance
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Any minor arithmetic mismatch (&Delta; &gt; 0) instantly halts calculation and flags a discrepancy in the statement table.
                  </p>
                </div>
              </div>

              {/* Equation 4 */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary">
                      DATA SUFFICIENCY
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      &ge; 90 Days
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground mb-2">
                    4-Point Sufficiency Gate
                  </h3>
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border/70 font-mono text-[10.5px] text-foreground font-semibold leading-relaxed mb-3">
                    <span className="text-primary font-bold">Span</span> &ge; 90d &and; MaxGap &le; 7d &and; Inflows &ge; 2
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Refuses to calculate on blind data; requires continuous transaction history with verified recurring income anchors.
                  </p>
                </div>
              </div>

              {/* Equation 5 */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary">
                      OUTLIER DETECTION
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      M &ge; 3.5 MAD
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground mb-2">
                    Modified Z-Score (MAD)
                  </h3>
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border/70 font-mono text-[10.5px] text-foreground font-semibold leading-relaxed mb-3">
                    <span className="text-primary font-bold">M_i</span> = 0.6745 &middot; |x_i - x̃| / MAD(x)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Detects abnormal one-off spikes without distorting recurring monthly subscription and utility obligations.
                  </p>
                </div>
              </div>

              {/* Equation 6 */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary">
                      DAILY SIMULATION
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      Seed = 42
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground mb-2">
                    Monte Carlo Evolution
                  </h3>
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border/70 font-mono text-[10.5px] text-foreground font-semibold leading-relaxed mb-3">
                    <span className="text-primary font-bold">B(t)</span> = B(t-1) + Inc(t) - Fix(t) - Var(t)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Simulates 5,000 daily spend trajectories under random shocks to find conservative P10, median P50, and P90 percentiles.
                  </p>
                </div>
              </div>

              {/* Equation 7 */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary">
                      SAFETY RESERVE
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      k &isin; [1.0x, 2.0x]
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground mb-2">
                    Dynamic Volatility Buffer
                  </h3>
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border/70 font-mono text-[10.5px] text-foreground font-semibold leading-relaxed mb-3">
                    <span className="text-primary font-bold">Buffer</span> = Max(₹5k, k &middot; Essentials, Var)
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Multiplied by income volatility CV: 1.0x for salaried workers, scaling up to 2.0x for volatile freelancers.
                  </p>
                </div>
              </div>

              {/* Equation 8 */}
              <div className="p-4 sm:p-5 rounded-xl border border-border bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-primary/40 transition-all shadow-xs">
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-primary">
                      FINAL VERDICT
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                      P10 Conservative
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-foreground mb-2">
                    Headroom Proof Formula
                  </h3>
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border/70 font-mono text-[10.5px] text-foreground font-semibold leading-relaxed mb-3">
                    <span className="text-primary font-bold">Headroom_X</span> = B_min,X - Buffer - Price
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    AFFORDABLE if Headroom₁₀ &ge; 0; TIGHT if Headroom₅₀ &ge; 0; else NOT ADVISABLE. Zero LLM hallucinations.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            8. SECTION 6: DOMAIN INVARIANTS REFERENCE (APPENDIX B)
        ======================================================== */}
        <section id="domain-invariants" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-border/60">
          <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card/80 backdrop-blur-md shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider">
                  Domain Invariants &amp; Threshold Reference (Appendix B)
                </h3>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Enforced deterministically in Python engine &amp; TypeScript contracts
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-background border border-border">
                <div className="text-[10px] font-mono text-muted-foreground">MIN_HISTORY</div>
                <div className="text-sm font-bold text-foreground font-mono mt-1">&ge; 90 Days</div>
                <div className="text-[10px] text-primary font-mono mt-0.5">Full Confidence</div>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <div className="text-[10px] font-mono text-muted-foreground">MAX_GAP_DAYS</div>
                <div className="text-sm font-bold text-foreground font-mono mt-1">&le; 7 Days</div>
                <div className="text-[10px] text-primary font-mono mt-0.5">Continuity Bound</div>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <div className="text-[10px] font-mono text-muted-foreground">MONTE_CARLO</div>
                <div className="text-sm font-bold text-foreground font-mono mt-1">5,000 Runs</div>
                <div className="text-[10px] text-primary font-mono mt-0.5">Seed = 42</div>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <div className="text-[10px] font-mono text-muted-foreground">BUFFER_FLOOR</div>
                <div className="text-sm font-bold text-foreground font-mono mt-1">₹5,000.00</div>
                <div className="text-[10px] text-primary font-mono mt-0.5">500,000 Paise</div>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <div className="text-[10px] font-mono text-muted-foreground">OUTLIER_MOD_Z</div>
                <div className="text-sm font-bold text-foreground font-mono mt-1">&gt; 3.5 MAD</div>
                <div className="text-[10px] text-primary font-mono mt-0.5">Spike Filter</div>
              </div>
              <div className="p-3 rounded-xl bg-background border border-border">
                <div className="text-[10px] font-mono text-muted-foreground">TRANSFER_TOL</div>
                <div className="text-sm font-bold text-foreground font-mono mt-1">&plusmn;₹25.00</div>
                <div className="text-[10px] text-primary font-mono mt-0.5">2,500 Paise Fee</div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            9. CALL TO ACTION & DECISION LAB LAUNCH
        ======================================================== */}
        <section className="py-20 px-6 sm:px-8 border-t border-border text-center bg-card">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
              Experience the Deterministic Engine in Action
            </h2>
            <p className="text-base text-muted-foreground mt-3 max-w-xl mx-auto leading-relaxed">
              Launch the Decision Lab to run simulated purchase scenarios, review your cash horizon, and inspect the live Reasoning Ledger.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition shadow-sm flex items-center justify-center gap-2"
              >
                Launch Decision Lab <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-border bg-background text-foreground font-semibold hover:bg-muted transition flex items-center justify-center"
              >
                Back to Product Overview
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ========================================================
          10. FOOTER
      ======================================================== */}
      <footer className="border-t border-border py-12 px-6 sm:px-8 bg-background">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">Financial Decision Lab</span>
            <span>&middot;</span>
            <span>Local-First Deterministic Financial Architecture</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-foreground transition-colors">
              Product Overview
            </Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy &amp; Security
            </Link>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
