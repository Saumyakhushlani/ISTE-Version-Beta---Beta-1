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
  Layers
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

  // Compute live client-side stats for instant 60fps feedback
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
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 p-4 md:p-8 space-y-8 max-w-7xl mx-auto transition-colors duration-200">
      
      {/* 1. Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Goals & Expense Optimizer</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                Deterministic savings milestones powered by verified cash flow and Google Gemini NLP.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action / Status */}
        <div className="flex items-center gap-2">
          {goals.length > 0 && (
            <button
              onClick={() => runOptimization(excludedRecurringIds)}
              disabled={optimizing}
              className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${optimizing ? 'animate-spin text-emerald-500' : ''}`} />
              Recalculate
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Natural Language Goal Input Bar */}
      <div className="relative rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 transition-all">
        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Add a Financial Goal with AI
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !addingGoal && handleAddGoal()}
                placeholder="e.g. A bike of 55k, Goa vacation ₹35,000, or MacBook Air for 1.15 lakh..."
                disabled={addingGoal}
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-medium transition-all"
              />
            </div>
            <button
              onClick={() => handleAddGoal()}
              disabled={addingGoal || !promptInput.trim()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {addingGoal ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Parsing Goal...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add Goal
                </>
              )}
            </button>
          </div>

          {/* Quick Starter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs text-slate-400 dark:text-slate-500 mr-1">Suggestions:</span>
            {STARTER_GOALS.map((starter) => {
              const Icon = starter.icon;
              return (
                <button
                  key={starter.label}
                  onClick={() => handleAddGoal(starter.query)}
                  disabled={addingGoal}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800/80 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{starter.label}</span>
                </button>
              );
            })}
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 mt-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* 3. Conditional Rendering: Empty State vs Full Dashboard */}
      {loadingGoals ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm">Loading your financial goals and cash flow...</p>
        </div>
      ) : goals.length === 0 ? (
        /* Zero Goals Empty State — NO HEAVY API CALLS TRIGGERED */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-8 md:p-16 text-center bg-white/50 dark:bg-slate-950/50"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
            <Target className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold">No Financial Goals Added Yet</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
            Set your target purchase or dream milestone above (e.g. <i>"a bike of 55k"</i>). We will calculate the exact months needed and show which recurring subscriptions you can pause to reach it faster!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto mt-8 text-left">
            {STARTER_GOALS.map((starter) => {
              const Icon = starter.icon;
              return (
                <div
                  key={starter.label}
                  onClick={() => handleAddGoal(starter.query)}
                  className="cursor-pointer p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all shadow-sm hover:shadow"
                >
                  <Icon className="w-5 h-5 text-emerald-500 mb-2" />
                  <div className="text-xs font-semibold">{starter.label}</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
                    Click to add <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      ) : (
        /* Full Goals Dashboard */
        <div className="space-y-8">
          
          {/* Top KPI Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Total Target Needed</span>
                <Target className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold mt-2">
                {optData ? formatINR(optData.total_target_minor) : '...'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Across {goals.length} active {goals.length === 1 ? 'goal' : 'goals'}
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Baseline Monthly Savings</span>
                <TrendingUp className="w-4 h-4 text-cyan-500" />
              </div>
              <div className="text-2xl font-bold mt-2 text-cyan-600 dark:text-cyan-400">
                {optData ? `${formatINR(optData.baseline_monthly_savings_minor)}/mo` : '...'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Savings Rate: {optData ? `${optData.savings_rate_pct}%` : '0%'}
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Freed from Unchecked Subs</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold mt-2 text-amber-600 dark:text-amber-400">
                {clientFreedPaise > 0 ? `+${formatINR(clientFreedPaise)}/mo` : '₹0/mo'}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {excludedRecurringIds.length} {excludedRecurringIds.length === 1 ? 'payment paused' : 'payments paused'}
              </div>
            </div>

            <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Effective Monthly Savings</span>
                <Coins className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-bold mt-2 text-emerald-600 dark:text-emerald-400">
                {formatINR(clientOptimizedSavingsPaise)}/mo
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                {clientFreedPaise > 0 ? 'Accelerated timeline active' : 'All subscriptions active'}
              </div>
            </div>
          </div>

          {/* AI Advisory Callout */}
          {optData?.ai_advisory && (
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-transparent border border-emerald-500/20 p-5 md:p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Gemini Advisory & Milestone Blueprint
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                      100% Math Verified
                    </span>
                  </div>
                  <h3 className="text-base font-bold mt-1 text-slate-900 dark:text-slate-100">
                    {optData.ai_advisory.headline}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {optData.ai_advisory.summary}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 4. Active Goals Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-500" />
                Your Active Goals
              </h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Sorted by target priority
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((g) => {
                const Icon = getCategoryIcon(g.category);
                const milestone = optData?.milestones.find((m) => m.goal_id === g.id);

                return (
                  <div
                    key={g.id}
                    className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-slate-800">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{g.title}</h3>
                            <span className="text-[11px] text-slate-400 capitalize">{g.category || 'Goal'}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          title="Delete goal"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs text-slate-400">Target Amount</div>
                        <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {formatINR(g.target_amount_minor)}
                        </div>
                      </div>

                      {/* Milestone timeline information */}
                      {milestone && (
                        <div className="mt-4 space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Baseline Horizon:</span>
                            <span className="font-semibold">{milestone.baseline_months} months ({milestone.baseline_date})</span>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Optimized Horizon:</span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {milestone.optimized_months} months ({milestone.optimized_date})
                            </span>
                          </div>

                          {milestone.months_saved > 0 && (
                            <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                              <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
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
            <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-emerald-500" />
                    Recurring Expense Optimizer
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    All recurring expenses are checked by default. <b>Uncheck</b> any subscription to pause it and see how much faster you achieve your goals!
                  </p>
                </div>

                {clientFreedPaise > 0 ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <Zap className="w-4 h-4 text-emerald-500" />
                    <span>+{formatINR(clientFreedPaise)}/month freed for your goals!</span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    Uncheck subscriptions below to simulate cuts
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                {optData.recurring_items.map((item) => {
                  const isChecked = !excludedRecurringIds.includes(item.id);

                  return (
                    <label
                      key={item.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          : 'bg-rose-50/20 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRecurring(item.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer"
                        />
                        <div>
                          <div className={`text-sm font-semibold ${!isChecked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`}>
                            {item.merchant}
                          </div>
                          <div className="text-[11px] text-slate-400 capitalize">
                            {item.type} • {item.cadence}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className={`text-sm font-bold ${!isChecked ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-slate-700 dark:text-slate-300'}`}>
                          {formatINR(item.amount_minor)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isChecked ? 'active expense' : 'freed to savings'}
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
            <div className="rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    24-Month Goal Accumulation Trajectory
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Comparison between your baseline savings run-rate vs optimized savings with paused expenses.
                  </p>
                </div>
                
                <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-cyan-500" />
                    <span className="text-slate-600 dark:text-slate-400">Baseline Savings</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Optimized Savings</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={optData.projection_graph} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="optGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="baseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis
                      dataKey="month_label"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}k`}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatINR(Number(val)), '']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '0.75rem',
                        color: '#f8fafc'
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
                      strokeWidth={2.5}
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
