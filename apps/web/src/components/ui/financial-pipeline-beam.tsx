'use client'

import React, { useRef, useState } from 'react'
import { 
  Landmark, 
  CreditCard, 
  Wallet, 
  Sparkles, 
  Cpu, 
  Database, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  ArrowRight,
  Filter,
  FileCheck2,
  RefreshCw,
  TrendingUp,
  Scale
} from 'lucide-react'
import { AnimatedBeam } from '@/components/ui/klyv-animated-beam'
import { Surface } from '@/components/ui/klyv-animated-beam-utils/components-Surface-Surface'
import { IconTile } from '@/components/ui/klyv-animated-beam-utils/components-IconTile-IconTile'
import { Text } from '@/components/ui/klyv-animated-beam-utils/components-Text-Text'
import { cn } from '@/lib/utils'

export function FinancialPipelineBeam() {
  const container = useRef<HTMLDivElement>(null)
  
  // Left: Ingestion Nodes
  const bankRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const walletRef = useRef<HTMLDivElement>(null)
  
  // Center-Left: Data Cleaning
  const cleaningRef = useRef<HTMLDivElement>(null)
  
  // Center: Deterministic Engine Core
  const coreRef = useRef<HTMLDivElement>(null)
  
  // Right: Outputs
  const ledgerRef = useRef<HTMLDivElement>(null)
  const bufferRef = useRef<HTMLDivElement>(null)
  const vaultRef = useRef<HTMLDivElement>(null)

  const [activeStep, setActiveStep] = useState<number>(0)

  const pipelineSteps = [
    {
      id: 1,
      title: "1. Statement Ingestion",
      badge: "RAW INGESTION",
      icon: Landmark,
      summary: "Ingests CSV & PDF bank statements from HDFC, SBI, ICICI, and Axis Bank with SHA-256 deduplication.",
      details: [
        "Multi-bank statement support (auto-detects bank schema & statement column formats)",
        "SHA-256 hash calculation ensures idempotent imports without re-processing",
        "Password-protected PDF decryption handled locally in memory"
      ]
    },
    {
      id: 2,
      title: "2. Data Cleaning & Normalization",
      badge: "RECONCILIATION GATE",
      icon: Sparkles,
      summary: "Cleans UPI/NEFT narration noise, eliminates duplicate rows, pairs internal transfers, and reconciles balances.",
      details: [
        "UPI/IMPS sanitization: Strips merchant codes (e.g., 'UPI/4281/SWIGGY' ? 'Swiggy')",
        "Internal transfer pairing: Automatically links inter-account transfers to avoid double-counting expenses",
        "Deterministic balance gate: Verifies Opening + ?Tx = Closing (? = 0 paise)",
        "Data sufficiency gate: Confirms ? 90 days history with no gaps > 7 days"
      ]
    },
    {
      id: 3,
      title: "3. Deterministic Math Core",
      badge: "ZERO FLOAT DRIFT",
      icon: Cpu,
      summary: "Simulates 5,000 Monte Carlo daily trajectories and calculates dynamic safety buffers in integer paise.",
      details: [
        "Paise-precision arithmetic: 100% computed as 64-bit integer paise (Zero float drift)",
        "5,000 Monte Carlo simulations under random shocks with reproducible seed: 42",
        "Cadence detector: Identifies recurring rent, EMIs, utilities, and SIPs automatically",
        "Dynamic volatility buffer: Max(Floor, Essentials ? k) based on income variance"
      ]
    },
    {
      id: 4,
      title: "4. Reasoning Ledger & Privacy Vault",
      badge: "ANTI-HALLUCINATION",
      icon: ShieldCheck,
      summary: "Generates an 8-step immutable audit trail and validates all numerical figures against LLM hallucinations.",
      details: [
        "8-Step Reasoning Ledger: Step-by-step mathematical proof from opening balance to headroom",
        "Number-Verification Guard: Strict regex scan ensures 0 hallucinated figures in natural English explanations",
        "Local-First Air-Gap: All transactions and ledger records remain strictly inside local SQLite (fdl.db)"
      ]
    }
  ]

  const renderNode = (
    ref: React.RefObject<HTMLDivElement>, 
    icon: typeof Landmark, 
    label: string, 
    sub?: string,
    isCenter?: boolean
  ) => (
    <div ref={ref} className="relative z-10 flex flex-col items-center gap-1.5 group cursor-default select-none">
      <Surface
        variant="floating"
        className={cn(
          "items-center justify-center rounded-2xl border transition-all duration-300",
          isCenter 
            ? "h-14 w-14 sm:h-16 sm:w-16 bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:border-emerald-500 group-hover:scale-105" 
            : "h-11 w-11 sm:h-12 sm:w-12 border-border bg-card hover:border-emerald-500/40 hover:scale-105"
        )}
      >
        <IconTile 
          icon={icon} 
          tone={isCenter ? "accent" : "muted"} 
          size={isCenter ? "md" : "sm"} 
        />
      </Surface>
      <div className="text-center flex flex-col items-center">
        <Text size="micro" tone="default" className="font-semibold text-[11px]">
          {label}
        </Text>
        {sub && (
          <span className="text-[9px] text-muted-foreground/70 font-mono tracking-tight">
            {sub}
          </span>
        )}
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 font-sans">
      {/* Top Diagram Box with Animated Beams */}
      <div
        ref={container}
        className="relative flex w-full flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur-md p-6 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        {/* Ambient background glow */}
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 rounded-full blur-3xl opacity-10 dark:opacity-20 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(59,130,246,0.1) 60%, transparent 80%)'
          }}
        />

        {/* 1. Left Column: Ingestion Feeds */}
        <div className="flex md:flex-col gap-6 sm:gap-7 items-center justify-center">
          {renderNode(bankRef, Landmark, 'Bank Statements', 'HDFC ? SBI ? ICICI')}
          {renderNode(cardRef, CreditCard, 'Card & UPI Feeds', 'PhonePe ? GPay')}
          {renderNode(walletRef, Wallet, 'Scenarios & Salary', 'Credits ? Inflows')}
        </div>

        {/* 2. Center-Left: Data Cleaning & Reconciliation */}
        <div className="flex flex-col items-center justify-center my-4 md:my-0">
          {renderNode(cleaningRef, Sparkles, 'Data Cleaning Gate', 'Dedupe ? Regex ? ?=0', true)}
        </div>

        {/* 3. Center: Deterministic Math Core */}
        <div className="flex flex-col items-center justify-center my-4 md:my-0">
          {renderNode(coreRef, Cpu, 'Deterministic Core', '5,000 Monte Carlo', true)}
        </div>

        {/* 4. Right Column: Verified Outputs */}
        <div className="flex md:flex-col gap-6 sm:gap-7 items-center justify-center">
          {renderNode(ledgerRef, Database, 'Reasoning Ledger', '8-Step Math Audit')}
          {renderNode(bufferRef, Scale, 'Safety Buffer', 'Volatility Scaled')}
          {renderNode(vaultRef, Lock, 'Air-Gap Vault', 'Local SQLite fdl.db')}
        </div>

        {/* Animated Beams: Ingestion -> Data Cleaning */}
        <AnimatedBeam 
          containerRef={container} 
          fromRef={bankRef} 
          toRef={cleaningRef} 
          curvature={-32} 
          duration={2.6} 
          beamColor="#10b981" 
          pathColor="var(--border)"
        />
        <AnimatedBeam 
          containerRef={container} 
          fromRef={cardRef} 
          toRef={cleaningRef} 
          curvature={0} 
          duration={2.4} 
          delay={0.4} 
          beamColor="#10b981" 
          pathColor="var(--border)"
        />
        <AnimatedBeam 
          containerRef={container} 
          fromRef={walletRef} 
          toRef={cleaningRef} 
          curvature={32} 
          duration={2.6} 
          delay={0.8} 
          beamColor="#10b981" 
          pathColor="var(--border)"
        />

        {/* Animated Beam: Data Cleaning -> Deterministic Core */}
        <AnimatedBeam 
          containerRef={container} 
          fromRef={cleaningRef} 
          toRef={coreRef} 
          curvature={0} 
          duration={2.0} 
          delay={0.2} 
          beamColor="#34d399" 
          pathColor="var(--border)"
        />

        {/* Animated Beams: Deterministic Core -> Outputs */}
        <AnimatedBeam 
          containerRef={container} 
          fromRef={coreRef} 
          toRef={ledgerRef} 
          curvature={-30} 
          duration={2.4} 
          delay={0.6} 
          beamColor="#10b981" 
          pathColor="var(--border)"
        />
        <AnimatedBeam 
          containerRef={container} 
          fromRef={coreRef} 
          toRef={bufferRef} 
          curvature={0} 
          duration={2.2} 
          delay={1.0} 
          beamColor="#10b981" 
          pathColor="var(--border)"
        />
        <AnimatedBeam 
          containerRef={container} 
          fromRef={coreRef} 
          toRef={vaultRef} 
          curvature={30} 
          duration={2.5} 
          delay={1.4} 
          beamColor="#34d399" 
          pathColor="var(--border)"
        />
      </div>

      {/* Explanatory Pipeline Stages Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {pipelineSteps.map((step, idx) => {
          const StepIcon = step.icon
          const isSelected = activeStep === idx

          return (
            <div
              key={step.id}
              onClick={() => setActiveStep(idx)}
              className={cn(
                "rounded-xl p-5 border transition-all duration-300 cursor-pointer flex flex-col justify-between",
                isSelected 
                  ? "bg-card border-emerald-500 shadow-sm ring-1 ring-emerald-500/30" 
                  : "bg-card/60 border-border hover:border-emerald-500/40 hover:bg-card"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                    0{step.id}
                  </span>
                  <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                    {step.badge}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
                  <StepIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                  {step.title}
                </h4>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {step.summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border/80">
                <ul className="space-y-1.5">
                  {step.details.map((detail, dIdx) => (
                    <li key={dIdx} className="text-[11px] text-muted-foreground/90 flex items-start gap-1.5">
                      <span className="text-emerald-500 text-xs shrink-0 leading-none mt-0.5">?</span>
                      <span className="leading-snug">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default FinancialPipelineBeam
