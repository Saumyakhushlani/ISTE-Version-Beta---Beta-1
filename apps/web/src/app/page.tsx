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
  ShoppingBag, 
  Utensils, 
  Car, 
  RefreshCw,
  HelpCircle
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

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeAccount, setActiveAccount] = useState('all');
  const [activeTimeRange, setActiveTimeRange] = useState('6m');

  // Natural Language query state
  const [nlQuery, setNlQuery] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlResult, setNlResult] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const summary = await api.getDashboardSummary();
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

  if (!mounted) {
    return <div className="p-8 text-center text-slate-400">Loading Dashboard...</div>;
  }

  // Fallback defaults mapping to real API metrics
  const kpi = data?.kpi_metrics || {
    total_balance_paise: data?.combined_liquid_paise || 18500000,
    total_accounts_count: data?.total_accounts_count || 3,
    monthly_income_paise: 7500000,
    monthly_expenses_paise: 4200000,
    net_cash_flow_paise: 3300000,
    balance_trend_pct: 8.0,
    income_trend_pct: 3.0,
    expenses_trend_pct: 12.0,
    net_cash_flow_trend_pct: 5.0
  };

  // 1. Spending By Category
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

  const totalSpendingPaise = data?.total_spending_paise || categories.reduce((sum: number, c: any) => sum + c.amount_paise, 0);

  // 2. Monthly Income vs Expenses Chart & Table
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
    income: Math.round(m.income_paise / 100),
    expenses: Math.round(m.spend_paise / 100),
    net: Math.round(m.net_cash_flow_paise / 100)
  }));

  // 3. Future Cash-Flow Forecast
  const forecast = data?.cash_flow_forecast;
  const forecastTimeline = (forecast?.timeline && forecast.timeline.length > 0)
    ? forecast.timeline.map((pt: any) => ({
        date: pt.date,
        p10: Math.round(pt.p10_paise / 100),
        p50: Math.round(pt.p50_paise / 100),
        p90: Math.round(pt.p90_paise / 100),
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

  const endingBalPaise = forecast?.projected_ending_balance_paise || 14500000;
  const lowestBalPaise = forecast?.lowest_projected_balance_paise || 6800000;
  const breachProbPct = forecast?.probability_of_breaching_buffer_pct ?? 12;
  const negProbPct = forecast?.probability_of_negative_balance_pct ?? 2;

  // 4. Upcoming Payments
  const upcomingList = (data?.upcoming_payments && data.upcoming_payments.length > 0)
    ? data.upcoming_payments.map((u: any, idx: number) => {
        let icon = CreditCard;
        let iconBg = "bg-blue-50 text-blue-600";
        const m = (u.merchant || "").toLowerCase();
        if (m.includes("rent") || u.type === "rent") {
          icon = Home;
          iconBg = "bg-rose-50 text-rose-500";
        } else if (m.includes("emi") || u.type === "emi" || m.includes("loan")) {
          icon = CreditCard;
          iconBg = "bg-purple-50 text-purple-600";
        } else if (m.includes("netflix") || m.includes("subscription")) {
          icon = Tv;
          iconBg = "bg-red-50 text-red-600";
        } else if (m.includes("airtel") || m.includes("wifi") || m.includes("internet")) {
          icon = Wifi;
          iconBg = "bg-blue-50 text-blue-500";
        } else if (m.includes("insurance") || u.type === "insurance") {
          icon = ShieldCheck;
          iconBg = "bg-indigo-50 text-indigo-500";
        }

        return {
          id: idx,
          name: u.merchant?.replace("UPI-", "").replace("ACH D-", "").split("-")[0] || u.merchant || "Scheduled Bill",
          date: u.due_date ? `${u.due_date.slice(8, 10)} Nov 2024` : "1 Nov 2024",
          amount_paise: u.amount_paise || 1200000,
          user_status: idx < 3 ? "Auto" : "User",
          icon,
          iconBg
        };
      })
    : [
        { id: 1, name: "Rent", date: "1 Nov 2024", amount_paise: 1200000, user_status: "Auto", icon: Home, iconBg: "bg-rose-50 text-rose-500" },
        { id: 2, name: "Loan EMI", date: "5 Nov 2024", amount_paise: 850000, user_status: "Auto", icon: CreditCard, iconBg: "bg-purple-50 text-purple-600" },
        { id: 3, name: "Netflix", date: "10 Nov 2024", amount_paise: 64900, user_status: "Auto", icon: Tv, iconBg: "bg-red-50 text-red-600" },
        { id: 4, name: "Internet", date: "12 Nov 2024", amount_paise: 99900, user_status: "User", icon: Wifi, iconBg: "bg-blue-50 text-blue-500" },
        { id: 5, name: "Insurance", date: "15 Nov 2024", amount_paise: 200000, user_status: "User", icon: ShieldCheck, iconBg: "bg-indigo-50 text-indigo-500" }
      ];

  // 5. Unusual Transactions (Anomalies)
  const anomaliesList = (data?.top_anomalies && data.top_anomalies.length > 0)
    ? data.top_anomalies.map((a: any, idx: number) => ({
        id: a.id || idx,
        type: a.type === "large_amount" ? "Unusually large transaction" : a.type === "duplicate_charge" ? "Possible duplicate payment" : "New merchant",
        amount_paise: a.amount_paise || 1840000,
        merchant: a.merchant || "XYZ Store",
        desc: a.reason_text?.length > 70 ? a.reason_text.slice(0, 67) + "..." : a.reason_text || "Unusual transaction flagged.",
        time: a.time_ago || "2 days ago",
        badge: a.type === "large_amount" ? "A" : a.type === "duplicate_charge" ? "!" : "+",
        badgeBg: a.type === "large_amount" ? "bg-rose-500" : a.type === "duplicate_charge" ? "bg-amber-500" : "bg-blue-500"
      }))
    : [
        { id: 1, type: "Unusually large transaction", amount_paise: 1840000, merchant: "XYZ Store", desc: "6.2x your typical shopping transaction.", time: "2 days ago", badge: "A", badgeBg: "bg-rose-500" },
        { id: 2, type: "Possible duplicate payment", amount_paise: 250000, merchant: "ABC Services", desc: "Two similar transactions detected.", time: "5 days ago", badge: "!", badgeBg: "bg-amber-500" },
        { id: 3, type: "New merchant", amount_paise: 499900, merchant: "XYZ Electronics", desc: "First transaction with this merchant.", time: "1 week ago", badge: "+", badgeBg: "bg-blue-500" }
      ];

  // 6. Financial Data Health
  const health = data?.financial_data_health || {
    statement_coverage_months: 6,
    transactions_processed: 1250,
    transactions_categorized_pct: 96,
    transactions_needing_review: 18,
    last_successful_import: "30 Oct 2024",
    forecast_readiness: "Ready"
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
      className="p-6 space-y-6 max-w-[1600px] mx-auto"
    >
      {/* ========================================================
          ROW 1: TOP 4 METRIC CARDS
      ======================================================== */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Balance */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex items-start justify-between cursor-default"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <Wallet className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-500">Total Balance</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {formatINR(kpi.total_balance_paise)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Across {kpi.total_accounts_count || 3} accounts
            </p>
          </div>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            8% vs last month
          </span>
        </motion.div>

        {/* 2. Monthly Income */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex items-start justify-between cursor-default"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-500">Monthly Income</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {formatINR(kpi.monthly_income_paise)}
            </p>
            <p className="text-xs text-slate-400 mt-1">This month</p>
          </div>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            3% vs last month
          </span>
        </motion.div>

        {/* 3. Monthly Expenses */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex items-start justify-between cursor-default"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center mb-3">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-500">Monthly Expenses</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              {formatINR(kpi.monthly_expenses_paise)}
            </p>
            <p className="text-xs text-slate-400 mt-1">This month</p>
          </div>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            12% vs last month
          </span>
        </motion.div>

        {/* 4. Net Cash Flow */}
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          transition={{ duration: 0.2 }}
          className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex items-start justify-between cursor-default"
        >
          <div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-slate-500">Net Cash Flow</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              +{formatINR(kpi.net_cash_flow_paise)}
            </p>
            <p className="text-xs text-slate-400 mt-1">This month</p>
          </div>
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
            <TrendingUp className="w-3 h-3" />
            5% vs last month
          </span>
        </motion.div>
      </motion.div>

      {/* ========================================================
          ROW 2: SPENDING BY CATEGORY & MONTHLY INCOME VS EXPENSES
      ======================================================== */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Spending by Category (Donut Chart + Breakdown) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Spending by Category</h3>
              <div className="relative">
                <select className="appearance-none bg-white border border-slate-200 text-xs font-medium text-slate-700 pl-2.5 pr-6 py-1 rounded-md focus:outline-none focus:border-blue-500 cursor-pointer">
                  <option>This month</option>
                  <option>Last month</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
              {/* Donut Chart with Center Text */}
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
                      {categories.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color || "#64748B"} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Center overlay label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-base font-extrabold text-slate-900 leading-tight">
                    {formatINR(totalSpendingPaise)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Total Spending</span>
                  <span className="text-[11px] font-semibold text-slate-500">100%</span>
                </div>
              </div>

              {/* Category Breakdown Rows */}
              <div className="flex-1 w-full space-y-2">
                {categories.slice(0, 6).map((c: any) => (
                  <motion.div 
                    whileHover={{ x: 3 }} 
                    transition={{ duration: 0.15 }}
                    key={c.category_id} 
                    className="flex items-center justify-between text-xs py-0.5 rounded px-1 -mx-1 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }}></span>
                      <span className="text-slate-700 font-medium truncate">{c.category}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-semibold text-slate-900">{formatINR(c.amount_paise)}</span>
                      <span className="text-slate-500 w-7 text-right">{c.percentage}%</span>
                      <span className={`w-10 text-right font-medium text-[11px] flex items-center justify-end ${
                        c.trend_pct > 0 ? (c.category === "Rent" || c.category === "Shopping" ? "text-rose-600" : "text-emerald-600") :
                        c.trend_pct < 0 ? "text-emerald-600" : "text-slate-400"
                      }`}>
                        {c.trend_pct > 0 ? `↑ ${c.trend_pct}%` : c.trend_pct < 0 ? `↓ ${Math.abs(c.trend_pct)}%` : '0%'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <Link 
            href="/transactions" 
            className="text-xs font-semibold text-slate-600 hover:text-blue-600 pt-3 border-t border-slate-100 flex items-center justify-center gap-1 transition"
          >
            View all categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Monthly Income vs Expenses Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">Monthly Income vs Expenses</h3>
              <div className="flex items-center gap-4">
                {/* Custom Legend */}
                <div className="hidden sm:flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> Income
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-400"></span> Expenses
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-3 h-0.5 bg-blue-500"></span> Net Cash Flow
                  </span>
                </div>
                <div className="relative">
                  <select className="appearance-none bg-white border border-slate-200 text-xs font-medium text-slate-700 pl-2.5 pr-6 py-1 rounded-md focus:outline-none focus:border-blue-500 cursor-pointer">
                    <option>Last 6 Months</option>
                    <option>Last 3 Months</option>
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Composed Chart */}
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tickFormatter={(val) => `₹${val >= 100000 ? `${val/100000}L` : `${val/1000}K`}`}
                    tick={{ fontSize: 11, fill: '#64748B' }} 
                    axisLine={false} 
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Bar dataKey="income" fill="#10B981" barSize={16} radius={[3, 3, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="#F87171" barSize={16} radius={[3, 3, 0, 0]} name="Expenses" />
                  <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2.5} dot={{ fill: '#3B82F6', r: 4, stroke: '#FFFFFF', strokeWidth: 2 }} name="Net Cash Flow" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Summary Table Underneath Chart */}
          <div className="border-t border-slate-100 pt-3 mt-2 overflow-x-auto">
            <div className="min-w-[420px] grid grid-cols-7 text-xs text-slate-600 gap-y-1">
              <span className="font-medium text-slate-400">Month</span>
              {rawMonthly.map((m: any, i: number) => (
                <span key={i} className="text-center font-semibold text-slate-700">{m.month_label || m.month}</span>
              ))}

              <span className="font-medium text-slate-400">Income</span>
              {rawMonthly.map((m: any, i: number) => (
                <span key={i} className="text-center font-medium text-slate-800">₹{Math.round(m.income_paise / 100000)}K</span>
              ))}

              <span className="font-medium text-slate-400">Expenses</span>
              {rawMonthly.map((m: any, i: number) => (
                <span key={i} className="text-center font-medium text-slate-800">₹{Math.round(m.spend_paise / 100000)}K</span>
              ))}

              <span className="font-medium text-slate-400">Net Cash Flow</span>
              {rawMonthly.map((m: any, i: number) => (
                <span key={i} className="text-center font-bold text-emerald-600">+₹{Math.round(m.net_cash_flow_paise / 100000)}K</span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ========================================================
          ROW 3: FUTURE CASH-FLOW FORECAST & UPCOMING PAYMENTS
      ======================================================== */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Future Cash-Flow Forecast (Col Span 8) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-slate-900">Future Cash-Flow Forecast</h3>
              <span title="Deterministic 5,000 Monte Carlo simulation based on your salary and recurring obligations.">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
              </span>
            </div>
            <div className="relative">
              <select className="appearance-none bg-white border border-slate-200 text-xs font-medium text-slate-700 pl-2.5 pr-6 py-1 rounded-md focus:outline-none focus:border-blue-500 cursor-pointer">
                <option>Next 90 Days</option>
                <option>Next 60 Days</option>
                <option>Next 30 Days</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
            </div>
          </div>

          {/* Forecast Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mb-4 pb-2 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-pink-500"></span> P10 (Lower)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-blue-600"></span> P50 (Median)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-sky-400"></span> P90 (Higher)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 border-t-2 border-dashed border-amber-500"></span> Safety Buffer
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Salary
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span> Upcoming Payment
            </span>
          </div>

          {/* Chart + Metrics Split */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            {/* Chart View (3 Cols) */}
            <div className="md:col-span-3 h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={forecastTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    tickFormatter={(val) => `₹${val >= 100000 ? `${(val/100000).toFixed(0)}L` : `${val/1000}K`}`}
                    tick={{ fontSize: 11, fill: '#64748B' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  {/* P90 to P10 Area */}
                  <Area type="monotone" dataKey="p90" stroke="none" fill="#E0F2FE" fillOpacity={0.6} />
                  <Line type="monotone" dataKey="p90" stroke="#38BDF8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="P90 (Higher)" />
                  <Line type="monotone" dataKey="p50" stroke="#2563EB" strokeWidth={2.5} dot={false} name="P50 (Median)" />
                  <Line type="monotone" dataKey="p10" stroke="#EC4899" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="P10 (Lower)" />
                  <Line type="monotone" dataKey="buffer" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="3 3" dot={false} name="Safety Buffer" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Right Metrics Panel */}
            <div className="md:col-span-1 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5 space-y-3.5">
              <div>
                <p className="text-[11px] font-medium text-slate-500">Projected ending balance</p>
                <p className="text-xl font-extrabold text-emerald-600 tracking-tight">
                  {formatINR(endingBalPaise)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-slate-500">Lowest projected balance</p>
                <p className="text-xl font-extrabold text-rose-500 tracking-tight">
                  {formatINR(lowestBalPaise)}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-slate-500">Probability of breaching buffer</p>
                <p className="text-base font-bold text-slate-800">
                  {breachProbPct}%
                </p>
              </div>

              <div>
                <p className="text-[11px] font-medium text-slate-500">Probability of negative balance</p>
                <p className="text-base font-bold text-emerald-600">
                  {negProbPct}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Payments (Col Span 4) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Upcoming Payments</h3>
              <Link href="/recurring" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                View All
              </Link>
            </div>

            <div className="space-y-3 divide-y divide-slate-50">
              {upcomingList.map((item: any) => {
                const IconComponent = item.icon || CreditCard;
                return (
                  <motion.div 
                    whileHover={{ x: 3 }}
                    transition={{ duration: 0.15 }}
                    key={item.id} 
                    className="pt-2.5 first:pt-0 flex items-center justify-between rounded-lg px-1.5 -mx-1.5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{item.name}</p>
                        <p className="text-[11px] text-slate-400">{item.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-bold text-slate-900">
                        {formatINR(item.amount_paise)}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        item.user_status === 'Auto'
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-blue-50 text-blue-600'
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

      {/* ========================================================
          ROW 4: BOTTOM 3 CARDS
      ======================================================== */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Ask Financial Decision Lab */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ask Financial Decision Lab</h3>
                <p className="text-xs text-slate-400">Get data-driven answers about your financial decisions</p>
              </div>
            </div>

            {/* Input bar */}
            <form onSubmit={handleNlSubmit} className="relative my-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text"
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                placeholder="What financial decision are you considering?"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-12 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-inner"
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={nlLoading}
                className="w-7 h-7 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white flex items-center justify-center absolute right-1.5 top-1.5 transition"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </form>

            {/* Evaluation Result if user asked */}
            <AnimatePresence>
              {nlResult && (
                <motion.div 
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="p-3 my-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      nlResult.verdict?.code === 'AFFORDABLE' ? 'bg-emerald-100 text-emerald-800' :
                      nlResult.verdict?.code === 'TIGHT' ? 'bg-amber-100 text-amber-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      Verdict: {nlResult.verdict?.code}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      P50 Headroom: <span className="font-semibold text-slate-800">{formatINR(nlResult.headroom?.p50_minor || 0)}</span>
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-[11px]">
                    {nlResult.narration}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick Pills */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleNlSubmit(undefined, "Can I afford an ₹80,000 phone next month?")}
                className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg p-2 text-[11px] text-slate-700 transition"
              >
                Can I afford an ₹80,000 phone next month?
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleNlSubmit(undefined, "How much can I safely spend?")}
                className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg p-2 text-[11px] text-slate-700 transition"
              >
                How much can I safely spend?
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleNlSubmit(undefined, "What if my salary decreases by 20%?")}
                className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg p-2 text-[11px] text-slate-700 transition"
              >
                What if my salary decreases by 20%?
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => handleNlSubmit(undefined, "Can I afford a new EMI?")}
                className="text-left bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg p-2 text-[11px] text-slate-700 transition"
              >
                Can I afford a new EMI?
              </motion.button>
            </div>
          </div>
        </div>

        {/* 2. Unusual Transactions */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">Unusual Transactions</h3>
              <Link href="/anomalies" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                View All
              </Link>
            </div>

            <div className="space-y-3.5">
              {anomaliesList.map((a: any) => (
                <motion.div 
                  whileHover={{ x: 3 }}
                  transition={{ duration: 0.15 }}
                  key={a.id} 
                  className="flex items-start gap-3 rounded-lg p-1.5 -mx-1.5 hover:bg-slate-50 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-xs ${a.badgeBg}`}>
                    {a.badge}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 truncate">{a.type}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">{a.time}</span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">
                      {formatINR(a.amount_paise)} · <span className="text-slate-600 font-medium">{a.merchant}</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">{a.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Financial Data Health */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <h3 className="text-sm font-bold text-slate-900">Financial Data Health</h3>
              <span title="Evaluates data sufficiency before rendering ungrounded advice.">
                <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Statement coverage
                </span>
                <span className="font-semibold text-slate-900">{health.statement_coverage_months} months</span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Transactions processed
                </span>
                <span className="font-semibold text-slate-900">{Number(health.transactions_processed).toLocaleString('en-IN')}</span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Transactions categorized
                </span>
                <span className="font-semibold text-slate-900">{health.transactions_categorized_pct}%</span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-slate-600">
                  <AlertCircle className="w-4 h-4 text-amber-500" /> Transactions needing review
                </span>
                <span className="font-bold text-rose-600">{health.transactions_needing_review}</span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Last successful import
                </span>
                <span className="font-semibold text-slate-900">{health.last_successful_import}</span>
              </motion.div>

              <motion.div whileHover={{ x: 2 }} className="flex items-center justify-between py-0.5">
                <span className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Forecast readiness
                </span>
                <span className="font-semibold text-emerald-600">{health.forecast_readiness}</span>
              </motion.div>
            </div>
          </div>

          {/* Bottom Info Banner */}
          <div className="mt-4 p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg flex items-start gap-2 text-[11px] text-blue-700">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p>Your data looks good! Keep adding your latest statements for more accurate forecasts.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
