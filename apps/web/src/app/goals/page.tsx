'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  TrendingUp, 
  Clock, 
  ShieldCheck, 
  Bike, 
  Laptop, 
  Plane, 
  Shield, 
  Home, 
  GraduationCap, 
  Coins, 
  Zap, 
  Info,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  Wallet,
  Check
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { api } from '@/lib/api';
import { formatINR } from '@fdl/shared';
import type { Goal, GoalOptimizationResult, GoalMilestone } from '@fdl/shared';

// Starter suggestions for quick exploration
const STARTER_GOALS = [
  { label: 'A bike of 55k', icon: Bike, query: 'a bike of 55k' },
  { label: 'MacBook Air for 1.15 lakh', icon: Laptop, query: 'buy MacBook Air for 1.15 lakh' },
  { label: 'Goa vacation 35000', icon: Plane, query: 'Goa vacation 35000' },
  { label: 'Emergency fund 1.5L', icon: Shield, query: 'save 1.5 lakh for emergency fund' },
];

export default function GoalsPlannerPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [addingGoal, setAddingGoal] = useState(false);
  const [promptInput, setPromptInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Optimization data from backend
  const [optData, setOptData] = useState<GoalOptimizationResult | null>(null);

  // Selected recurring IDs: all active by default
  const [excludedRecurringIds, setExcludedRecurringIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  // Load goals on mount
  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoadingGoals(true);
    setErrorMsg(null);
    try {
      const res = await api.getGoals();
      const userGoals: Goal[] = res.goals || [];
      setGoals(userGoals);

      // Trigger optimization ONLY IF user has at least one goal
      if (userGoals.length > 0) {
        runOptimization(excludedRecurringIds);
      } else {
        setOptData(null);
      }
    } catch (err: any) {
      console.error('Failed to load goals:', err);
      setErrorMsg('Could not fetch financial goals. Please check your connection.');
    } finally {
      setLoadingGoals(false);
    }
  };

  const runOptimization = async (excludedIds: string[]) => {
    setOptimizing(true);
    try {
      const res = await api.optimizeGoals(excludedIds);
      if (res && res.data) {
        setOptData(res.data);
      }
    } catch (err: any) {
      console.error('Failed to run optimization:', err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleAddGoal = async (queryText?: string) => {
    const textToSubmit = (queryText || promptInput).trim();
    if (!textToSubmit) return;

    setAddingGoal(true);
    setErrorMsg(null);
    try {
      const res = await api.createGoal({ parse_prompt: textToSubmit });
      if (res && res.goal) {
        setPromptInput('');
        const updatedGoals = [...goals, res.goal];
        setGoals(updatedGoals);
        // Automatically optimize with the new goal added
        runOptimization(excludedRecurringIds);
      }
    } catch (err: any) {
      console.error('Failed to add goal:', err);
      setErrorMsg(err.message || 'Could not parse or create goal. Please try again.');
    } finally {
      setAddingGoal(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await api.deleteGoal(goalId);
      const remaining = goals.filter((g) => g.id !== goalId);
      setGoals(remaining);
      if (remaining.length > 0) {
        runOptimization(excludedRecurringIds);
      } else {
        setOptData(null);
      }
    } catch (err: any) {
      console.error('Failed to delete goal:', err);
      setErrorMsg('Could not delete goal.');
    }
  };

  // Toggle recurring expense checkbox (Mentor's interactive flow)
  const handleToggleRecurring = (itemId: string) => {
    startTransition(() => {
      setExcludedRecurringIds((prev) => {
        let next: string[];
        if (prev.includes(itemId)) {
          // Re-include (check it again)
          next = prev.filter((id) => id !== itemId);
        } else {
          // Deselect (uncheck it -> cancel/pause this expense)
          next = [...prev, itemId];
        }
        // Run optimization with the updated selection
        runOptimization(next);
        return next;
      });
    });
  };

  // Category Icon Resolver
  const getCategoryIcon = (category: string) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('vehicle') || cat.includes('bike') || cat.includes('car')) return Bike;
    if (cat.includes('gadget') || cat.includes('laptop') || cat.includes('tech')) return Laptop;
    if (cat.includes('travel') || cat.includes('trip') || cat.includes('vacation')) return Plane;
    if (cat.includes('emergency') || cat.includes('buffer')) return Shield;
    if (cat.includes('house') || cat.includes('home')) return Home;
    if (cat.includes('education') || cat.includes('school')) return GraduationCap;
    return Target;
  };

  // Compute live client-side stats for instant feedback
  const clientFreedPaise = useMemo(() => {
    if (!optData || !optData.recurring_items) return 0;
    return optData.recurring_items
      .filter((item) => excludedRecurringIds.includes(item.id))
      .reduce((acc, item) => acc + item.amount_minor, 0);
  }, [optData, excludedRecurringIds]);

  const clientOptimizedSavingsPaise = useMemo(() => {
    if (!optData) return 0;
    return optData.baseline_monthly_savings_minor + clientFreedPaise;
  }, [optData, clientFreedPaise]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Page Title */}
      <div className="py-2 border-b border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold text-foreground flex items-center gap-2 flex-wrap">
              <span>Goals &amp; Expense Optimizer</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                Google Gemini 1.5 Flash
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 hidden sm:inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                100% Math Verified
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Deterministic savings milestones powered by verified cash flow and Google Gemini NLP.
            </div>
          </div>
        </div>

        {/* Global Action / Recalculate */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {goals.length > 0 && (
            <button
              onClick={() => runOptimization(excludedRecurringIds)}
              disabled={optimizing}
              className="h-9 inline-flex items-center gap-1.5 px-3 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${optimizing ? 'animate-spin text-emerald-500' : ''}`} />
              <span>Recalculate</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Natural Language Goal Input Card */}
      <div className="rounded-2xl border border-border dark:border-neutral-800 bg-card/60 dark:bg-card/40 p-4 md:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Set a Financial Goal with AI
          </span>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Press Enter or click Add Goal
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
              <Target className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !addingGoal && handleAddGoal()}
              placeholder="e.g. A bike of 55k, Goa vacation ₹35,000, or MacBook Air for 1.15 lakh..."
              disabled={addingGoal}
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-card dark:bg-[#111111] border border-border dark:border-neutral-800 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-xs md:text-sm font-medium transition shadow-xs"
            />
          </div>
          <button
            onClick={() => handleAddGoal()}
            disabled={addingGoal || !promptInput.trim()}
            className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs md:text-sm transition shadow-xs disabled:opacity-50 cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            {addingGoal ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Parsing with Gemini...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Add Goal</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Starter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
            Suggestions:
          </span>
          {STARTER_GOALS.map((starter) => {
            const Icon = starter.icon;
            return (
              <button
                key={starter.label}
                onClick={() => handleAddGoal(starter.query)}
                disabled={addingGoal}
                className="text-xs px-3 py-1.5 rounded-full bg-card dark:bg-[#111111] hover:bg-muted border border-border dark:border-neutral-800 hover:border-emerald-500/50 text-foreground transition shrink-0 whitespace-nowrap cursor-pointer shadow-2xs font-medium inline-flex items-center gap-1.5"
              >
                <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{starter.label}</span>
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-500 dark:text-rose-400 text-xs mt-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* 3. Conditional Rendering: Empty State vs Full Goals Dashboard */}
      {loadingGoals ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-3">
          <RefreshCw className="w-7 h-7 animate-spin text-emerald-500" />
          <p className="text-xs font-medium">Analyzing verified accounts and calculating milestones...</p>
        </div>
      ) : goals.length === 0 ? (
        /* Zero Goals Empty State — ZERO HEAVY AI OPTIMIZATION CALLS */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-border bg-card/40 p-8 md:p-14 text-center space-y-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Target className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base md:text-lg font-bold text-foreground">No Financial Goals Added Yet</h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Add your target purchase or dream milestone above (e.g. <i>"a bike of 55k"</i>). We will compute the exact completion timeline and show which recurring subscriptions you can pause to reach it faster!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto pt-4 text-left">
            {STARTER_GOALS.map((starter) => {
              const Icon = starter.icon;
              return (
                <div
                  key={starter.label}
                  onClick={() => handleAddGoal(starter.query)}
                  className="cursor-pointer p-3.5 rounded-xl bg-card border border-border hover:border-emerald-500/50 transition shadow-xs group"
                >
                  <Icon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-semibold text-foreground">{starter.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    Click to add <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : (
        /* Full Goals Dashboard */
        <div className="space-y-6">
          
          {/* Top KPI Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-xs">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Total Target</span>
                <Target className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-lg md:text-xl font-bold text-foreground mt-1.5">
                {optData ? formatINR(optData.total_target_minor) : '...'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Across {goals.length} active {goals.length === 1 ? 'goal' : 'goals'}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-xs">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Baseline Savings</span>
                <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
              </div>
              <div className="text-lg md:text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-1.5">
                {optData ? `${formatINR(optData.baseline_monthly_savings_minor)}/mo` : '...'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Savings Rate: {optData ? `${optData.savings_rate_pct}%` : '0%'}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-xs">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Freed from Subs</span>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-lg md:text-xl font-bold text-amber-600 dark:text-amber-400 mt-1.5">
                {clientFreedPaise > 0 ? `+${formatINR(clientFreedPaise)}/mo` : '₹0/mo'}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {excludedRecurringIds.length} {excludedRecurringIds.length === 1 ? 'expense paused' : 'expenses paused'}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-xs">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Effective Savings</span>
                <Coins className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-lg md:text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1.5">
                {formatINR(clientOptimizedSavingsPaise)}/mo
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">
                {clientFreedPaise > 0 ? 'Accelerated timeline active' : 'All subscriptions active'}
              </div>
            </div>
          </div>

          {/* Gemini AI Advisory Callout */}
          {optData?.ai_advisory && (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4 md:p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                      Gemini Advisory &amp; Milestone Blueprint
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                      Verified Facts
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    {optData.ai_advisory.headline}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {optData.ai_advisory.summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Active Goals Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-500" />
                <h2 className="text-sm font-bold text-foreground">Your Active Goals</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Priority order
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {goals.map((g) => {
                const Icon = getCategoryIcon(g.category);
                const milestone = optData?.milestones.find((m) => m.goal_id === g.id);

                return (
                  <div
                    key={g.id}
                    className="rounded-2xl border border-border bg-card/60 hover:border-border/90 p-4 md:p-5 shadow-xs transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-foreground">{g.title}</h3>
                            <span className="text-[11px] text-muted-foreground capitalize">{g.category || 'Goal'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          title="Delete goal"
                          className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="mt-4">
                        <div className="text-[11px] text-muted-foreground">Target Amount</div>
                        <div className="text-lg font-bold text-foreground">
                          {formatINR(g.target_amount_minor)}
                        </div>
                      </div>

                      {/* Milestone timeline information */}
                      {milestone && (
                        <div className="mt-3.5 space-y-2 pt-3 border-t border-border/50">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Baseline Horizon:</span>
                            <span className="font-semibold text-foreground">{milestone.baseline_months}m ({milestone.baseline_date})</span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Optimized Horizon:</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {milestone.optimized_months}m ({milestone.optimized_date})
                            </span>
                          </div>

                          {milestone.months_saved > 0 && (
                            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                              <Sparkles className="w-3.5 h-3.5 shrink-0" />
                              <span>Saves {milestone.months_saved} months with paused subscriptions!</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 5. Mentor's Interactive Recurring Expense Checkbox Optimizer */}
          {optData && optData.recurring_items.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/60 p-4 md:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-500" />
                    Recurring Expense Optimizer
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    All recurring expenses are checked by default. <b>Uncheck</b> any subscription to simulate pausing it and see your timeline accelerate!
                  </p>
                </div>

                {clientFreedPaise > 0 ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold self-start sm:self-auto">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <span>+{formatINR(clientFreedPaise)}/mo unlocked for your goals!</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground self-start sm:self-auto">
                    Uncheck subscriptions below to test cuts
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {optData.recurring_items.map((item) => {
                  const isChecked = !excludedRecurringIds.includes(item.id);

                  return (
                    <label
                      key={item.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-muted/30 border-border hover:bg-muted/60'
                          : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRecurring(item.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-border bg-card cursor-pointer accent-emerald-600"
                        />
                        <div>
                          <div className={`text-xs font-semibold ${!isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {item.merchant}
                          </div>
                          <div className="text-[10px] text-muted-foreground capitalize">
                            {item.type} • {item.cadence}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-xs font-bold ${!isChecked ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-foreground'}`}>
                          {formatINR(item.amount_minor)}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {isChecked ? 'active commitment' : 'freed to savings'}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. Dynamic Recharts Projection Timeline Chart */}
          {optData && optData.projection_graph.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/60 p-4 md:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    24-Month Goal Accumulation Trajectory
                  </h2>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Baseline savings trajectory compared with optimized savings trajectory.
                  </p>
                </div>
                
                <div className="flex items-center gap-3 text-xs font-medium self-start sm:self-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                    <span className="text-muted-foreground">Baseline</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Optimized</span>
                  </div>
                </div>
              </div>

              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={optData.projection_graph} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="optGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="baseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                    <XAxis
                      dataKey="month_label"
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={10}
                      tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatINR(Number(val)), '']}
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: '0.75rem',
                        fontSize: '0.75rem',
                        color: 'var(--card-foreground)'
                      }}
                    />
                    <ReferenceLine
                      y={optData.total_target_minor}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: `Target: ${formatINR(optData.total_target_minor)}`,
                        fill: '#f59e0b',
                        fontSize: 10,
                        position: 'top'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="baseline_saved_minor"
                      name="Baseline Trajectory"
                      stroke="#06b6d4"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#baseGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="optimized_saved_minor"
                      name="Optimized Trajectory"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#optGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
