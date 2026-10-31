'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Search, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  CreditCard,
  Building2,
  Lock,
  Wallet,
  TrendingUp,
  LayoutDashboard,
  UploadCloud,
  Scale,
  Settings,
  Bell,
  Check,
  ChevronRight,
  Cpu
} from 'lucide-react';

export function PerspectiveHero() {
  return (
    <section id="overview" className="relative w-full overflow-hidden bg-black text-white pt-16 sm:pt-24 pb-20 selection:bg-emerald-500/30">
      {/* Background ambient spotlight lighting matching reference aesthetic */}
      <div 
        className="pointer-events-none absolute left-1/4 top-6 -translate-x-1/2 w-[850px] h-[520px] rounded-full blur-[160px] opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(16,185,129,0.25) 40%, transparent 75%)',
        }}
        aria-hidden="true"
      />
      <div 
        className="pointer-events-none absolute right-10 top-20 w-[650px] h-[450px] rounded-full blur-[140px] opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, rgba(139,92,246,0.15) 50%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ========================================================
            1. HEADLINE, SUBTITLE & CTA BUTTONS (MATCHING REFERENCE)
        ======================================================== */}
        <div className="max-w-3xl space-y-6 text-left mb-12 sm:mb-16">
          {/* Top Pill Announcement */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-800 bg-neutral-900/80 text-xs text-neutral-300 backdrop-blur-md"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Deterministic Math Engine 2.0</span>
            <span className="text-neutral-500">·</span>
            <span className="text-neutral-400">Zero LLM Arithmetic</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]"
          >
            Decisions that do the math.<br />
            <span className="text-neutral-300">Buffers that keep you safe.</span>
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
            {/* Primary Glowing Button with Soft Radial Halo */}
            <div className="relative group">
              <div className="absolute -inset-1 bg-white/40 rounded-xl blur-md opacity-75 group-hover:opacity-100 transition duration-300" />
              <Link
                href="/login"
                className="relative px-6 py-3 rounded-lg bg-white text-neutral-950 font-semibold text-sm hover:bg-neutral-100 transition shadow-md flex items-center gap-2 active:scale-95"
              >
                Start your free trial
                <ArrowRight className="w-4 h-4 text-neutral-900" />
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
          2. ISOMETRIC 3D PERSPECTIVE LAYERED DASHBOARDS
      ======================================================== */}
      <div className="relative w-full overflow-hidden pt-2 pb-16 select-none">
        {/* Soft overhead spotlight beam */}
        <div 
          className="absolute -top-12 right-1/4 w-[700px] h-[380px] rounded-full blur-[140px] pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(59,130,246,0.2) 50%, transparent 80%)' }}
        />

        {/* 3D Perspective Canvas Container */}
        <div 
          className="max-w-[1360px] mx-auto px-3 sm:px-6 relative"
          style={{ perspective: '1600px', perspectiveOrigin: '50% 15%' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 26 }}
            animate={{ opacity: 1, y: 0, rotateX: 20 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full"
            style={{
              transform: 'rotateX(20deg) rotateY(-7deg) rotateZ(8deg)',
              transformStyle: 'preserve-3d',
            }}
          >

            {/* ========================================================
                LAYER 1 (BACKWARD DASHBOARD): 8-STEP REASONING LEDGER & WHAT-IF LAB
            ======================================================== */}
            <div 
              className="absolute -top-12 sm:-top-16 -left-6 sm:-left-12 w-full z-10 opacity-55 scale-[0.93] rounded-2xl border border-neutral-700/70 bg-neutral-950/95 backdrop-blur-md overflow-hidden shadow-2xl pointer-events-none"
              style={{
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.08)'
              }}
            >
              {/* Window Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-800 bg-neutral-900/80">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 font-mono text-[11px] text-neutral-400">
                    fdl://engine/reasoning-ledger · MacBook Pro M3 (₹1,34,900) vs Bali Trip (₹65,000)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ledger Locked (Δ = 0)
                  </span>
                  <span className="text-neutral-500">·</span>
                  <span>5,000 Monte Carlo Runs</span>
                </div>
              </div>

              {/* Backward Dashboard Body: Reasoning Ledger & Scenarios */}
              <div className="p-6 space-y-4 font-mono text-xs text-neutral-300">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
                    <p className="text-[10px] text-neutral-400 uppercase">Starting Balance</p>
                    <p className="text-base font-bold text-white mt-1">₹1,85,000</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Liquid cash in HDFC</p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
                    <p className="text-[10px] text-neutral-400 uppercase">Expected Inflow</p>
                    <p className="text-base font-bold text-emerald-400 mt-1">+₹1,25,000</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Payroll credited 1st</p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
                    <p className="text-[10px] text-neutral-400 uppercase">Fixed Obligations</p>
                    <p className="text-base font-bold text-amber-400 mt-1">-₹46,450</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Rent + SIP + Bills</p>
                  </div>
                  <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800">
                    <p className="text-[10px] text-neutral-400 uppercase">Safety Floor</p>
                    <p className="text-base font-bold text-blue-400 mt-1">₹50,000</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Protected reserve</p>
                  </div>
                </div>

                {/* 8-Step Reasoning Ledger mini-table */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-neutral-800 pb-2">
                    <span>STEP &amp; AUDIT OPERATION</span>
                    <span>INTEGER VALUE</span>
                    <span>DELTA EFFECT</span>
                    <span>VERDICT STATUS</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] py-1 border-b border-neutral-800/40">
                    <span className="text-neutral-300">Step 1 · Extract opening statement balance</span>
                    <span className="font-bold text-white">18,500,000 paise</span>
                    <span className="text-neutral-400">₹1,85,000.00</span>
                    <span className="text-emerald-400">PASSED</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] py-1 border-b border-neutral-800/40">
                    <span className="text-neutral-300">Step 2 · Add salary credit (Infosys Payroll)</span>
                    <span className="font-bold text-emerald-400">+12,500,000 paise</span>
                    <span className="text-emerald-400">+₹1,25,000.00</span>
                    <span className="text-emerald-400">PASSED</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] py-1 border-b border-neutral-800/40">
                    <span className="text-neutral-300">Step 3 · Deduct verified recurring obligations</span>
                    <span className="font-bold text-amber-400">-4,645,000 paise</span>
                    <span className="text-amber-400">-₹46,450.00</span>
                    <span className="text-emerald-400">PASSED</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] py-1">
                    <span className="text-neutral-300">Step 6 · Deduct dynamic safety volatility buffer</span>
                    <span className="font-bold text-purple-400">-5,000,000 paise</span>
                    <span className="text-purple-400">-₹50,000.00</span>
                    <span className="text-emerald-400 font-bold">LOCKED</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================
                LAYER 2 (FOREGROUND DASHBOARD): PRIMARY FDL FINANCIAL DASHBOARD
            ======================================================== */}
            <div 
              className="relative z-20 w-full rounded-2xl border border-neutral-700/80 bg-neutral-900/95 text-neutral-100 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.12)] overflow-hidden backdrop-blur-xl"
            >
              {/* Window Title Bar */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-neutral-800 bg-neutral-950/90">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/90" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/90" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/90" />
                  <span className="ml-3 font-mono text-xs text-neutral-400 hidden sm:inline">
                    https://app.fdl.local/dashboard — Aarav Kumar (Primary HDFC Savings)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    100% Offline Air-Gapped
                  </span>
                </div>
              </div>

              {/* Dashboard Internal Frame: Mini-Sidebar + Main Content */}
              <div className="flex flex-col lg:flex-row min-h-[560px]">
                {/* ---------------- Mini Sidebar ---------------- */}
                <div className="w-full lg:w-56 bg-neutral-950 border-r border-neutral-800/80 p-4 flex flex-col justify-between shrink-0">
                  <div className="space-y-6">
                    {/* Brand */}
                    <div className="flex items-center gap-2.5 px-2 py-1">
                      <div className="flex items-end gap-1 h-5">
                        <span className="w-1 h-3 bg-emerald-400 rounded-xs" />
                        <span className="w-1 h-5 bg-emerald-400 rounded-xs" />
                        <span className="w-1 h-4 bg-emerald-400 rounded-xs" />
                      </div>
                      <span className="text-sm font-bold text-white tracking-tight">
                        FDL Studio
                      </span>
                    </div>

                    {/* Navigation Items */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/30">
                        <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                        <span>Dashboard</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-400 hover:text-white transition">
                        <UploadCloud className="w-4 h-4 text-neutral-500" />
                        <span>Upload Statement</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-400 hover:text-white transition">
                        <CreditCard className="w-4 h-4 text-neutral-500" />
                        <span>Transactions</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-400 hover:text-white transition">
                        <Clock className="w-4 h-4 text-neutral-500" />
                        <span>Recurring Bills</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-400 hover:text-white transition">
                        <Scale className="w-4 h-4 text-neutral-500" />
                        <span>Decision Lab</span>
                      </div>
                      <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-400 hover:text-white transition">
                        <Settings className="w-4 h-4 text-neutral-500" />
                        <span>Settings</span>
                      </div>
                    </div>
                  </div>

                  {/* Aarav Kumar User Profile Pill */}
                  <div className="pt-4 border-t border-neutral-800/80 flex items-center gap-2.5 px-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center">
                      AK
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white truncate">Aarav Kumar</p>
                      <p className="text-[10px] text-neutral-400 truncate">Salaried Engineer · HDFC</p>
                    </div>
                  </div>
                </div>

                {/* ---------------- Main Content Body ---------------- */}
                <div className="flex-1 p-5 sm:p-6 space-y-5 bg-neutral-900/90">
                  {/* Top Bar Greeting */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
                    <div>
                      <h3 className="text-lg font-bold text-white">Financial Decision Overview</h3>
                      <p className="text-xs text-neutral-400">
                        Welcome back, Aarav! Here is your verified headroom &amp; spend simulation.
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          readOnly
                          placeholder="Search transactions..."
                          className="bg-neutral-950 border border-neutral-800 text-xs rounded-lg pl-8 pr-3 py-1.5 w-44 text-neutral-300 focus:outline-none"
                        />
                      </div>
                      <div className="p-2 rounded-lg border border-neutral-800 bg-neutral-950 relative">
                        <Bell className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full absolute top-1.5 right-1.5" />
                      </div>
                    </div>
                  </div>

                  {/* 4 Financial KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Card 1 */}
                    <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium text-neutral-400">Total Liquid Funds</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                          <Wallet className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2 font-mono">
                        <p className="text-xl font-bold text-white">₹1,85,000</p>
                        <p className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                          +12% from last month
                        </p>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium text-neutral-400">Affordability Headroom</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2 font-mono">
                        <p className="text-xl font-bold text-white">+₹42,000</p>
                        <p className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                          P50 Median verified
                        </p>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium text-neutral-400">Safety Buffer</span>
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2 font-mono">
                        <p className="text-xl font-bold text-white">₹58,000</p>
                        <p className="text-[10px] font-semibold text-neutral-400 mt-0.5">
                          Floor + Essentials (k = 1.25)
                        </p>
                      </div>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium text-neutral-400">Data Gate Status</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="mt-2 font-mono">
                        <p className="text-xl font-bold text-white">100%</p>
                        <p className="text-[10px] font-semibold text-emerald-400 mt-0.5">
                          4/4 Sufficiency passed
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Middle Row: Area Chart + Donut Chart */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                    {/* Left: 90-Day Cash Flow Forecast Area Chart */}
                    <div className="lg:col-span-7 bg-neutral-950/80 border border-neutral-800 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-xs font-bold text-white">Revenue &amp; Cash-Flow Trajectory</h4>
                          <p className="text-[11px] text-neutral-400">5,000 Monte Carlo paths vs Buffer Floor</p>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-400 border border-neutral-800 px-2 py-0.5 rounded bg-neutral-900">
                          seed=42 (P10/P50/P90)
                        </span>
                      </div>

                      {/* SVG Line & Area Graphic */}
                      <div className="w-full h-36 pt-2 relative">
                        <svg className="w-full h-full overflow-visible" viewBox="0 0 400 120" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="heroChartGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Grid Lines */}
                          <line x1="0" y1="20" x2="400" y2="20" stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
                          <line x1="0" y1="60" x2="400" y2="60" stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
                          <line x1="0" y1="100" x2="400" y2="100" stroke="#334155" strokeDasharray="3 3" opacity="0.3" />

                          {/* Dynamic Safety Buffer Floor line (Dashed Amber) */}
                          <line x1="0" y1="85" x2="400" y2="85" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 4" />
                          <text x="310" y="80" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="bold">
                            ₹50,000 Buffer Floor
                          </text>

                          {/* Area Fill */}
                          <path
                            d="M0,80 Q50,45 100,55 T200,35 T300,50 T400,25 L400,120 L0,120 Z"
                            fill="url(#heroChartGradient)"
                          />

                          {/* Main Trajectory Line */}
                          <path
                            d="M0,80 Q50,45 100,55 T200,35 T300,50 T400,25"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2.5"
                          />

                          {/* P10 Conservative Line (Dotted) */}
                          <path
                            d="M0,80 Q50,60 100,70 T200,55 T300,68 T400,45"
                            fill="none"
                            stroke="#34d399"
                            strokeWidth="1.2"
                            strokeDasharray="2 2"
                            opacity="0.7"
                          />

                          {/* Indicator Dot */}
                          <circle cx="200" cy="35" r="4" fill="#10b981" stroke="#000" strokeWidth="2" />
                        </svg>

                        {/* Chart Tooltip Overlay */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-[10px] font-mono text-white shadow-md flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span>P50 Net Headroom: +₹42,000 (Safe)</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Spending Breakdown Donut Chart */}
                    <div className="lg:col-span-5 bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">Spend by Category</h4>
                        <span className="text-[10px] text-neutral-400 font-mono">Aug 2026</span>
                      </div>

                      <div className="flex items-center justify-center gap-4 py-2">
                        {/* SVG Donut */}
                        <div className="relative w-24 h-24 shrink-0">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#262626" strokeWidth="4" />
                            {/* Rent 38% */}
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="33 100" strokeDashoffset="0" />
                            {/* Groceries 24% */}
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#3b82f6" strokeWidth="4" strokeDasharray="21 100" strokeDashoffset="-33" />
                            {/* Utilities 14% */}
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="12 100" strokeDashoffset="-54" />
                            {/* Discretionary 24% */}
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#8b5cf6" strokeWidth="4" strokeDasharray="21 100" strokeDashoffset="-66" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                            <span className="text-xs font-bold text-white">₹74.6k</span>
                            <span className="text-[8px] text-neutral-400">Total</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="space-y-1 text-[11px] font-mono">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-neutral-400">Rent (38%)</span>
                            <span className="text-white font-bold ml-auto">₹28k</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400" />
                            <span className="text-neutral-400">Groceries (24%)</span>
                            <span className="text-white font-bold ml-auto">₹18k</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="text-neutral-400">Utilities (14%)</span>
                            <span className="text-white font-bold ml-auto">₹10.5k</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-400" />
                            <span className="text-neutral-400">Other (24%)</span>
                            <span className="text-white font-bold ml-auto">₹18.1k</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Decision Card + Real Bank Ingestion Feed */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                    {/* Decision Card */}
                    <div className="lg:col-span-6 p-3.5 rounded-xl bg-neutral-950/80 border border-emerald-500/40 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-neutral-400">Simulated Purchase Inquiry</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] border border-emerald-500/30">
                          AFFORDABLE
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between font-mono">
                        <span className="text-sm font-semibold text-white">Apple MacBook Pro 16&quot;</span>
                        <span className="text-base font-bold text-emerald-400">₹1,34,900</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800 text-[11px] font-mono">
                        <span className="text-neutral-400">Post-purchase headroom</span>
                        <span className="text-emerald-400 font-bold">+₹38,200 beyond buffer</span>
                      </div>
                    </div>

                    {/* Ingestion Feed */}
                    <div className="lg:col-span-6 p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800 space-y-2 font-mono text-xs">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-neutral-800/80 pb-1">
                        <span>LATEST VERIFIED TRANSACTIONS</span>
                        <span className="text-emerald-400">RECONCILED</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-white">Infosys Monthly Payroll</span>
                        <span className="text-emerald-400 font-bold">+₹1,25,000.00</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-neutral-300">Landlord Monthly Rent</span>
                        <span className="text-red-400 font-bold">-₹28,000.00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </div>

        {/* Bottom subtle radial vignette fade */}
        <div className="absolute -bottom-6 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none z-30" />
      </div>
    </section>
  );
}

export default PerspectiveHero;
