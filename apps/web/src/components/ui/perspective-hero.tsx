'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  CreditCard,
  Building2,
  Calendar,
  Lock,
  ChevronDown,
  User,
  Plus
} from 'lucide-react';
import { formatINR } from '@fdl/shared';

export function PerspectiveHero() {
  return (
    <section id="overview" className="relative w-full overflow-hidden bg-black text-white pt-16 sm:pt-24 pb-16 selection:bg-primary/30">
      {/* Background ambient spotlight lighting */}
      <div 
        className="pointer-events-none absolute left-1/3 top-10 -translate-x-1/2 w-[850px] h-[500px] rounded-full blur-[150px] opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(16,185,129,0.2) 40%, transparent 75%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ========================================================
            1. HEADLINE, SUBTITLE & CTA BUTTONS (EXACT ACETERNITY MATCH)
        ======================================================== */}
        <div className="max-w-3xl space-y-6 text-left mb-14 sm:mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.06]"
          >
            Decisions that do the math.<br />
            <span className="text-neutral-200">Buffers that keep you safe.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1, ease: 'easeOut' }}
            className="text-base sm:text-lg text-neutral-400 max-w-2xl leading-relaxed font-normal"
          >
            Deploy personal finance intelligence that plans cash flows, simulates 5,000 daily spend trajectories, and proves every rupee—without letting LLMs guess with your money.
          </motion.p>

          {/* Action Buttons */}
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: 'easeOut' }}
            className="flex flex-wrap items-center gap-4 pt-2"
          >
            {/* Primary Button with Soft Radial Glow */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-white/30 rounded-xl blur-md opacity-70 group-hover:opacity-100 transition duration-300" />
              <Link
                href="/login"
                className="relative px-6 py-3 rounded-lg bg-white text-neutral-950 font-semibold text-sm hover:bg-neutral-100 transition shadow-sm flex items-center gap-2 active:scale-95"
              >
                Start your free trial
              </Link>
            </div>

            {/* Secondary Glassy Button */}
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-lg bg-neutral-900/90 hover:bg-neutral-800 text-white font-medium text-sm border border-neutral-700/80 transition backdrop-blur-md shadow-xs flex items-center gap-2 active:scale-95"
            >
              View live decision lab
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ========================================================
          2. ISOMETRIC 3D PERSPECTIVE BOARD SHOWCASE
      ======================================================== */}
      <div className="relative w-full overflow-hidden pt-4 pb-12 select-none">
        {/* Soft overhead spotlight beam */}
        <div 
          className="absolute -top-10 right-1/4 w-[600px] h-[350px] rounded-full blur-[130px] pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(59,130,246,0.15) 50%, transparent 80%)' }}
        />

        {/* Perspective Viewport Container */}
        <div 
          className="w-[140%] -ml-[18%] sm:w-[125%] sm:-ml-[10%] lg:w-[115%] lg:-ml-[4%]"
          style={{
            perspective: '1400px',
            perspectiveOrigin: '50% 15%',
          }}
        >
          {/* Tilted 3D Board */}
          <motion.div 
            initial={{ opacity: 0, rotateX: 28, rotateY: -12, rotateZ: 14, y: 60 }}
            animate={{ opacity: 1, rotateX: 20, rotateY: -7, rotateZ: 12, y: 0 }}
            transition={{ duration: 1.0, ease: 'easeOut' }}
            style={{
              transformStyle: 'preserve-3d',
            }}
            className="rounded-2xl border border-neutral-700/80 bg-neutral-900/95 text-neutral-100 shadow-[0_30px_100px_-20px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.08)] overflow-hidden backdrop-blur-xl"
          >
            {/* Top Workspace Header Bar */}
            <div className="px-5 py-3 border-b border-neutral-800 bg-neutral-950/70 flex items-center justify-between text-xs text-neutral-400">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                  <span>Financial Decision Lab &middot; Core Workspace</span>
                </div>
                <span className="text-neutral-600">|</span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-neutral-800 text-neutral-300 font-medium flex items-center gap-1.5 border border-neutral-700/60">
                    <Filter className="w-3 h-3 text-neutral-400" />
                    Filter
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-neutral-800/60 text-neutral-400">All Accounts</span>
                  <span className="px-2.5 py-1 rounded-md bg-neutral-800/60 text-neutral-400">Active</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-400 text-[11px]">
                  <Search className="w-3 h-3" />
                  <span>Quick search transactions or simulations...</span>
                  <kbd className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400 font-mono">⌘K</kbd>
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                  AK
                </div>
              </div>
            </div>

            {/* Board Columns Grid */}
            <div className="p-5 grid grid-cols-4 gap-4 bg-neutral-900/60 min-h-[480px]">
              {/* ========================================================
                  COLUMN 1: RECURRING OBLIGATIONS (BACKLOG)
              ======================================================== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs font-semibold text-neutral-300 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neutral-400" />
                    <span>Fixed Obligations</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-mono">
                      4
                    </span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-neutral-500 cursor-pointer" />
                </div>

                {/* Card 1 */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 shadow-sm space-y-2 hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-mono text-neutral-400">FDL-179</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium text-[10px] border border-blue-500/20">Monthly</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">Apartment Rent &amp; Society Maintenance</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                    <span className="text-sm font-bold text-neutral-100 font-mono">₹28,000</span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Auto-Debit
                    </span>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 shadow-sm space-y-2 hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-mono text-neutral-400">FDL-188</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium text-[10px] border border-purple-500/20">SIP</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">Index Fund Wealth SIP (Nifty 50)</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                    <span className="text-sm font-bold text-neutral-100 font-mono">₹15,000</span>
                    <span className="text-[10px] text-neutral-400">10th of month</span>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 shadow-sm space-y-2 hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-mono text-neutral-400">FDL-194</span>
                    <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 font-medium text-[10px]">Utility</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">Electricity, Gas &amp; 1Gbps Fiber</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                    <span className="text-sm font-bold text-neutral-100 font-mono">₹3,450</span>
                    <span className="text-[10px] text-neutral-400">Recurring</span>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  COLUMN 2: DETECTED CASH FLOWS (TODO)
              ======================================================== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs font-semibold text-neutral-300 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    <span>Expected Inflows</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-mono">
                      3
                    </span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-neutral-500 cursor-pointer" />
                </div>

                {/* Card 1 */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 shadow-sm space-y-2 hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-mono text-neutral-400">FDL-201</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium text-[10px] border border-emerald-500/20">Salary</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">Engineering Lead Monthly Payroll</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                    <span className="text-sm font-bold text-emerald-400 font-mono">+₹1,25,000</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Verified Anchor</span>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 shadow-sm space-y-2 hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-mono text-neutral-400">FDL-209</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium text-[10px] border border-amber-500/20">Consulting</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">System Architecture Advisory</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                    <span className="text-sm font-bold text-emerald-400 font-mono">+₹35,000</span>
                    <span className="text-[10px] text-amber-400">Variable Inflow</span>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 shadow-sm space-y-2 hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-mono text-neutral-400">FDL-214</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium text-[10px] border border-blue-500/20">Dividend</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">Quarterly Equity Portfolio Dividend</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                    <span className="text-sm font-bold text-emerald-400 font-mono">+₹8,200</span>
                    <span className="text-[10px] text-neutral-400">Direct Credit</span>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  COLUMN 3: PURCHASE SIMULATION LAB (IN PROGRESS)
              ======================================================== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs font-semibold text-neutral-300 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Purchase Scenarios</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-mono">
                      3
                    </span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-neutral-500 cursor-pointer" />
                </div>

                {/* Card 1 - Affordable */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-emerald-500/40 shadow-sm space-y-2 relative overflow-hidden">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-neutral-400">FDL-243</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                      AFFORDABLE
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">MacBook Pro M3 Max (36GB)</h4>
                  <p className="text-[11px] text-neutral-400">5,000 Monte Carlo runs confirm zero buffer breach.</p>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 font-mono">
                    <span className="text-sm font-bold text-white">₹1,34,900</span>
                    <span className="text-[11px] font-bold text-emerald-400">+₹24,500 Headroom</span>
                  </div>
                </div>

                {/* Card 2 - Tight */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-amber-500/40 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-neutral-400">FDL-250</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                      TIGHT
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">Bali 7-Day International Flight &amp; Hotel</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 font-mono">
                    <span className="text-sm font-bold text-white">₹65,000</span>
                    <span className="text-[11px] font-bold text-amber-400">+₹3,800 Buffer Left</span>
                  </div>
                </div>

                {/* Card 3 - Not Advisable */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-red-500/40 shadow-sm space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-neutral-400">FDL-255</span>
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold text-[10px] border border-red-500/30">
                      NOT ADVISABLE
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">Luxury Vehicle Downpayment</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 font-mono">
                    <span className="text-sm font-bold text-white">₹4,50,000</span>
                    <span className="text-[11px] font-bold text-red-400">-₹1,85,000 Shortfall</span>
                  </div>
                </div>
              </div>

              {/* ========================================================
                  COLUMN 4: BUFFER & LEDGER AUDIT (DONE)
              ======================================================== */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs font-semibold text-neutral-300 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Buffer &amp; Audit Guard</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-400 text-[10px] font-mono">
                      Verified
                    </span>
                  </div>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>

                {/* Card 1 */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 shadow-sm space-y-2 hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-mono text-neutral-400">FDL-261</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium text-[10px]">k = 1.25x</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">Dynamic Volatility Safety Buffer</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60">
                    <span className="text-sm font-bold text-emerald-400 font-mono">₹50,000 Floor</span>
                    <span className="text-[10px] text-neutral-400">Protected</span>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 shadow-sm space-y-2 hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-mono text-neutral-400">FDL-268</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-medium text-[10px]">Deterministic</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">Integer Paise Reconciliation</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 font-mono text-[11px]">
                    <span className="text-neutral-300">Opening + &Sigma;Tx = Closing</span>
                    <span className="text-emerald-400 font-bold">&Delta; = 0</span>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800/90 shadow-sm space-y-2 hover:border-neutral-700 transition">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="font-mono text-neutral-400">FDL-274</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-medium text-[10px]">Regex Guard</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white">Number-Verification Ledger Lock</h4>
                  <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 text-[10px]">
                    <span className="text-neutral-400">All figures verified</span>
                    <span className="text-emerald-400 font-bold">0 Hallucinations</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom subtle radial vignette fade */}
        <div className="absolute -bottom-6 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
      </div>
    </section>
  );
}

export default PerspectiveHero;
