'use client'

import React, { useRef, useState, useEffect } from 'react'
import { 
  Landmark, 
  CreditCard, 
  Wallet, 
  Sparkles, 
  Cpu, 
  Database, 
  ShieldCheck, 
  Scale,
  CheckCircle2,
  FileCheck,
  Lock,
  ArrowRight
} from 'lucide-react'
import { AnimatedBeam } from '@/components/ui/klyv-animated-beam'
import { cn } from '@/lib/utils'

export function FinancialPipelineBeam() {
  const container = useRef<HTMLDivElement>(null)
  
  // Left: Ingestion Nodes
  const bankRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const walletRef = useRef<HTMLDivElement>(null)
  
  // Center: Processing Stages
  const cleaningRef = useRef<HTMLDivElement>(null)
  const coreRef = useRef<HTMLDivElement>(null)
  
  // Right: Output Nodes
  const ledgerRef = useRef<HTMLDivElement>(null)
  const bufferRef = useRef<HTMLDivElement>(null)
  const headroomRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  const [activeStep, setActiveStep] = useState<number>(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  const pipelineSteps = [
    {
      id: "01",
      title: "Statement Ingestion",
      badge: "RAW INGESTION",
      icon: Landmark,
      metric: "HDFC, SBI, ICICI, Axis",
      desc: "Auto-detects statement formats from any major bank. Computes SHA-256 file hashes to guarantee idempotent imports without duplicate processing.",
    },
    {
      id: "02",
      title: "Data Cleaning & Gate",
      badge: "RECONCILIATION GATE",
      icon: Sparkles,
      metric: "Opening + ∑Tx = Closing (Δ = 0)",
      desc: "Strips messy UPI merchant codes, pairs internal transfers to prevent double-counting, and strictly enforces 4-point data sufficiency (≥ 90 days history).",
    },
    {
      id: "03",
      title: "Deterministic Math Core",
      badge: "ZERO FLOAT DRIFT",
      icon: Cpu,
      metric: "5,000 Paths · Integer Paise",
      desc: "Simulates 5,000 daily cash-flow trajectories under random shocks (seed: 42). Computes adaptive safety buffers based on income volatility.",
    },
    {
      id: "04",
      title: "Reasoning Ledger & Vault",
      badge: "ANTI-HALLUCINATION",
      icon: ShieldCheck,
      metric: "8-Step Proof · Headroom +₹42k",
      desc: "Generates an immutable step-by-step mathematical proof. Strict regex guard ensures zero LLM numerical hallucinations; 100% offline in fdl.db.",
    },
  ]

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 font-sans select-none">
      {/* Interactive Beam Diagram Container */}
      <div
        ref={container}
        className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-2xl border border-border bg-card/85 backdrop-blur-md px-3 sm:px-6 py-8 sm:py-10 shadow-sm"
      >
        {/* Subtle radial ambient highlight */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 rounded-full blur-3xl opacity-10 dark:opacity-20 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(59,130,246,0.06) 60%, transparent 80%)'
          }}
        />

        {/* 4-Column Balanced Flow Layout */}
        <div className="relative z-10 grid grid-cols-4 items-center justify-between gap-2 sm:gap-6 min-h-[300px]">
          
          {/* Column 1: Ingestion Sources */}
          <div className="flex flex-col justify-between items-center h-full py-1 gap-6 sm:gap-7">
            {/* Node 1: HDFC Bank */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div
                ref={bankRef}
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-xs hover:border-emerald-500/50 hover:scale-105 transition-all duration-300"
              >
                <Landmark className="w-5 h-5 text-foreground" />
              </div>
              <div className="text-center flex flex-col items-center max-w-[110px]">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground tracking-tight whitespace-nowrap">
                  Bank Statements
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mt-0.5 whitespace-nowrap">
                  +{"₹"}85,000.00
                </span>
                <span className="text-[8.5px] text-muted-foreground whitespace-nowrap mt-0.5">
                  HDFC Salary Inflow
                </span>
              </div>
            </div>

            {/* Node 2: UPI & Cards */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div
                ref={cardRef}
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-xs hover:border-amber-500/50 hover:scale-105 transition-all duration-300"
              >
                <CreditCard className="w-5 h-5 text-foreground" />
              </div>
              <div className="text-center flex flex-col items-center max-w-[110px]">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground tracking-tight whitespace-nowrap">
                  Card &amp; UPI Feeds
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 mt-0.5 whitespace-nowrap">
                  -{"₹"}12,450.00
                </span>
                <span className="text-[8.5px] text-muted-foreground whitespace-nowrap mt-0.5">
                  PhonePe &amp; GPay Spends
                </span>
              </div>
            </div>

            {/* Node 3: Fixed Bills */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div
                ref={walletRef}
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-xs hover:border-blue-500/50 hover:scale-105 transition-all duration-300"
              >
                <Wallet className="w-5 h-5 text-foreground" />
              </div>
              <div className="text-center flex flex-col items-center max-w-[110px]">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground tracking-tight whitespace-nowrap">
                  Fixed Obligations
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 mt-0.5 whitespace-nowrap">
                  -{"₹"}24,000.00
                </span>
                <span className="text-[8.5px] text-muted-foreground whitespace-nowrap mt-0.5">
                  SBI Rent &amp; SIP Debits
                </span>
              </div>
            </div>
          </div>

          {/* Column 2: Data Cleaning Gate */}
          <div className="flex flex-col justify-center items-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div
                ref={cleaningRef}
                className="flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.2)] hover:scale-105 transition-all duration-300"
              >
                <Sparkles className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="text-center flex flex-col items-center max-w-[120px]">
                <span className="text-xs font-bold text-foreground tracking-tight whitespace-nowrap">
                  Data Cleaning Gate
                </span>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5 whitespace-nowrap">
                  {"Δ"} = 0 paise {"·"} Pass
                </span>
                <span className="text-[8.5px] text-muted-foreground whitespace-nowrap mt-0.5">
                  {"≥"} 90-day Sufficiency
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Deterministic Core */}
          <div className="flex flex-col justify-center items-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div
                ref={coreRef}
                className="flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl border border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.2)] hover:scale-105 transition-all duration-300"
              >
                <Cpu className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="text-center flex flex-col items-center max-w-[120px]">
                <span className="text-xs font-bold text-foreground tracking-tight whitespace-nowrap">
                  Deterministic Core
                </span>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5 whitespace-nowrap">
                  5,000 runs {"·"} Seed 42
                </span>
                <span className="text-[8.5px] text-muted-foreground whitespace-nowrap mt-0.5">
                  Integer Paise {"·"} 0 Float
                </span>
              </div>
            </div>
          </div>

          {/* Column 4: Verified Outputs */}
          <div className="flex flex-col justify-between items-center h-full py-1 gap-6 sm:gap-7">
            {/* Node 4: Reasoning Ledger */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div
                ref={ledgerRef}
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-xs hover:border-purple-500/50 hover:scale-105 transition-all duration-300"
              >
                <Database className="w-5 h-5 text-foreground" />
              </div>
              <div className="text-center flex flex-col items-center max-w-[110px]">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground tracking-tight whitespace-nowrap">
                  Reasoning Ledger
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 mt-0.5 whitespace-nowrap">
                  8-Step Audit
                </span>
                <span className="text-[8.5px] text-muted-foreground whitespace-nowrap mt-0.5">
                  Regex Number Guard
                </span>
              </div>
            </div>

            {/* Node 5: Safety Buffer */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div
                ref={bufferRef}
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-xs hover:border-amber-500/50 hover:scale-105 transition-all duration-300"
              >
                <Scale className="w-5 h-5 text-foreground" />
              </div>
              <div className="text-center flex flex-col items-center max-w-[110px]">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground tracking-tight whitespace-nowrap">
                  Safety Buffer
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 mt-0.5 whitespace-nowrap">
                  {"₹"}58,000 (1.2x)
                </span>
                <span className="text-[8.5px] text-muted-foreground whitespace-nowrap mt-0.5">
                  Adaptive Volatility
                </span>
              </div>
            </div>

            {/* Node 6: Safe Headroom & Vault */}
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div
                ref={headroomRef}
                className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-xs hover:border-emerald-500/50 hover:scale-105 transition-all duration-300"
              >
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-center flex flex-col items-center max-w-[110px]">
                <span className="text-[11px] sm:text-xs font-semibold text-foreground tracking-tight whitespace-nowrap">
                  Safe Headroom
                </span>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5 whitespace-nowrap">
                  +{"₹"}42,000 (P50)
                </span>
                <span className="text-[8.5px] text-muted-foreground whitespace-nowrap mt-0.5">
                  Air-Gap SQLite fdl.db
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Beams: Smooth cubic Bezier edge-to-edge connection with zero misalignment */}
        {mounted && (
          <>
            {/* Ingestion Sources -> Data Cleaning Gate */}
            <AnimatedBeam 
              containerRef={container} 
              fromRef={bankRef} 
              toRef={cleaningRef} 
              connectionType="edge-horizontal"
              duration={2.6} 
              beamColor="#10b981" 
              pathColor="var(--border)"
            />
            <AnimatedBeam 
              containerRef={container} 
              fromRef={cardRef} 
              toRef={cleaningRef} 
              connectionType="edge-horizontal"
              duration={2.3} 
              delay={0.35} 
              beamColor="#10b981" 
              pathColor="var(--border)"
            />
            <AnimatedBeam 
              containerRef={container} 
              fromRef={walletRef} 
              toRef={cleaningRef} 
              connectionType="edge-horizontal"
              duration={2.6} 
              delay={0.7} 
              beamColor="#10b981" 
              pathColor="var(--border)"
            />

            {/* Data Cleaning Gate -> Deterministic Core */}
            <AnimatedBeam 
              containerRef={container} 
              fromRef={cleaningRef} 
              toRef={coreRef} 
              connectionType="edge-horizontal"
              duration={1.9} 
              delay={0.2} 
              beamColor="#34d399" 
              pathColor="var(--border)"
            />

            {/* Deterministic Core -> Outputs */}
            <AnimatedBeam 
              containerRef={container} 
              fromRef={coreRef} 
              toRef={ledgerRef} 
              connectionType="edge-horizontal"
              duration={2.4} 
              delay={0.5} 
              beamColor="#10b981" 
              pathColor="var(--border)"
            />
            <AnimatedBeam 
              containerRef={container} 
              fromRef={coreRef} 
              toRef={bufferRef} 
              connectionType="edge-horizontal"
              duration={2.2} 
              delay={0.9} 
              beamColor="#10b981" 
              pathColor="var(--border)"
            />
            <AnimatedBeam 
              containerRef={container} 
              fromRef={coreRef} 
              toRef={headroomRef} 
              connectionType="edge-horizontal"
              duration={2.5} 
              delay={1.3} 
              beamColor="#34d399" 
              pathColor="var(--border)"
            />
          </>
        )}
      </div>

      {/* 4-Step Technical Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {pipelineSteps.map((step, idx) => {
          const StepIcon = step.icon
          const isSelected = activeStep === idx

          return (
            <div
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={cn(
                "rounded-xl p-4 sm:p-5 border transition-all duration-300 cursor-pointer flex flex-col justify-between",
                isSelected 
                  ? "bg-card border-emerald-500 shadow-xs ring-1 ring-emerald-500/30" 
                  : "bg-card/60 border-border hover:border-emerald-500/40 hover:bg-card"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="w-6 h-6 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs font-mono">
                    {step.id}
                  </span>
                  <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded border border-border bg-muted/30 text-muted-foreground">
                    {step.badge}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-foreground mb-1 flex items-center gap-1.5">
                  <StepIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {step.title}
                </h4>

                <p className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 mb-2">
                  {step.metric}
                </p>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FinancialPipelineBeam
