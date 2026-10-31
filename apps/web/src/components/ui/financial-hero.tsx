'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Layers, 
  Wallet, 
  CheckCircle2, 
  TrendingUp, 
  Cpu
} from 'lucide-react';
import { formatINR } from '@fdl/shared';

export function FinancialHero() {
  return (
    <section className="relative overflow-hidden pt-8 pb-14 px-4 sm:px-6 lg:px-8 border-b border-border bg-gradient-to-b from-background via-card/50 to-background">
      {/* Subtle background ambient glow matching theme primary */}
      <div 
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 w-[640px] h-[320px] rounded-full blur-3xl opacity-20 dark:opacity-25"
        style={{ backgroundColor: 'var(--primary)' }}
        aria-hidden="true"
      />

      <div className="relative max-w-5xl mx-auto flex flex-col items-center text-center">
        {/* Release Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-foreground text-xs font-medium shadow-sm backdrop-blur-sm"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-semibold">Financial Decision Lab 1.0</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Deterministic Math Engine</span>
          <ArrowRight className="w-3.5 h-3.5 text-primary ml-0.5" />
        </motion.div>

        {/* Master Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground max-w-3xl leading-[1.15]"
        >
          Can I afford this next month?{' '}
          <span className="bg-gradient-to-r from-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent">
            Proven step-by-step.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mt-5 leading-relaxed font-normal"
        >
          Stop guessing with black-box AI. We run 5,000 Monte Carlo cash-flow simulations,
          calculate dynamic safety buffers, and prove every single rupee in an 8-step Reasoning Ledger.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3.5 mt-8"
        >
          <Link
            href="/lab"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all shadow-md active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            Evaluate a Purchase in Lab
          </Link>
          <a
            href="#dashboard-overview"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-card border border-border text-foreground font-medium text-sm hover:bg-muted transition-all active:scale-95"
          >
            <Wallet className="w-4 h-4 text-muted-foreground" />
            Explore Verified Dashboard
          </a>
        </motion.div>

        {/* 4 Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 pt-8 border-t border-border w-full text-left text-xs"
        >
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Cpu className="w-4 h-4 text-primary shrink-0" />
            <span><strong className="text-foreground">Deterministic:</strong> Zero Math in LLM</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span><strong className="text-foreground">Number-Guard:</strong> Zero Hallucinations</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-primary shrink-0" />
            <span><strong className="text-foreground">5,000 Runs:</strong> P10 / P50 / P90</span>
          </div>
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            <span><strong className="text-foreground">Local-First:</strong> Air-Gapped SQLite</span>
          </div>
        </motion.div>
      </div>

      {/* Hero Visual Card: Interactive Mockup of Reasoning Ledger & Verdict */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.35 }}
        className="max-w-4xl mx-auto mt-10 rounded-2xl border border-border bg-card p-6 shadow-xl relative text-card-foreground"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 text-foreground flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">Query: iPhone 16 (₹80,000 next month)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-foreground border border-primary/30">
                  AFFORDABLE
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Projected Headroom: +₹42,000 above emergency buffer</p>
            </div>
          </div>
          <div className="text-right sm:text-right">
            <span className="text-xs text-muted-foreground block">Cleared Liquid Balance</span>
            <span className="text-lg font-bold font-mono text-foreground">₹1,85,000</span>
          </div>
        </div>

        {/* Mini 3-step proof preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 text-xs">
          <div className="bg-muted p-3 rounded-lg border border-border">
            <span className="text-[11px] text-muted-foreground">1. Starting Balance</span>
            <p className="text-sm font-bold font-mono text-foreground mt-0.5">₹1,25,000</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">HDFC (₹85k) + SBI (₹40k)</p>
          </div>
          <div className="bg-muted p-3 rounded-lg border border-border">
            <span className="text-[11px] text-muted-foreground">2. Safety Buffer</span>
            <p className="text-sm font-bold font-mono text-foreground mt-0.5">₹58,000</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Floor + Essentials × 1.2k</p>
          </div>
          <div className="bg-muted p-3 rounded-lg border border-border">
            <span className="text-[11px] text-muted-foreground">3. Median Headroom (P50)</span>
            <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">+₹42,000</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Lowest Balance ₹1,00,000 - Buffer</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

export default FinancialHero;
