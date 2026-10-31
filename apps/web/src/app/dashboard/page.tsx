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
  Trash2,
  X,
  FileSpreadsheet,
  FileCheck,
  PieChart as PieChartIcon,
  HelpCircle,
  Inbox,
  Coins
} from 'lucide-react';
import LiquidityAdvisorModal from '@/components/LiquidityAdvisorModal';
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
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [fileToDelete, setFileToDelete] = useState<any | null>(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  const handleDeleteStatement = async () => {
    if (!fileToDelete) return;
    setIsDeletingFile(true);
    try {
      await api.deleteUploadedFile(fileToDelete.id);
      setFileToDelete(null);
      await fetchDashboard();
    } catch (e: any) {
      console.error('Failed to delete statement:', e);
    } finally {
      setIsDeletingFile(false);
    }
  };
  const [hasInitializedFiles, setHasInitializedFiles] = useState(false);
  const [isLiquidityModalOpen, setIsLiquidityModalOpen] = useState(false);

  // Natural Language query state
  const [nlQuery, setNlQuery] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState<any>(null);
  const [hoveredCategoryIndex, setHoveredCategoryIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchDashboard(activeAccount, activeTimeRange, selectedFileIds);
  }, [activeAccount, activeTimeRange]);

  async function fetchDashboard(accId = activeAccount, range = activeTimeRange, fileIds = selectedFileIds) {
    setLoading(true);
    try {
      const params: any = {};
      if (accId && accId !== 'all') params.account_id = accId;
      if (range === '3m') params.months = 3;
      else if (range === '6m') params.months = 6;
      else if (range === '12m') params.months = 12;
      if (fileIds && fileIds.length > 0) {
        params.source_file_ids = fileIds.join(',');
      }

      const summary = await api.getDashboardSummary(params);
      setData(summary);

      if (!hasInitializedFiles && summary?.source_files) {
        setSelectedFileIds(summary.source_files.map((sf: any) => sf.id));
        setHasInitializedFiles(true);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  const toggleSourceFile = (fileId: string) => {
    const next = selectedFileIds.includes(fileId)
      ? selectedFileIds.filter(id => id !== fileId)
      : [...selectedFileIds, fileId];
    setSelectedFileIds(next);
    fetchDashboard(activeAccount, activeTimeRange, next);
  };

  const selectAllFiles = () => {
    const all = (data?.source_files || []).map((sf: any) => sf.id);
    setSelectedFileIds(all);
    fetchDashboard(activeAccount, activeTimeRange, all);
  };

  const clearAllFiles = () => {
    setSelectedFileIds([]);
    fetchDashboard(activeAccount, activeTimeRange, []);
  };

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

  // 100% Real KPI metrics directly from backend
  const kpi = data?.kpi_metrics || {
    total_balance_paise: data?.combined_liquid_paise ?? 0,
    total_accounts_count: data?.total_accounts_count ?? 0,
    monthly_income_paise: 0,
    monthly_expenses_paise: 0,
    net_cash_flow_paise: 0,
    balance_trend_pct: 0,
    income_trend_pct: 0,
    expenses_trend_pct: 0,
    net_cash_flow_trend_pct: 0
  };

  const accounts = data?.accounts_breakdown || [];

  // Spending By Category - Real data only
  const categories = data?.category_spend || [];
  const totalSpendingPaise = data?.total_spending_paise || categories.reduce((sum: number, c: any) => sum + (c.amount_paise || c.amount_minor || 0), 0);

  // Monthly Summary - Real data only
  const rawMonthly = data?.monthly_summary || [];
  const chartMonthlyData = rawMonthly.map((m: any) => ({
    name: m.month_label || m.month,
    income: Math.round((m.income_paise || 0) / 100),
    expenses: Math.round((m.spend_paise || m.expenses_paise || 0) / 100),
    net: Math.round((m.net_cash_flow_paise || m.net_savings_paise || 0) / 100)
  }));

  // Future Cash-Flow Forecast - Real data only
  const forecast = data?.cash_flow_forecast;
  const forecastTimeline = (forecast?.timeline || []).map((pt: any) => ({
    date: pt.date,
    p10: Math.round((pt.p10_paise || 0) / 100),
    p50: Math.round((pt.p50_paise || 0) / 100),
    p90: Math.round((pt.p90_paise || 0) / 100),
    buffer: Math.round((pt.safety_buffer_paise || forecast.safety_buffer_paise || 0) / 100)
  }));

  const endingBalPaise = forecast?.projected_ending_balance_paise ?? 0;
  const lowestBalPaise = forecast?.lowest_projected_balance_paise ?? 0;
  const breachProbPct = forecast?.probability_of_breaching_buffer_pct ?? 0;
  const negProbPct = forecast?.probability_of_negative_balance_pct ?? 0;

  // Upcoming Payments - Real data only
  const upcomingList = (data?.upcoming_payments || []).map((u: any, idx: number) => {
    let icon = CreditCard;
    let iconBg = "bg-primary/10 text-primary";
    const m = (u.merchant || "").toLowerCase();
    const t = (u.type || "").toLowerCase();
    if (m.includes("rent") || t.includes("rent") || t.includes("housing")) {
      icon = Home;
      iconBg = "bg-destructive/10 text-destructive";
    } else if (m.includes("emi") || t.includes("emi") || m.includes("loan")) {
      icon = CreditCard;
      iconBg = "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    } else if (m.includes("netflix") || t.includes("subscription") || m.includes("spotify")) {
      icon = Tv;
      iconBg = "bg-rose-500/10 text-rose-600 dark:text-rose-400";
    } else if (m.includes("airtel") || m.includes("wifi") || m.includes("internet") || m.includes("jio") || m.includes("broadband")) {
      icon = Wifi;
      iconBg = "bg-sky-500/10 text-sky-600 dark:text-sky-400";
    } else if (m.includes("insurance") || t.includes("insurance")) {
      icon = ShieldCheck;
      iconBg = "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400";
    }

    const amt = u.amount_paise ?? u.typical_amount_paise ?? u.amount_minor ?? u.typical_amount_minor ?? 0;

    return {
      id: u.id || idx,
      name: u.merchant?.replace("UPI-", "").replace("ACH D-", "").split("-")[0] || u.merchant || "Scheduled Bill",
      date: u.due_date || u.next_expected_date || "Upcoming",
      amount_paise: amt,
      user_status: u.user_tag || (u.user_status === 'active' ? 'Auto' : 'User'),
      icon,
      iconBg
    };
  });

  // Anomalies - Real data only
  const anomaliesList = (data?.top_anomalies || []).map((a: any, idx: number) => ({
    id: a.id || idx,
    type: a.type === "large_amount" ? "Unusually large transaction" : a.type === "duplicate_charge" ? "Possible duplicate payment" : (a.type ? a.type.replace('_', ' ') : "Unusual spend"),
    amount_paise: a.amount_paise ?? a.amount_minor ?? a.amount ?? 0,
    merchant: a.merchant || "Merchant",
    desc: a.reason_text?.length > 70 ? a.reason_text.slice(0, 67) + "..." : a.reason_text || "Unusual transaction flagged.",
    time: a.time_ago || "Recently",
    badge: a.type === "large_amount" ? "A" : a.type === "duplicate_charge" ? "!" : "+",
    badgeBg: a.type === "large_amount" ? "bg-destructive text-destructive-foreground" : a.type === "duplicate_charge" ? "bg-amber-500 text-white" : "bg-primary text-primary-foreground"
  }));

  // Financial Data Health - Real data only
  const health = data?.financial_data_health || {
    statement_coverage_months: 0,
    transactions_processed: 0,
    transactions_categorized_pct: 0,
    transactions_needing_review: 0,
    last_successful_import: "None",
    forecast_readiness: "Needs Data",
    status_label: "No Data"
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
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-border">
        <div className="shrink-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Executive Financial Analysis</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              accounts.length > 0 
                ? 'bg-primary/20 text-foreground border-primary/30' 
                : 'bg-muted text-muted-foreground border-border'
            }`}>
              {accounts.length > 0 ? `${accounts.length} Account${accounts.length > 1 ? 's' : ''} Reconciled` : 'No Accounts Connected'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deterministic cash flow, multi-account liquidity, and predictive headroom report.
          </p>
        </div>

        {/* Filter Controls & Upload Shortcut in one horizontal line */}
        <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <Link
            href="/upload"
            className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition shadow-xs shrink-0 whitespace-nowrap"
          >
            <UploadCloud className="w-3.5 h-3.5 text-primary" />
            <span>Upload New Statement</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsLiquidityModalOpen(true)}
            className="h-9 inline-flex items-center gap-1.5 px-2.5 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition shadow-xs cursor-pointer shrink-0 whitespace-nowrap"
          >
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            <span>Liquidity & Sourcing Advisor</span>
          </button>

          {/* Account Filter */}
          <div className="relative shrink-0">
            <select
              value={activeAccount}
              onChange={(e) => setActiveAccount(e.target.value)}
              className="h-9 appearance-none bg-card border border-border text-xs font-semibold text-foreground pl-3 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
            >
              <option value="all">All Accounts ({accounts.length})</option>
              {accounts.map((a: any) => (
                <option key={a.account_id} value={a.account_id}>
                  {a.nickname || `${a.bank} •••• ${a.masked_last4}`}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Time Period Filter Dropdown */}
          <div className="relative shrink-0">
            <select
              value={activeTimeRange}
              onChange={(e) => setActiveTimeRange(e.target.value)}
              className="h-9 appearance-none bg-card border border-border text-xs font-semibold text-foreground pl-3 pr-8 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary shadow-xs cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="3m">3 Months</option>
              <option value="6m">6 Months</option>
              <option value="12m">12 Months</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchDashboard(activeAccount, activeTimeRange, selectedFileIds)}
            title="Refresh Analysis"
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted shadow-xs transition shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Statement Sources Inclusion Checkbox Bar */}
      {data?.source_files && data.source_files.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Uploaded Statement Sources
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    selectedFileIds.length === data.source_files.length
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    {selectedFileIds.length} of {data.source_files.length} Included in Calculations
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select which uploaded statements to include or exclude from balances, spending trends, and forecasts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto pt-1 sm:pt-0">
              <button
                type="button"
                onClick={selectAllFiles}
                className="px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10 rounded-lg transition"
              >
                Include All
              </button>
              <span className="text-muted-foreground/40">|</span>
              <button
                type="button"
                onClick={clearAllFiles}
                className="px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Statement Checkbox Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.source_files.map((sf: any) => {
              const isIncluded = selectedFileIds.includes(sf.id);
              return (
                <div
                  key={sf.id}
                  onClick={() => toggleSourceFile(sf.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                    isIncluded
                      ? 'bg-card border-primary/50 shadow-xs'
                      : 'bg-muted/40 border-border opacity-50 hover:opacity-75'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isIncluded}
                    onChange={() => {}} // handled by parent onClick
                    className="w-4 h-4 rounded text-primary accent-primary mt-0.5 cursor-pointer shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-bold truncate ${isIncluded ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                        {sf.filename}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${
                          isIncluded 
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                            : 'text-muted-foreground bg-muted border-border'
                        }`}>
                          {isIncluded ? 'INCLUDED' : 'EXCLUDED'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFileToDelete(sf);
                          }}
                          className="p-1 rounded-md text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete statement from ledger"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground/80">{sf.bank}</span>
                      {sf.masked_last4 && <span>(•••• {sf.masked_last4})</span>}
                      <span>·</span>
                      <span className="font-mono">{sf.transaction_count} txns</span>
                    </div>

                    <p className="text-[10px] font-mono text-muted-foreground/80 mt-1">
                      {sf.period_start && sf.period_end ? `Period: ${sf.period_start} to ${sf.period_end}` : 'Statement Period Active'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* NO STATEMENTS BANNER */}
      {!loading && accounts.length === 0 && (
        <motion.div 
          variants={itemVariants}
          className="p-4 rounded-xl border border-primary/25 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">No bank statements reconciled yet</p>
              <p className="text-xs text-muted-foreground">Upload an official bank statement (CSV or PDF) to generate live analytics and predictive forecasts.</p>
            </div>
          </div>
          <Link 
            href="/upload" 
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:opacity-90 transition whitespace-nowrap self-start sm:self-auto"
          >
            Upload Statement &rarr;
          </Link>
        </motion.div>
      )}

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
              Across {kpi.total_accounts_count || accounts.length} accounts
            </p>
          </div>
          {kpi.balance_trend_pct !== 0 && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded ${
              kpi.balance_trend_pct > 0 
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' 
                : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
            }`}>
              {kpi.balance_trend_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(kpi.balance_trend_pct)}% vs last month
            </span>
          )}
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
            <p className="text-xs font-medium text-muted-foreground">Average Monthly Income</p>
            <p className="text-2xl font-bold text-foreground tracking-tight mt-1 font-mono">
              {formatINR(kpi.monthly_income_paise)}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">Computed from credits</p>
          </div>
          {kpi.income_trend_pct !== 0 && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded ${
              kpi.income_trend_pct > 0 
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' 
                : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
            }`}>
              {kpi.income_trend_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(kpi.income_trend_pct)}% vs last month
            </span>
          )}
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
            <p className="text-xs font-medium text-muted-foreground">Average Monthly Expenses</p>
            <p className="text-2xl font-bold text-foreground tracking-tight mt-1 font-mono">
              {formatINR(kpi.monthly_expenses_paise)}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">Computed from debits</p>
          </div>
          {kpi.expenses_trend_pct !== 0 && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded ${
              kpi.expenses_trend_pct < 0 
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' 
                : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
            }`}>
              {kpi.expenses_trend_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(kpi.expenses_trend_pct)}% vs last month
            </span>
          )}
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
            <p className="text-xs font-medium text-muted-foreground">Net Monthly Cash Flow</p>
            <p className={`text-2xl font-bold tracking-tight mt-1 font-mono ${
              kpi.net_cash_flow_paise >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
            }`}>
              {kpi.net_cash_flow_paise >= 0 ? '+' : ''}{formatINR(kpi.net_cash_flow_paise)}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">Income minus expenses</p>
          </div>
          {kpi.net_cash_flow_trend_pct !== 0 && (
            <span className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded ${
              kpi.net_cash_flow_trend_pct > 0 
                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' 
                : 'text-rose-600 dark:text-rose-400 bg-rose-500/10'
            }`}>
              {kpi.net_cash_flow_trend_pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(kpi.net_cash_flow_trend_pct)}% vs last month
            </span>
          )}
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
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
        {/* Spending by Category */}
        <div className="lg:col-span-5 bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">Spending by Category</h3>
              <div className="text-xs text-muted-foreground font-medium">Categorized spend</div>
            </div>

            {categories.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
                <PieChartIcon className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-xs font-semibold text-foreground">No Categorized Spending Yet</p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Upload a statement to automatically categorize your debit transactions into Rent, Shopping, Groceries, and Utilities.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
                <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          const amt = d.amount_paise || d.amount_minor || d.value || 0;
                          const pct = totalSpendingPaise > 0 ? Math.round((amt / totalSpendingPaise) * 100) : 0;
                          return (
                            <div className="bg-popover border border-border px-3 py-2 rounded-xl shadow-xl text-xs space-y-1 z-50 pointer-events-none">
                              <div className="flex items-center gap-1.5 font-bold text-foreground">
                                <span 
                                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                                  style={{ backgroundColor: d.fill || d.color || 'var(--primary)' }} 
                                />
                                <span>{d.category || d.name}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 font-mono text-[11px]">
                                <span className="text-muted-foreground font-sans">Amount:</span>
                                <span className="font-bold text-foreground">{formatINR(amt)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4 font-mono text-[11px]">
                                <span className="text-muted-foreground font-sans">Share:</span>
                                <span className="font-bold text-primary">{pct}%</span>
                              </div>
                            </div>
                          );
                        }}
                      />
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
                        isAnimationActive={true}
                        animationBegin={150}
                        animationDuration={1200}
                        animationEasing="ease-out"
                        onMouseEnter={(_, index) => setHoveredCategoryIndex(index)}
                        onMouseLeave={() => setHoveredCategoryIndex(null)}
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
                          const isHovered = hoveredCategoryIndex === index;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={fill} 
                              className="cursor-pointer transition-all duration-200 outline-none"
                              style={{
                                filter: hoveredCategoryIndex === null || isHovered ? 'none' : 'opacity(0.4)',
                                transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                                transformOrigin: 'center center',
                              }}
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {(() => {
                    const activeCategory = hoveredCategoryIndex !== null ? categories[hoveredCategoryIndex] : null;
                    const activeAmt = activeCategory ? (activeCategory.amount_paise || activeCategory.amount_minor || 0) : totalSpendingPaise;
                    const activePct = totalSpendingPaise > 0 ? Math.round((activeAmt / totalSpendingPaise) * 100) : 100;
                    const activeLabel = activeCategory ? (activeCategory.category || activeCategory.name) : 'Total Spending';

                    return (
                      <motion.div 
                        key={hoveredCategoryIndex !== null ? `cat-${hoveredCategoryIndex}` : 'total'}
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-2"
                      >
                        <span className="text-base font-extrabold text-foreground leading-tight font-mono truncate max-w-[110px]">
                          {formatINR(activeAmt)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[110px]">
                          {activeLabel}
                        </span>
                        <span className="text-[11px] font-semibold text-primary">
                          {activePct}%
                        </span>
                      </motion.div>
                    );
                  })()}
                </div>

                <div className="flex-1 w-full space-y-2.5">
                  {categories.slice(0, 6).map((c: any, index: number) => {
                    const pct = totalSpendingPaise > 0 
                      ? Math.round(((c.amount_paise || c.amount_minor || 0) / totalSpendingPaise) * 100) 
                      : 0;
                    const isHovered = hoveredCategoryIndex === index;
                    return (
                      <div 
                        key={c.id || c.category_id || index} 
                        className="space-y-1"
                        onMouseEnter={() => setHoveredCategoryIndex(index)}
                        onMouseLeave={() => setHoveredCategoryIndex(null)}
                      >
                        <motion.div 
                          whileHover={{ x: 3 }} 
                          transition={{ duration: 0.15 }}
                          className={`flex items-center justify-between text-xs py-0.5 rounded px-1.5 -mx-1.5 transition-colors cursor-pointer ${
                            isHovered ? 'bg-primary/10 text-primary font-semibold' : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color || 'var(--primary)' }}></span>
                            <span className="text-foreground font-medium truncate">{c.category || c.name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-semibold text-foreground font-mono">{formatINR(c.amount_paise || c.amount_minor || 0)}</span>
                            <span className="text-muted-foreground w-7 text-right">{pct}%</span>
                          </div>
                        </motion.div>
                        <div className="w-full bg-muted/60 h-1 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            whileInView={{ width: `${pct}%` }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8, delay: 0.15 + index * 0.08, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: c.color || 'var(--primary)' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Link 
            href="/transactions" 
            className="text-xs font-semibold text-muted-foreground hover:text-foreground pt-3 border-t border-border flex items-center justify-center gap-1 transition"
          >
            View all transactions <ArrowRight className="w-3.5 h-3.5" />
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

            {chartMonthlyData.length === 0 ? (
              <div className="h-48 w-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
                <BarChart3 className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-xs font-semibold text-foreground">No Monthly History Recorded</p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Upload a bank statement with multiple months of history to unlock cash flow trends.
                </p>
              </div>
            ) : (
              <div className="h-48 w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis 
                      tickFormatter={(val) => `₹${val >= 100000 ? `${(val/100000).toFixed(1)}L` : `${val/1000}K`}`}
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} 
                      axisLine={false} 
                      tickLine={false}
                    />
                    <Tooltip 
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                      contentStyle={{ backgroundColor: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)', color: 'var(--card-foreground)', fontSize: '12px' }}
                    />
                    <Bar 
                      dataKey="income" 
                      fill="var(--chart-1)" 
                      barSize={16} 
                      radius={[4, 4, 0, 0]} 
                      name="Income"
                      isAnimationActive={true}
                      animationBegin={200}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Bar 
                      dataKey="expenses" 
                      fill="var(--chart-4)" 
                      barSize={16} 
                      radius={[4, 4, 0, 0]} 
                      name="Expenses"
                      isAnimationActive={true}
                      animationBegin={400}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="net" 
                      stroke="var(--chart-2)" 
                      strokeWidth={2.5} 
                      dot={{ fill: 'var(--chart-2)', r: 4, stroke: 'var(--card)', strokeWidth: 2 }} 
                      name="Net Cash Flow"
                      isAnimationActive={true}
                      animationBegin={650}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {rawMonthly.length > 0 && (
            <div className="border-t border-border pt-3 mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left font-semibold text-muted-foreground pb-2 pr-4 whitespace-nowrap">Metric</th>
                    {rawMonthly.map((m: any, i: number) => (
                      <th key={i} className="text-center font-bold text-foreground pb-2 px-3 whitespace-nowrap">
                        {m.month_label || m.month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  <tr>
                    <td className="font-medium text-muted-foreground py-2 pr-4 whitespace-nowrap flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs bg-primary shrink-0" />
                      Income
                    </td>
                    {rawMonthly.map((m: any, i: number) => (
                      <td key={i} className="text-center font-mono font-medium text-foreground py-2 px-3 whitespace-nowrap">
                        ₹{Math.round((m.income_paise || 0) / 100000)}K
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="font-medium text-muted-foreground py-2 pr-4 whitespace-nowrap flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-xs bg-chart-4 shrink-0" />
                      Expenses
                    </td>
                    {rawMonthly.map((m: any, i: number) => (
                      <td key={i} className="text-center font-mono font-medium text-foreground py-2 px-3 whitespace-nowrap">
                        ₹{Math.round((m.spend_paise || m.expenses_paise || 0) / 100000)}K
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="font-medium text-muted-foreground py-2 pr-4 whitespace-nowrap flex items-center gap-1.5">
                      <span className="w-2 h-0.5 bg-chart-2 shrink-0" />
                      Net Cash Flow
                    </td>
                    {rawMonthly.map((m: any, i: number) => {
                      const net = m.net_cash_flow_paise ?? m.net_savings_paise ?? 0;
                      return (
                        <td key={i} className={`text-center font-mono font-bold py-2 px-3 whitespace-nowrap ${
                          net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                        }`}>
                          {net >= 0 ? '+' : ''}₹{Math.round(net / 100000)}K
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* ROW 4: FUTURE CASH-FLOW FORECAST & UPCOMING PAYMENTS */}
      <motion.div 
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6"
      >
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
          </div>

          {forecastTimeline.length === 0 ? (
            <div className="h-56 w-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
              <TrendingUp className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-xs font-semibold text-foreground">No Forecast Available</p>
              <p className="text-[11px] text-muted-foreground max-w-md">
                Monte Carlo forecasting activates when you upload a verified statement with at least 90 days of history and identified cash flows.
              </p>
            </div>
          ) : (
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
                    <Area 
                      type="monotone" 
                      dataKey="p90" 
                      stroke="none" 
                      fill="var(--chart-1)" 
                      fillOpacity={0.15}
                      isAnimationActive={true}
                      animationBegin={150}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="p90" 
                      stroke="var(--chart-2)" 
                      strokeWidth={1.5} 
                      strokeDasharray="4 4" 
                      dot={false} 
                      name="P90 (Higher)"
                      isAnimationActive={true}
                      animationBegin={300}
                      animationDuration={1100}
                      animationEasing="ease-out"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="p50" 
                      stroke="var(--chart-1)" 
                      strokeWidth={2.5} 
                      dot={false} 
                      name="P50 (Median)"
                      isAnimationActive={true}
                      animationBegin={450}
                      animationDuration={1200}
                      animationEasing="ease-out"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="p10" 
                      stroke="var(--chart-3)" 
                      strokeWidth={1.5} 
                      strokeDasharray="4 4" 
                      dot={false} 
                      name="P10 (Lower)"
                      isAnimationActive={true}
                      animationBegin={600}
                      animationDuration={1100}
                      animationEasing="ease-out"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="buffer" 
                      stroke="var(--chart-4)" 
                      strokeWidth={1.5} 
                      strokeDasharray="3 3" 
                      dot={false} 
                      name="Safety Buffer"
                      isAnimationActive={true}
                      animationBegin={750}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    />
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
          )}
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

            {upcomingList.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
                <CreditCard className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-xs font-semibold text-foreground">No Upcoming Bills Detected</p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Recurring cadence clustering will automatically surface rent, EMIs, and bills once detected.
                </p>
              </div>
            ) : (
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
            )}
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
                "Can I afford an ₹80,000 purchase next month?",
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

            {anomaliesList.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground space-y-2">
                <CheckCircle2 className="w-8 h-8 text-primary" />
                <p className="text-xs font-semibold text-foreground">No Anomalies Flagged</p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  All transactions fall within standard mathematical variance parameters (Modified Z-Score &lt; 3.5).
                </p>
              </div>
            ) : (
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
            )}
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
                  <AlertCircle className={`w-4 h-4 ${health.transactions_needing_review > 0 ? 'text-amber-500' : 'text-primary'}`} /> Transactions needing review
                </span>
                <span className={`font-bold ${health.transactions_needing_review > 0 ? 'text-destructive' : 'text-foreground'}`}>
                  {health.transactions_needing_review}
                </span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> Last successful import
                </span>
                <span className="font-semibold text-foreground">{health.last_successful_import}</span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className={`w-4 h-4 ${health.forecast_readiness === 'Ready' ? 'text-primary' : 'text-amber-500'}`} /> Forecast readiness
                </span>
                <span className={`font-semibold ${health.forecast_readiness === 'Ready' ? 'text-primary' : 'text-amber-500'}`}>
                  {health.forecast_readiness}
                </span>
              </motion.div>
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-primary/10 border border-primary/20 rounded-lg flex items-start gap-2 text-[11px] text-foreground">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p>
              {health.transactions_processed > 0
                ? "Your statement data is reconciled and mathematically verified in integer paise."
                : "No data reconciled yet. Ingest your bank statement to activate live tracking."}
            </p>
          </div>
        </div>
      </motion.div>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {fileToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 text-foreground"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <Trash2 className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setFileToDelete(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">Delete Uploaded Statement?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{fileToDelete.filename}</span>?
                </p>
              </div>

              <div className="p-3 bg-muted/50 rounded-xl border border-border/80 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Account:</span>
                  <span className="font-semibold text-foreground">{fileToDelete.bank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transactions:</span>
                  <span className="font-semibold text-rose-500">{fileToDelete.transaction_count} to be removed</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Deleting this file will remove its transactions, unpair linked internal transfers, and recalculate balances, recurring bills, and forecasts immediately.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeletingFile}
                  onClick={() => setFileToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingFile}
                  onClick={handleDeleteStatement}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  {isDeletingFile ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Statement</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Liquidity & Sourcing Advisor Modal */}
      <LiquidityAdvisorModal
        isOpen={isLiquidityModalOpen}
        onClose={() => setIsLiquidityModalOpen(false)}
      />

    </motion.div>
  );
}
