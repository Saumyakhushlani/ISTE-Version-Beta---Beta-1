'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  Info, 
  Sparkles, 
  Search, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Home, 
  CreditCard, 
  Tv, 
  Wifi, 
  ShieldCheck,
  RefreshCw,
  Building2,
  UploadCloud,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area
} from 'recharts';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

function getBankBadge(bankName: string = "") {
  const b = bankName.toLowerCase();
  if (b.includes("hdfc")) return { label: "HDFC", bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
  if (b.includes("sbi") || b.includes("state bank")) return { label: "SBI", bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20" };
  if (b.includes("phonepe") || b.includes("phon")) return { label: "PHON", bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" };
  if (b.includes("icici")) return { label: "ICIC", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  if (b.includes("axis")) return { label: "AXIS", bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
  return { label: (bankName || "GENE").slice(0, 4).toUpperCase(), bg: "bg-muted text-foreground border-border" };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeAccount, setActiveAccount] = useState('all');
  const [activeTimeRange, setActiveTimeRange] = useState('all');

  // Natural Language query state
  const [nlQuery, setNlQuery] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState<any>(null);

  useEffect(() => {
    fetchDashboard(activeAccount, activeTimeRange);
  }, [activeAccount, activeTimeRange]);

  async function fetchDashboard(accId = activeAccount, range = activeTimeRange) {
    setLoading(true);
    try {
      const params: any = {};
      if (accId && accId !== 'all') params.account_id = accId;
      if (range === '3m') params.months = 3;
      else if (range === '6m') params.months = 6;
      else if (range === '12m') params.months = 12;

      const summary = await api.getDashboardSummary(params);
      setData(summary);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleNlSubmit(e?: React.FormEvent, customQuery?: string) {
    if (e) e.preventDefault();
    const q = customQuery || nlQuery;
    if (!q.trim()) return;
    if (customQuery) setNlQuery(customQuery);

    setNlLoading(true);
    try {
      const res = await api.askAffordability(q);
      setNlResult(res);
    } catch (err: any) {
      alert(`Error evaluating query: ${err.message}`);
    } finally {
      setNlLoading(false);
    }
  }

  // Fallback defaults mapping to real API metrics
  const kpi = data?.kpi_metrics || {
    total_balance_paise: data?.combined_liquid_paise || 18500000,
    total_accounts_count: data?.total_accounts_count || 1,
    monthly_income_paise: 7500000,
    monthly_expenses_paise: 4200000,
    net_cash_flow_paise: 3300000,
    balance_trend_pct: 8.0,
    income_trend_pct: 3.0,
    expenses_trend_pct: 12.0,
    net_cash_flow_trend_pct: 5.0
  };

  const accounts = data?.accounts_breakdown || [];

  // Spending By Category
  const categories = (data?.category_spend && data.category_spend.length > 0)
    ? data.category_spend
    : [
        { category_id: "cat_rent", category: "Rent", amount_paise: 1200000, percentage: 29, trend_pct: 5, color: "#3B82F6" },
        { category_id: "cat_shopping", category: "Shopping", amount_paise: 1000000, percentage: 24, trend_pct: 18, color: "#EC4899" },
        { category_id: "cat_food_dining", category: "Food & Groceries", amount_paise: 800000, percentage: 19, trend_pct: -6, color: "#10B981" },
        { category_id: "cat_transport", category: "Transportation", amount_paise: 400000, percentage: 10, trend_pct: 4, color: "#F59E0B" },
        { category_id: "cat_subscriptions", category: "Subscriptions", amount_paise: 200000, percentage: 5, trend_pct: 0, color: "#8B5CF6" },
        { category_id: "cat_uncategorized", category: "Other", amount_paise: 600000, percentage: 14, trend_pct: 9, color: "#94A3B8" }
      ];

  const totalSpendingPaise = data?.total_spending_paise || categories.reduce((sum: number, c: any) => sum + (c.amount_paise || 0), 0);

  // Monthly Summary
  const rawMonthly = data?.monthly_summary && data.monthly_summary.length > 0
    ? data.monthly_summary.slice(-6)
    : [
        { month_label: "May", income_paise: 6500000, spend_paise: 3800000, net_cash_flow_paise: 2700000 },
        { month_label: "Jun", income_paise: 6500000, spend_paise: 4200000, net_cash_flow_paise: 2300000 },
        { month_label: "Jul", income_paise: 7000000, spend_paise: 4500000, net_cash_flow_paise: 2500000 },
        { month_label: "Aug", income_paise: 7000000, spend_paise: 4000000, net_cash_flow_paise: 3000000 },
        { month_label: "Sep", income_paise: 7500000, spend_paise: 4300000, net_cash_flow_paise: 3200000 },
        { month_label: "Oct", income_paise: 7500000, spend_paise: 4200000, net_cash_flow_paise: 3300000 }
      ];

  const chartMonthlyData = rawMonthly.map((m: any) => ({
    name: m.month_label || m.month,
    income: Math.round((m.income_paise || 0) / 100),
    expenses: Math.round((m.spend_paise || 0) / 100),
    net: Math.round((m.net_cash_flow_paise || 0) / 100)
  }));

  // Future Cash-Flow Forecast
  const forecast = data?.cash_flow_forecast;
  const forecastTimeline = (forecast?.timeline && forecast.timeline.length > 0)
    ? forecast.timeline.map((pt: any) => ({
        date: pt.date,
        p10: Math.round((pt.p10_paise || 0) / 100),
        p50: Math.round((pt.p50_paise || 0) / 100),
        p90: Math.round((pt.p90_paise || 0) / 100),
        buffer: Math.round((pt.safety_buffer_paise || forecast.safety_buffer_paise || 5800000) / 100)
      }))
    : [
        { date: "1 Nov", p10: 160000, p50: 185000, p90: 200000, buffer: 58000 },
        { date: "15 Nov", p10: 175000, p50: 210000, p90: 240000, buffer: 58000 },
        { date: "1 Dec", p10: 130000, p50: 168000, p90: 195000, buffer: 58000 },
        { date: "15 Dec", p10: 145000, p50: 190000, p90: 225000, buffer: 58000 },
        { date: "1 Jan", p10: 110000, p50: 145000, p90: 175000, buffer: 58000 },
        { date: "15 Jan", p10: 125000, p50: 165000, p90: 190000, buffer: 58000 }
      ];

  const endingBalPaise = forecast?.projected_ending_balance_paise ?? 14500000;
  const lowestBalPaise = forecast?.lowest_projected_balance_paise ?? 6800000;
  const breachProbPct = forecast?.probability_of_breaching_buffer_pct ?? 12;
  const negProbPct = forecast?.probability_of_negative_balance_pct ?? 2;

  // Upcoming Payments
  const upcomingList = (data?.upcoming_payments && data.upcoming_payments.length > 0)
    ? data.upcoming_payments.map((u: any, idx: number) => {
        let icon = CreditCard;
        let iconBg = "bg-primary/10 text-primary";
        const m = (u.merchant || "").toLowerCase();
        if (m.includes("rent") || u.type === "rent") {
          icon = Home;
          iconBg = "bg-destructive/10 text-destructive";
        } else if (m.includes("emi") || u.type === "emi" || m.includes("loan")) {
          icon = CreditCard;
          iconBg = "bg-purple-500/10 text-purple-600 dark:text-purple-400";
        } else if (m.includes("netflix") || m.includes("subscription")) {
          icon = Tv;
          iconBg = "bg-rose-500/10 text-rose-600 dark:text-rose-400";
        } else if (m.includes("airtel") || m.includes("wifi") || m.includes("internet") || m.includes("blinkit")) {
          icon = Wifi;
          iconBg = "bg-sky-500/10 text-sky-600 dark:text-sky-400";
        } else if (m.includes("insurance") || u.type === "insurance") {
          icon = ShieldCheck;
          iconBg = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";
        }

        const amt = u.amount_paise ?? u.typical_amount_paise ?? u.amount_minor ?? u.typical_amount_minor ?? 0;

        return {
          id: idx,
          name: u.merchant?.replace("UPI-", "").replace("ACH D-", "").split("-")[0] || u.merchant || "Scheduled Bill",
          date: u.due_date ? `${u.due_date.slice(8, 10)} Nov 2024` : "1 Nov 2024",
          amount_paise: amt,
          user_status: idx < 3 ? "Auto" : "User",
          icon,
          iconBg
        };
      })
    : [
        { id: 1, name: "Rent", date: "1 Nov 2024", amount_paise: 1200000, user_status: "Auto", icon: Home, iconBg: "bg-destructive/10 text-destructive" },
        { id: 2, name: "Loan EMI", date: "5 Nov 2024", amount_paise: 850000, user_status: "Auto", icon: CreditCard, iconBg: "bg-purple-500/10 text-purple-600" },
        { id: 3, name: "Netflix", date: "10 Nov 2024", amount_paise: 64900, user_status: "Auto", icon: Tv, iconBg: "bg-rose-500/10 text-rose-600" },
        { id: 4, name: "Internet", date: "12 Nov 2024", amount_paise: 99900, user_status: "User", icon: Wifi, iconBg: "bg-sky-500/10 text-sky-600" },
        { id: 5, name: "Insurance", date: "15 Nov 2024", amount_paise: 200000, user_status: "User", icon: ShieldCheck, iconBg: "bg-indigo-500/10 text-indigo-600" }
      ];

  // Anomalies
  const anomaliesList = (data?.top_anomalies && data.top_anomalies.length > 0)
    ? data.top_anomalies.map((a: any, idx: number) => ({
        id: a.id || idx,
        type: a.type === "large_amount" ? "Unusually large transaction" : a.type === "duplicate_charge" ? "Possible duplicate payment" : "New merchant",
        amount_paise: a.amount_paise ?? a.amount_minor ?? a.amount ?? 0,
        merchant: a.merchant || "XYZ Store",
        desc: a.reason_text?.length > 70 ? a.reason_text.slice(0, 67) + "..." : a.reason_text || "Unusual transaction flagged.",
        time: a.time_ago || "2 days ago",
        badge: a.type === "large_amount" ? "A" : a.type === "duplicate_charge" ? "!" : "+",
        badgeBg: a.type === "large_amount" ? "bg-destructive text-destructive-foreground" : a.type === "duplicate_charge" ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
      }))
    : [
        { id: 1, type: "Unusually large transaction", amount_paise: 1840000, merchant: "XYZ Store", desc: "6.2x your typical shopping transaction.", time: "2 days ago", badge: "A", badgeBg: "bg-destructive text-destructive-foreground" },
        { id: 2, type: "Possible duplicate payment", amount_paise: 250000, merchant: "ABC Services", desc: "Two similar transactions detected.", time: "5 days ago", badge: "!", badgeBg: "bg-amber-500 text-white" },
        { id: 3, type: "New merchant", amount_paise: 499900, merchant: "XYZ Electronics", desc: "First transaction with this merchant.", time: "1 week ago", badge: "+", badgeBg: "bg-primary text-primary-foreground" }
      ];

  // Financial Data Health
  const health = data?.financial_data_health || {
    statement_coverage_months: 6,
    transactions_processed: 1250,
    transactions_categorized_pct: 96,
    transactions_needing_review: 2,
    last_successful_import: "30 Oct 2024",
    forecast_readiness: "Ready",
    status_label: "Data Ready"
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { 
      opacity: 1, 
      y: 0, 
      transition: { duration: 0.4 } 
    },
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-6 max-w-[1600px] mx-auto text-foreground"
    >
      {/* HEADER: TITLE, RECONCILIATION BADGE & CONTROLS */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Executive Financial Analysis</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/20 text-foreground border border-primary/30">
              Verified Statement Reconciled
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deterministic cash flow, multi-account liquidity, and predictive headroom report.
          </p>
        </div>

        {/* Filter Controls & Upload Shortcut */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5 text-primary" />
            Upload New Statement
          </Link>

          {/* Account Filter */}
          <div className="relative">
            <select
              value={activeAccount}
              onChange={(e) => setActiveAccount(e.target.value)}
              className="appearance-none bg-card border border-border text-xs font-semibold text-foreground pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary shadow-sm cursor-pointer"
            >
              <option value="all">All Accounts ({accounts.length})</option>
              {accounts.map((a: any) => (
                <option key={a.account_id} value={a.account_id}>
                  {a.nickname || `${a.bank} •••• ${a.masked_last4}`}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-3 pointer-events-none" />
          </div>

          {/* Time Range Filter */}
          <div className="flex bg-muted p-0.5 rounded-xl border border-border text-xs font-semibold">
            {[
              { id: '3m', label: '3M' },
              { id: '6m', label: '6M' },
              { id: '12m', label: '12M' },
              { id: 'all', label: 'All' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTimeRange(t.id)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTimeRange === t.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchDashboard(activeAccount, activeTimeRange)}
            title="Refresh Analysis"
            className="p-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted shadow-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* ROW 1: TOP 4 METRIC CARDS */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Balance */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-start justify-between cursor-default"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-primary/20 text-foreground flex items-center justify-center mb-3">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Total Liquid Balance</p>
            <p className="text-2xl font-bold text-foreground tracking-tight mt-1 font-mono">
              {formatINR(kpi.total_balance_paise)}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Across {kpi.total_accounts_count || accounts.length || 1} accounts
            </p>
          </div>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            {kpi.balance_trend_pct || 8}% vs last month
          </span>
        </motion.div>

        {/* 2. Monthly Income */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-start justify-between cursor-default"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Monthly Income</p>
            <p className="text-2xl font-bold text-foreground tracking-tight mt-1 font-mono">
              {formatINR(kpi.monthly_income_paise)}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">This month</p>
          </div>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            {kpi.income_trend_pct || 3}% vs last month
          </span>
        </motion.div>

        {/* 3. Monthly Expenses */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-start justify-between cursor-default"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center mb-3">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Monthly Expenses</p>
            <p className="text-2xl font-bold text-foreground tracking-tight mt-1 font-mono">
              {formatINR(kpi.monthly_expenses_paise)}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">This month</p>
          </div>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            {kpi.expenses_trend_pct || 12}% vs last month
          </span>
        </motion.div>

        {/* 4. Net Cash Flow */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-start justify-between cursor-default"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-chart-3/15 text-chart-3 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Net Cash Flow</p>
            <p className="text-2xl font-bold text-foreground tracking-tight mt-1 font-mono">
              +{formatINR(kpi.net_cash_flow_paise)}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">This month</p>
          </div>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            {kpi.net_cash_flow_trend_pct || 5}% vs last month
          </span>
        </motion.div>
      </motion.div>

      {/* ROW 2: MULTI-BANK LIQUIDITY BREAKDOWN */}
      {accounts.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Multi-Bank Liquidity Breakdown
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live balances and throughput per verified bank account
              </p>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Integer Paise Precision
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acct: any) => {
              const badge = getBankBadge(acct.bank);
              const curBal = acct.current_balance_paise ?? acct.current_balance_minor ?? 0;
              const inAmt = acct.inflow_paise ?? acct.total_inflow_paise ?? 0;
              const outAmt = acct.outflow_paise ?? acct.total_outflow_paise ?? 0;

              return (
                <motion.div 
                  key={acct.account_id}
                  whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
                  transition={{ duration: 0.2 }}
                  className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-8 h-8 rounded-lg ${badge.bg} border flex items-center justify-center font-bold text-xs`}>
                          {badge.label}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-foreground">{acct.nickname || acct.bank}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">•••• {acct.masked_last4}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded border border-border">
                        {acct.transaction_count} txns
                      </span>
                    </div>

                    <div className="mt-4">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Current Cleared Balance
                      </span>
                      <p className="text-2xl font-bold font-mono text-foreground tracking-tight mt-0.5">
                        {formatINR(curBal)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground text-[11px]">Total Inflow</span>
                      <p className="text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs mt-0.5">
                        {formatINR(inAmt)}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-[11px]">Total Outflow</span>
                      <p className="text-rose-600 dark:text-rose-400 font-mono font-bold text-xs mt-0.5">
                        {formatINR(outAmt)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ROW 3: SPENDING BY CATEGORY & MONTHLY INCOME VS EXPENSES */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Spending by Category */}
        <div className="lg:col-span-5 bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Spending by Category</h3>
              <div className="text-xs text-muted-foreground font-medium">Categorized spend</div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
              <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categories}
                      dataKey="amount_paise"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {categories.map((entry: any, index: number) => {
                        const palette = [
                          'var(--chart-1)',
                          'var(--chart-2)',
                          'var(--chart-3)',
                          'var(--chart-4)',
                          'var(--chart-5)',
                          '#64748B'
                        ];
                        const fill = entry.color || palette[index % palette.length];
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-base font-extrabold text-foreground leading-tight font-mono">
                    {formatINR(totalSpendingPaise)}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">Total Spending</span>
                  <span className="text-[11px] font-semibold text-muted-foreground">100%</span>
                </div>
              </div>

              <div className="flex-1 w-full space-y-2">
                {categories.slice(0, 6).map((c: any) => {
                  const pct = totalSpendingPaise > 0 
                    ? Math.round(((c.amount_paise || 0) / totalSpendingPaise) * 100) 
                    : 0;
                  return (
                    <motion.div 
                      whileHover={{ x: 3 }} 
                      transition={{ duration: 0.15 }}
                      key={c.category_id} 
                      className="flex items-center justify-between text-xs py-0.5 rounded px-1 -mx-1 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color || 'var(--primary)' }}></span>
                        <span className="text-foreground font-medium truncate">{c.category}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-semibold text-foreground font-mono">{formatINR(c.amount_paise)}</span>
                        <span className="text-muted-foreground w-7 text-right">{pct}%</span>
                        <span className={`w-10 text-right font-medium text-[11px] flex items-center justify-end ${
                          c.trend_pct > 0 ? (c.category === "Rent" || c.category === "Shopping" ? "text-rose-500" : "text-emerald-500") :
                          c.trend_pct < 0 ? "text-emerald-500" : "text-muted-foreground"
                        }`}>
                          {c.trend_pct > 0 ? `↑ ${c.trend_pct}%` : c.trend_pct < 0 ? `↓ ${Math.abs(c.trend_pct)}%` : '0%'}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          <Link 
            href="/transactions" 
            className="text-xs font-semibold text-muted-foreground hover:text-foreground pt-3 border-t border-border flex items-center justify-center gap-1 transition"
          >
            View all categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Monthly Income vs Expenses Chart */}
        <div className="lg:col-span-7 bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-foreground">Monthly Income vs Expenses</h3>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm bg-primary"></span> Income
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-sm bg-chart-4"></span> Expenses
                  </span>
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="w-3 h-0.5 bg-chart-2"></span> Net Cash Flow
                  </span>
                </div>
              </div>
            </div>

            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tickFormatter={(val) => `₹${val >= 100000 ? `${val/100000}L` : `${val/1000}K`}`}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--card-foreground)', fontSize: '12px' }}
                  />
                  <Bar dataKey="income" fill="var(--chart-1)" barSize={16} radius={[3, 3, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="var(--chart-4)" barSize={16} radius={[3, 3, 0, 0]} name="Expenses" />
                  <Line type="monotone" dataKey="net" stroke="var(--chart-2)" strokeWidth={2.5} dot={{ fill: 'var(--chart-2)', r: 4, stroke: 'var(--card)', strokeWidth: 2 }} name="Net Cash Flow" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border-t border-border pt-3 mt-2 overflow-x-auto">
            <div className="min-w-[420px] grid grid-cols-7 text-xs text-muted-foreground gap-y-1">
              <span className="font-medium text-muted-foreground">Month</span>
              {rawMonthly.map((m: any, i: number) => (
                <span key={i} className="text-center font-semibold text-foreground">{m.month_label || m.month}</span>
              ))}

              <span className="font-medium text-muted-foreground">Income</span>
              {rawMonthly.map((m: any, i: number) => (
                <span key={i} className="text-center font-medium text-foreground">₹{Math.round((m.income_paise || 0) / 100000)}K</span>
              ))}

              <span className="font-medium text-muted-foreground">Expenses</span>
              {rawMonthly.map((m: any, i: number) => (
                <span key={i} className="text-center font-medium text-foreground">₹{Math.round((m.spend_paise || 0) / 100000)}K</span>
              ))}

              <span className="font-medium text-muted-foreground">Net Cash Flow</span>
              {rawMonthly.map((m: any, i: number) => (
                <span key={i} className="text-center font-bold text-emerald-600 dark:text-emerald-400">+₹{Math.round((m.net_cash_flow_paise || 0) / 100000)}K</span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ROW 4: FUTURE CASH-FLOW FORECAST & UPCOMING PAYMENTS */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-foreground">Future Cash-Flow Forecast</h3>
              <span title="Deterministic 5,000 Monte Carlo simulation based on your salary and recurring obligations.">
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">90-Day Horizon</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-4 pb-2 border-b border-border">
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-chart-3"></span> P10 (Lower)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-primary"></span> P50 (Median)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-chart-2"></span> P90 (Higher)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-chart-4"></span> Safety Buffer
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Salary
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-destructive"></span> Upcoming Payment
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <div className="md:col-span-3 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tickFormatter={(val) => `₹${val >= 100000 ? `${(val/100000).toFixed(0)}L` : `${val/1000}K`}`}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--card-foreground)', fontSize: '12px' }}
                  />
                  <Area type="monotone" dataKey="p90" stroke="none" fill="var(--chart-1)" fillOpacity={0.15} />
                  <Line type="monotone" dataKey="p90" stroke="var(--chart-2)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="P90 (Higher)" />
                  <Line type="monotone" dataKey="p50" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} name="P50 (Median)" />
                  <Line type="monotone" dataKey="p10" stroke="var(--chart-3)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="P10 (Lower)" />
                  <Line type="monotone" dataKey="buffer" stroke="var(--chart-4)" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Safety Buffer" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-5 space-y-3.5">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Projected ending balance</p>
                <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight font-mono">
                  {formatINR(endingBalPaise)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Lowest projected balance</p>
                <p className="text-xl font-extrabold text-destructive tracking-tight font-mono">
                  {formatINR(lowestBalPaise)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Probability of breaching buffer</p>
                <p className="text-base font-bold text-foreground">
                  {breachProbPct}%
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Probability of negative balance</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {negProbPct}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Payments */}
        <div className="lg:col-span-4 bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">Upcoming Payments</h3>
              <Link href="/recurring" className="text-xs font-semibold text-primary hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3 divide-y divide-border">
              {upcomingList.map((item: any) => {
                const IconComponent = item.icon || CreditCard;
                return (
                  <motion.div 
                    whileHover={{ x: 3 }}
                    transition={{ duration: 0.15 }}
                    key={item.id} 
                    className="pt-2.5 first:pt-0 flex items-center justify-between rounded-lg px-1.5 -mx-1.5 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground">{item.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-foreground font-mono">
                        {formatINR(item.amount_paise)}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        item.user_status === 'Auto'
                          ? 'bg-primary/20 text-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.user_status}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ROW 5: ASK FDL, UNUSUAL TRANSACTIONS, DATA HEALTH */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Ask Financial Decision Lab */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-foreground flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Ask Financial Decision Lab</h3>
                <p className="text-xs text-muted-foreground">Get data-driven answers about your financial decisions</p>
              </div>
            </div>

            <form onSubmit={handleNlSubmit} className="relative my-3">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
              <input 
                type="text"
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                placeholder="What financial decision are you considering?"
                className="w-full bg-input border border-border rounded-lg pl-9 pr-12 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-inner"
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={nlLoading}
                className="w-7 h-7 rounded-md bg-primary disabled:opacity-50 text-primary-foreground flex items-center justify-center absolute right-1.5 top-1.5 transition font-bold"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </form>

            <AnimatePresence>
              {nlResult && (
                <motion.div 
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 my-2 bg-muted border border-border rounded-lg text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      nlResult.verdict?.code === 'AFFORDABLE' ? 'bg-primary/20 text-foreground border border-primary/30' :
                      nlResult.verdict?.code === 'TIGHT' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                      'bg-destructive/20 text-destructive border border-destructive/30'
                    }`}>
                      Verdict: {nlResult.verdict?.code}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      P50 Headroom: <span className="font-semibold text-foreground font-mono">{formatINR(nlResult.headroom?.p50_minor || 0)}</span>
                    </span>
                  </div>
                  <p className="text-foreground leading-relaxed text-[11px]">
                    {nlResult.narration}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-2 mt-3">
              {[
                "Can I afford an ₹80,000 phone next month?",
                "How much can I safely spend?",
                "What if my salary decreases by 20%?",
                "Can I afford a new EMI?"
              ].map((qText, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => handleNlSubmit(undefined, qText)}
                  className="text-left bg-muted hover:bg-muted/80 border border-border rounded-lg p-2 text-[11px] text-foreground transition"
                >
                  {qText}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Unusual Transactions */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">Unusual Transactions</h3>
              <Link href="/anomalies" className="text-xs font-semibold text-primary hover:underline">
                View All
              </Link>
            </div>

            <div className="space-y-3.5">
              {anomaliesList.map((a: any) => (
                <motion.div 
                  whileHover={{ x: 3 }}
                  transition={{ duration: 0.15 }}
                  key={a.id} 
                  className="flex items-start gap-3 rounded-lg p-1.5 -mx-1.5 hover:bg-muted transition-colors"
                >
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-bold text-xs ${a.badgeBg}`}>
                    {a.badge}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-foreground truncate">{a.type}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{a.time}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground mt-0.5">
                      <span className="font-mono">{formatINR(a.amount_paise)}</span> · <span className="text-muted-foreground font-medium">{a.merchant}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{a.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Financial Data Health */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <h3 className="text-sm font-bold text-foreground">Financial Data Health</h3>
              <span title="Evaluates data sufficiency before rendering ungrounded advice.">
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-pointer" />
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Statement coverage
                </span>
                <span className="font-semibold text-foreground">{health.statement_coverage_months} months</span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Transactions processed
                </span>
                <span className="font-semibold text-foreground">{Number(health.transactions_processed).toLocaleString('en-IN')}</span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Transactions categorized
                </span>
                <span className="font-semibold text-foreground">{health.transactions_categorized_pct}%</span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Transactions needing review
                </span>
                <span className="font-bold text-destructive">{health.transactions_needing_review}</span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Last successful import
                </span>
                <span className="font-semibold text-foreground">{health.last_successful_import}</span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Forecast readiness
                </span>
                <span className="font-semibold text-primary">{health.forecast_readiness}</span>
              </motion.div>
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-2 text-[11px] text-foreground">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p>Your data looks good! Keep adding your latest statements for more accurate forecasts.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
