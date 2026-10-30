'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Calendar, 
  Sparkles, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  TrendingUp, 
  ShieldCheck,
  ChevronRight,
  Lock,
  FileText,
  Clock,
  Layers,
  ArrowRight,
  RefreshCw,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

const BANK_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  HDFC: { bg: 'bg-blue-950/70', text: 'text-blue-400', border: 'border-blue-800/60' },
  SBI: { bg: 'bg-sky-950/70', text: 'text-sky-300', border: 'border-sky-800/60' },
  ICICI: { bg: 'bg-orange-950/70', text: 'text-orange-400', border: 'border-orange-800/60' },
  AXIS: { bg: 'bg-rose-950/70', text: 'text-rose-400', border: 'border-rose-800/60' },
  PHONEPE: { bg: 'bg-purple-950/70', text: 'text-purple-400', border: 'border-purple-800/60' },
  DEFAULT: { bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-800' },
};

function getBankBadge(bankName: string = '') {
  const upper = bankName.toUpperCase();
  for (const key of Object.keys(BANK_BADGES)) {
    if (upper.includes(key)) return BANK_BADGES[key];
  }
  return BANK_BADGES.DEFAULT;
}

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Natural language query
  const [nlQuery, setNlQuery] = useState('');
  const [nlEvaluating, setNlEvaluating] = useState(false);
  const [nlResult, setNlResult] = useState<any>(null);

  // Liquidity Advice modal/input
  const [investmentInputRs, setInvestmentInputRs] = useState('100000');
  const [adviceResult, setAdviceResult] = useState<any>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [bankHint, setBankHint] = useState('auto');
  const [pdfPassword, setPdfPassword] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [dash, sched] = await Promise.all([
        api.getDashboardSummary().catch(() => null),
        api.getUpcomingSchedule(30).catch(() => ({ schedule: [] })),
      ]);
      setData(dash);
      setUpcoming(sched?.schedule || []);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleNlAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!nlQuery.trim()) return;
    setNlEvaluating(true);
    try {
      const res = await api.askAffordability(nlQuery);
      setNlResult(res);
    } catch (err: any) {
      alert(`Error evaluating query: ${err.message}`);
    } finally {
      setNlEvaluating(false);
    }
  }

  async function handleGetAdvice() {
    const rs = parseFloat(investmentInputRs);
    if (isNaN(rs) || rs <= 0) return;
    setAdviceLoading(true);
    try {
      const res = await api.getLiquidityAdvice(Math.round(rs * 100));
      setAdviceResult(res);
    } catch (err: any) {
      alert(`Error getting advice: ${err.message}`);
    } finally {
      setAdviceLoading(false);
    }
  }

  async function handleFilePreview(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadLoading(true);
    setUploadMessage(null);
    setPreviewData(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank_hint', bankHint);
    if (pdfPassword.trim()) {
      formData.append('password', pdfPassword.trim());
    }

    try {
      const prev = await api.previewStatement(formData);
      setPreviewData(prev);
    } catch (err: any) {
      setUploadMessage(`Error previewing file: ${err.message}`);
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleRetryPreviewWithPassword() {
    if (!uploadFile) return;
    setUploadLoading(true);
    setUploadMessage(null);

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('bank_hint', bankHint);
    if (pdfPassword.trim()) {
      formData.append('password', pdfPassword.trim());
    }

    try {
      const prev = await api.previewStatement(formData);
      setPreviewData(prev);
    } catch (err: any) {
      setUploadMessage(`Error previewing file: ${err.message}`);
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleCommitUpload() {
    if (!previewData?.file_id) return;
    setUploadLoading(true);
    try {
      await api.commitStatement(previewData.file_id);
      setUploadMessage('Statement committed successfully! Refreshing ledger...');
      setPreviewData(null);
      setUploadFile(null);
      setPdfPassword('');
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadMessage(null);
        loadDashboardData();
      }, 1200);
    } catch (err: any) {
      setUploadMessage(`Error committing statement: ${err.message}`);
    } finally {
      setUploadLoading(false);
    }
  }

  const accounts = data?.accounts_breakdown || [];
  const monthlyData = (data?.monthly_summary || []).map((m: any) => ({
    month: m.month,
    Income: m.income_paise / 100,
    Spend: m.spend_paise / 100,
  }));
  const categorySpend = data?.category_spend || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              Executive Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-slate-900 border border-slate-700/80 text-emerald-400 font-mono">
              LIVE MULTI-BANK
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Deterministic cash flow, multi-account liquidity, and upcoming commitments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            title="Refresh Ledger"
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-700 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            + Ingest Bank Statement
          </button>
        </div>
      </div>

      {/* Natural Language Decision Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-28 bg-emerald-500/5 blur-3xl pointer-events-none" />
        <form onSubmit={handleNlAsk} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder='Ask affordability: "Can I afford an iPhone for ₹80,000 next month?" or "Can I buy a Mac on 6 months EMI?"'
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/80 transition"
            />
          </div>
          <button
            type="submit"
            disabled={nlEvaluating}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl text-sm transition shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer font-sans"
          >
            {nlEvaluating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                Evaluate Affordability
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Natural Language Result Dropdown Banner */}
        {nlResult && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded font-mono font-bold uppercase text-[11px] ${
                  nlResult.verdict?.code === 'AFFORDABLE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                  nlResult.verdict?.code === 'TIGHT' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                  'bg-rose-950 text-rose-400 border border-rose-900'
                }`}>
                  {nlResult.verdict?.code || 'VERDICT'}
                </span>
                <span className="text-slate-300 font-medium">
                  {nlResult.verdict?.headline || 'Evaluation complete.'}
                </span>
              </div>
              <p className="text-slate-400 italic">
                "{nlResult.narrative || nlResult.verdict?.explanation}"
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right font-mono">
                <span className="text-slate-500 text-[11px] block">Confidence P50 Headroom</span>
                <span className="font-semibold text-emerald-400">{formatINR(nlResult.headroom?.p50_minor || 0)}</span>
              </div>
              <a 
                href="/lab" 
                className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition"
              >
                Inspect Ledger <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Above-The-Fold KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Liquid Position */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Liquid Cash
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 mt-2 tracking-tight">
            {formatINR(data?.combined_liquid_paise || 0)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Across {accounts.length || 1} connected accounts</span>
          </div>
        </motion.div>

        {/* Total Inflow */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Inflow
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mt-2 tracking-tight">
            {formatINR(data?.combined_inflow_paise || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Verified salary & income credits
          </p>
        </motion.div>

        {/* Total Outflow */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Outflow
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-rose-400 mt-2 tracking-tight">
            {formatINR(data?.combined_outflow_paise || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Net debits (excl. internal transfers)
          </p>
        </motion.div>

        {/* Dynamic Safety Buffer */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.15 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Safety Reserve
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-indigo-400 mt-2 tracking-tight">
            {formatINR(5800000)}
          </p>
          <p className="text-xs text-slate-400 mt-2 truncate">
            Max(Floor ₹25k, Essentials ₹58k)
          </p>
        </motion.div>
      </div>

      {/* Charts Section: Cash Flow Dynamics & Spending Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income vs Spend Monthly Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Monthly Cash Flow Dynamics
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Income credits vs spend debits across all verified statements
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">Unit: ₹ (Rupees)</span>
          </div>

          <div className="h-64 w-full">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#020617', 
                      borderColor: '#1e293b', 
                      borderRadius: '0.75rem', 
                      fontSize: '12px' 
                    }}
                    formatter={(val: number) => [`₹${val.toLocaleString('en-IN')}`, '']}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span className="text-xs text-slate-300 capitalize">{val}</span>}
                  />
                  <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Spend" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No monthly statement data available yet. Ingest a statement to visualize trends.
              </div>
            )}
          </div>
        </div>

        {/* Category Spend Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Category Spend Breakdown
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Expense distribution across classified categories
            </p>

            <div className="mt-4 space-y-3">
              {categorySpend.slice(0, 5).map((cat: any) => (
                <div key={cat.category_id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-300 flex items-center gap-1.5">
                      <span 
                        className="w-2.5 h-2.5 rounded-full inline-block" 
                        style={{ backgroundColor: cat.color }} 
                      />
                      {cat.category}
                    </span>
                    <span className="font-mono text-slate-200">
                      {formatINR(cat.amount_paise)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        backgroundColor: cat.color,
                        width: `${Math.min(100, Math.max(5, (cat.amount_paise / (data?.combined_outflow_paise || 1)) * 100))}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
              {categorySpend.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-6">
                  No categorized expenses recorded yet.
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>Excludes intra-account self transfers</span>
          </div>
        </div>
      </div>

      {/* Connected Accounts Breakdown Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Multi-Bank Liquidity Breakdown
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live balances and throughput per verified bank account
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Minor Unit: Integer Paise
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acct: any) => {
            const badge = getBankBadge(acct.bank);
            return (
              <div 
                key={acct.account_id} 
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs border ${badge.bg} ${badge.text} ${badge.border}`}>
                        {acct.bank.slice(0, 4).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-100 text-sm">{acct.nickname}</h3>
                        <p className="text-xs text-slate-500 font-mono">•••• {acct.masked_last4}</p>
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-950 text-slate-400 font-mono border border-slate-800">
                      {acct.transaction_count} txns
                    </span>
                  </div>

                  <div className="mt-5">
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Current Cleared Balance
                    </span>
                    <p className="text-2xl font-bold font-mono text-slate-100 tracking-tight mt-0.5">
                      {formatINR(acct.current_balance_paise ?? 0)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Total Inflow</span>
                    <p className="text-emerald-400 font-mono font-medium">
                      {formatINR(acct.inflow_paise ?? acct.total_inflow_paise ?? 0)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Total Outflow</span>
                    <p className="text-rose-400 font-mono font-medium">
                      {formatINR(acct.outflow_paise ?? acct.total_outflow_paise ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Section: Smart Liquidity Advisor + Upcoming Commitments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Investment / Liquidity Advisor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                Smart Investment & Transfer Advisor
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-900 font-mono">
                DETERMINISTIC SOURCING
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Want to lock an FD, SIP, or lump-sum asset? Enter the amount to calculate safe sourcing across accounts without jeopardizing upcoming bills.
            </p>

            <div className="mt-4 flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-medium">₹</span>
                <input
                  type="number"
                  value={investmentInputRs}
                  onChange={(e) => setInvestmentInputRs(e.target.value)}
                  placeholder="100000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
              <button
                onClick={handleGetAdvice}
                disabled={adviceLoading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-xs sm:text-sm transition cursor-pointer"
              >
                {adviceLoading ? 'Calculating Sourcing...' : 'Calculate Sourcing'}
              </button>
            </div>

            {adviceResult && (
              <motion.div 
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-950 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold font-mono uppercase tracking-wider ${
                    (adviceResult.verdict === 'FEASIBLE' || adviceResult.feasible) ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {adviceResult.verdict || (adviceResult.feasible ? 'FEASIBLE' : 'TIGHT')}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Total Safe Surplus: <span className="text-slate-100 font-bold">{formatINR(adviceResult.total_safe_surplus_paise ?? adviceResult.combined_liquid_paise ?? 0)}</span>
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {adviceResult.recommendation || adviceResult.advice_text}
                </p>

                {(adviceResult.allocation || adviceResult.transfers_plan) && ((adviceResult.allocation && adviceResult.allocation.length > 0) || (adviceResult.transfers_plan && adviceResult.transfers_plan.length > 0)) && (
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-900">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Recommended Debit Allocation
                    </span>
                    {(adviceResult.allocation && adviceResult.allocation.length > 0 ? adviceResult.allocation : adviceResult.transfers_plan).map((alloc: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs py-1 px-2 rounded bg-slate-900/60 border border-slate-800/60">
                        <span className="text-slate-300 font-medium">Debit from {alloc.bank || alloc.from_bank}</span>
                        <span className="font-mono font-bold text-indigo-300">{formatINR(alloc.amount_paise ?? alloc.transfer_amount_paise ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Upcoming Commitments Calendar (Next 30 Days) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-slate-100 text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                Upcoming Commitments (Next 30 Days)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Predicted obligations based on detected cadence
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-950 border border-slate-800">
              {upcoming.length} scheduled
            </span>
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs sm:text-sm">
              No upcoming recurring obligations detected in the next 30 days.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {upcoming.map((item, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between hover:border-slate-700/80 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-mono font-bold text-slate-200">
                      {item.due_date?.slice(8, 10)}
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-100">{item.merchant}</p>
                      <p className="text-[11px] text-slate-400">
                        {item.type.toUpperCase()} • Deducts from <span className="text-emerald-400 font-medium">{item.bank_attributed || item.bank_name || 'Bank Account'}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-bold font-mono text-rose-400">
                      -{formatINR(item.typical_amount_paise ?? item.amount_paise ?? item.typical_amount_minor ?? 0)}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500">{item.due_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Statement Upload Modal with PDF Password Support */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  Ingest Bank Statement
                </h2>
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="text-slate-400 hover:text-white text-sm p-1 rounded-lg hover:bg-slate-800 transition"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Upload CSV or password-protected PDF statements (HDFC, SBI, ICICI, Axis). Bank formats and tables are automatically detected.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Bank (Optional Hint — Auto-detect recommended)
                  </label>
                  <select
                    value={bankHint}
                    onChange={(e) => setBankHint(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="auto">Auto-detect bank automatically</option>
                    <option value="HDFC">HDFC Bank</option>
                    <option value="SBI">State Bank of India (SBI)</option>
                    <option value="ICICI">ICICI Bank</option>
                    <option value="Axis">Axis Bank</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Select File (.csv or .pdf)</label>
                  <input
                    type="file"
                    accept=".csv,.pdf"
                    onChange={handleFilePreview}
                    className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700 cursor-pointer"
                  />
                </div>

                {/* PDF Password Input if file is PDF or required */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    PDF Password (if encrypted, e.g. PAN + DOB)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={pdfPassword}
                      onChange={(e) => setPdfPassword(e.target.value)}
                      placeholder="e.g. ABCDE1234F01011990"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    {uploadFile && (
                      <button
                        type="button"
                        onClick={handleRetryPreviewWithPassword}
                        disabled={uploadLoading}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-medium transition"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Ingestion Preview Summary */}
              {previewData && (
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Detected Bank:</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      {previewData.bank_detected} (•••• {previewData.masked_last4})
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Transactions Found:</span>
                    <span className="font-mono font-semibold text-slate-100">{previewData.rows_detected}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Reconciliation Check:</span>
                    <span className={`font-mono font-semibold ${
                      previewData.reconciliation_status === 'PASSED' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {previewData.reconciliation_status}
                    </span>
                  </div>
                </div>
              )}

              {uploadMessage && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-900/60 text-xs text-amber-300">
                  {uploadMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm text-slate-400 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                {previewData && (
                  <button
                    type="button"
                    onClick={handleCommitUpload}
                    disabled={uploadLoading}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
                  >
                    {uploadLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Ingesting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Commit to Ledger
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
