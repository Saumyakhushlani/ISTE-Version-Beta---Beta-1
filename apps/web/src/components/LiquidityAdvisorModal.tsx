'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Coins,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Calendar,
  Wallet,
  Copy,
  Check,
  ArrowLeftRight,
  TrendingUp,
  Sparkles,
  Info
} from 'lucide-react';
import { formatINR, rupeesToPaise } from '@fdl/shared';
import { api } from '@/lib/api';

interface LiquidityAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmountRs?: number | string;
  initialLabel?: string;
}

const PRESET_AMOUNTS = [50000, 100000, 150000, 250000, 500000];
const PRESET_LABELS = [
  'Major Purchase',
  'Fixed Deposit (FD)',
  'Mutual Fund Lumpsum',
  'Emergency Reserve'
];

export default function LiquidityAdvisorModal({
  isOpen,
  onClose,
  initialAmountRs = '150000',
  initialLabel = 'Fixed Deposit (FD)',
}: LiquidityAdvisorModalProps) {
  const [amountRs, setAmountRs] = useState<string>(initialAmountRs.toString());
  const [label, setLabel] = useState<string>(initialLabel);
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialAmountRs) setAmountRs(initialAmountRs.toString());
      if (initialLabel) setLabel(initialLabel);
      fetchAdvice(initialAmountRs.toString(), initialLabel);
    }
  }, [isOpen, initialAmountRs, initialLabel]);

  async function fetchAdvice(amtStr: string = amountRs, lblStr: string = label) {
    const num = parseFloat(amtStr);
    if (isNaN(num) || num <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const paise = rupeesToPaise(num);
      const res = await api.getLiquidityAdvice(paise, lblStr);
      setAdvice(res);
    } catch (err: any) {
      console.error('Failed to get liquidity advice:', err);
      setError(err?.message || 'Failed to calculate liquidity sourcing advice.');
    } finally {
      setLoading(false);
    }
  }

  function handlePresetAmount(amt: number) {
    setAmountRs(amt.toString());
    fetchAdvice(amt.toString(), label);
  }

  function handlePresetLabel(lbl: string) {
    setLabel(lbl);
    fetchAdvice(amountRs, lbl);
  }

  function copyPlanText() {
    if (!advice) return;
    const lines = [
      `MULTI-BANK SOURCING & TRANSFER PLAN`,
      `Purpose: ${label}`,
      `Target Amount: ${formatINR(advice.target_amount_paise)}`,
      `Verdict: ${advice.verdict}`,
      ``,
      `Recommendation:`,
      advice.advice_text || advice.recommendation,
      ``,
    ];

    if (advice.transfers_plan && advice.transfers_plan.length > 0) {
      lines.push(`TRANSFER STEPS:`);
      advice.transfers_plan.forEach((t: any, i: number) => {
        lines.push(
          `${i + 1}. Transfer ${formatINR(t.transfer_amount_paise)} from ${t.from_bank} (••••${t.from_masked}) to ${t.to_bank} (••••${t.to_masked})`
        );
      });
      lines.push(``);
    }

    lines.push(`PER-ACCOUNT ALLOCATION:`);
    advice.accounts_surplus_breakdown.forEach((acct: any) => {
      const alloc = advice.allocation?.find((a: any) => a.bank === acct.bank);
      lines.push(
        `- ${acct.bank} (••••${acct.masked_last4}): Balance ${formatINR(acct.current_balance_paise)} | Reserved Bills ${formatINR(acct.upcoming_commitments_paise)} | Usable Surplus ${formatINR(acct.available_surplus_paise)} | Allocated: ${alloc ? formatINR(alloc.amount_paise) : '₹0'}`
      );
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-10 text-card-foreground flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-500">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Multi-Bank Fund Sourcing & Liquidity Advisor
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Calculates optimal cross-account withdrawal plans while safeguarding upcoming bill reserves and safety buffers.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 overflow-y-auto space-y-6">
            {/* Input Controls */}
            <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target Amount */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    Target Deployment Amount (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-mono text-muted-foreground">₹</span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      value={amountRs}
                      onChange={(e) => setAmountRs(e.target.value)}
                      placeholder="e.g. 150000"
                      className="w-full bg-input border border-border rounded-xl pl-8 pr-4 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                    />
                  </div>
                </div>

                {/* Purpose Label */}
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    Deployment Purpose / Label
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Fixed Deposit, MacBook, SIP"
                    className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                  />
                </div>
              </div>

              {/* Preset Chips */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground font-semibold">Quick Amounts:</span>
                    {PRESET_AMOUNTS.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => handlePresetAmount(amt)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-semibold transition border ${
                          amountRs === amt.toString()
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-muted-foreground border-border hover:text-foreground'
                        }`}
                      >
                        {formatINR(amt * 100)}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchAdvice()}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold shadow-xs hover:opacity-90 transition disabled:opacity-50"
                  >
                    {loading ? <span className="animate-spin text-xs">⏳</span> : <ArrowRight className="w-3.5 h-3.5" />}
                    <span>Optimize Sourcing</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground font-semibold">Purpose:</span>
                  {PRESET_LABELS.map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => handlePresetLabel(lbl)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition border ${
                        label === lbl
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                          : 'bg-card text-muted-foreground border-border hover:text-foreground'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Results View */}
            {advice && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                {/* Feasibility Verdict Banner */}
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    advice.feasible
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                      : 'bg-destructive/10 border-destructive/30 text-destructive'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        advice.feasible ? 'bg-emerald-500/20 text-emerald-600' : 'bg-destructive/20 text-destructive'
                      }`}
                    >
                      {advice.feasible ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {advice.feasible
                          ? `Feasible Sourcing Plan — 100% Bill & Safety Protected`
                          : `Tight Liquidity / Insufficient Idle Surplus`}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {advice.advice_text || advice.recommendation}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={copyPlanText}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition shrink-0 self-end sm:self-center shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied Plan!' : 'Copy Plan'}</span>
                  </button>
                </div>

                {/* Key Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl bg-card border border-border">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Target Deployment
                    </span>
                    <p className="text-xl font-bold font-mono text-foreground mt-1">
                      {formatINR(advice.target_amount_paise)}
                    </p>
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card border border-border">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Liquid Balance
                    </span>
                    <p className="text-xl font-bold font-mono text-foreground mt-1">
                      {formatINR(advice.combined_liquid_paise)}
                    </p>
                    <span className="text-[10px] text-muted-foreground">Across all linked accounts</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-card border border-border">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Usable Idle Surplus
                    </span>
                    <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                      {formatINR(advice.total_safe_surplus_paise)}
                    </p>
                    <span className="text-[10px] text-muted-foreground">After bill reserves & floor buffer</span>
                  </div>
                </div>

                {/* Inter-Account Transfer Steps (if transfers are required) */}
                {advice.transfers_plan && advice.transfers_plan.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                    <div className="flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-amber-500" />
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        Required Inter-Account Transfer Steps ({advice.transfers_plan.length})
                      </h4>
                    </div>

                    <div className="space-y-2">
                      {advice.transfers_plan.map((t: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-card border border-border text-xs gap-2"
                        >
                          <div className="flex items-center gap-2 font-mono">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 font-bold text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-foreground">{t.from_bank}</span>
                            <span className="text-muted-foreground">••••{t.from_masked}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-primary" />
                            <span className="font-semibold text-foreground">{t.to_bank}</span>
                            <span className="text-muted-foreground">••••{t.to_masked}</span>
                          </div>

                          <span className="font-mono font-bold text-primary sm:text-right">
                            {formatINR(t.transfer_amount_paise)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-Account Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-primary" />
                    Account Reserves & Sourcing Allocation
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {advice.accounts_surplus_breakdown?.map((acct: any) => {
                      const alloc = advice.allocation?.find((a: any) => a.bank === acct.bank);
                      const allocAmount = alloc ? alloc.amount_paise : 0;

                      return (
                        <div
                          key={acct.account_id}
                          className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3"
                        >
                          {/* Account Header */}
                          <div className="flex items-center justify-between border-b border-border/60 pb-2">
                            <div>
                              <p className="font-bold text-foreground text-xs">{acct.bank}</p>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                Ending in ••••{acct.masked_last4}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-muted-foreground uppercase">Current Balance</span>
                              <p className="font-mono font-bold text-foreground text-xs">
                                {formatINR(acct.current_balance_paise)}
                              </p>
                            </div>
                          </div>

                          {/* Reserves breakdown */}
                          <div className="space-y-1.5 text-[11px] font-mono">
                            <div className="flex justify-between text-muted-foreground">
                              <span>Upcoming 30-Day Bills:</span>
                              <span className="font-semibold text-destructive">
                                -{formatINR(acct.upcoming_commitments_paise)}
                              </span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Safety Floor Reserve:</span>
                              <span className="font-semibold text-muted-foreground">
                                -{formatINR(acct.safety_buffer_paise)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-border/60 text-foreground font-semibold">
                              <span>Safe Idle Surplus:</span>
                              <span
                                className={
                                  acct.available_surplus_paise >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                    : 'text-destructive font-bold'
                                }
                              >
                                {formatINR(acct.available_surplus_paise)}
                              </span>
                            </div>
                          </div>

                          {/* Allocation Contribution */}
                          <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground font-semibold">Withdrawal Contribution:</span>
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold ${
                                allocAmount > 0
                                  ? 'bg-primary/15 text-primary border border-primary/25'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {allocAmount > 0 ? formatINR(allocAmount) : '₹0'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-border bg-muted/30">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-card border border-border text-xs font-semibold hover:bg-muted text-foreground transition"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
