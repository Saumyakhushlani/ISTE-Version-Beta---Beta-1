'use client';

import React, { useState, useEffect } from 'react';
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
  HelpCircle,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  
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

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank_hint', bankHint);

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
      setUploadMessage('Statement committed successfully! Data refreshed.');
      setPreviewData(null);
      setUploadFile(null);
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadMessage(null);
        loadDashboardData();
      }, 1500);
    } catch (err: any) {
      setUploadMessage(`Error committing statement: ${err.message}`);
    } finally {
      setUploadLoading(false);
    }
  }

  const multiBank = data?.multi_bank_liquidity;
  const combined = multiBank?.combined;
  const accounts = multiBank?.accounts || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Financial Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Deterministic cash flow, multi-bank liquidity, and upcoming commitments.
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-950/40 transition active:scale-95"
        >
          <Upload className="w-4 h-4" />
          + Upload Statement (CSV / PDF)
        </button>
      </div>

      {/* Natural Language Decision Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <form onSubmit={handleNlAsk} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 text-emerald-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              placeholder='Ask anything: "Can I afford an iPhone for ₹80,000 next month?" or "Can I buy a laptop on 6 months EMI?"'
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>
          <button
            type="submit"
            disabled={nlEvaluating}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-xl text-sm transition shadow-md shadow-emerald-950/30 flex items-center justify-center gap-2"
          >
            {nlEvaluating ? 'Evaluating Math...' : 'Evaluate'}
          </button>
        </form>

        {/* Instant Decision Result Box */}
        {nlResult && (
          <div className="mt-4 p-4 rounded-xl border border-slate-700/60 bg-slate-950/80 animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
                nlResult.verdict?.code === 'AFFORDABLE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                nlResult.verdict?.code === 'TIGHT' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                nlResult.verdict?.code === 'NOT_ADVISABLE' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                Verdict: {nlResult.verdict?.code}
              </span>
              <span className="text-xs text-slate-400">
                P50 Headroom: <span className="font-semibold text-slate-200">{formatINR(nlResult.headroom?.p50_minor || 0)}</span>
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              {nlResult.narration}
            </p>
          </div>
        )}
      </div>

      {/* Combined Position Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Liquid Cash</span>
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-2 tracking-tight">
            {formatINR(combined?.total_current_balance_paise || data?.net_position_paise || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            Across {accounts.length || 1} connected bank accounts
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Inflow</span>
            <ArrowDownRight className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2 tracking-tight">
            {formatINR(combined?.total_inflow_paise || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-2">Cumulative income credits</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Outflow</span>
            <ArrowUpRight className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-3xl font-extrabold text-rose-400 mt-2 tracking-tight">
            {formatINR(combined?.total_outflow_paise || 0)}
          </p>
          <p className="text-xs text-slate-400 mt-2">Cumulative debits (excl. internal)</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Safety Buffer</span>
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-extrabold text-indigo-400 mt-2 tracking-tight">
            {formatINR(data?.safety_buffer?.value_paise || 5800000)}
          </p>
          <p className="text-xs text-slate-400 mt-2 truncate">
            {data?.safety_buffer?.reason || 'Dynamic safety reserve'}
          </p>
        </div>
      </div>

      {/* Multi-Bank Breakdown Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-400" />
            Connected Accounts & Cash Flow
          </h2>
          <span className="text-xs text-slate-400">All amounts in integer paise</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acct: any) => (
            <div key={acct.account_id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-emerald-400">
                      {acct.bank.slice(0, 3).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{acct.nickname}</h4>
                      <p className="text-xs text-slate-400">Last 4: •••• {acct.masked_last4}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {acct.transaction_count} txns
                  </span>
                </div>

                <div className="mt-5">
                  <span className="text-xs text-slate-400">Current Balance</span>
                  <p className="text-2xl font-bold text-white tracking-tight mt-0.5">
                    {formatINR(acct.current_balance_paise)}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Inflow:</span>
                  <p className="text-emerald-400 font-medium">{formatINR(acct.inflow_paise)}</p>
                </div>
                <div>
                  <span className="text-slate-400">Outflow:</span>
                  <p className="text-rose-400 font-medium">{formatINR(acct.outflow_paise)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Smart Liquidity Advisor + Upcoming Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Investment / Liquidity Advisor */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                Smart Liquidity & Transfer Advisor
              </h3>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-900">
                Rule-Based Protection
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Want to lock in an FD, SIP, or large investment? Tell us how much, and we will calculate which bank account to transfer from without risking upcoming bills.
            </p>

            <div className="mt-4 flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-medium">₹</span>
                <input
                  type="number"
                  value={investmentInputRs}
                  onChange={(e) => setInvestmentInputRs(e.target.value)}
                  placeholder="100000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                onClick={handleGetAdvice}
                disabled={adviceLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition"
              >
                {adviceLoading ? 'Calculating...' : 'Advise Account'}
              </button>
            </div>

            {adviceResult && (
              <div className="mt-4 p-4 rounded-xl border border-slate-800 bg-slate-950">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    adviceResult.verdict === 'FEASIBLE' ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {adviceResult.verdict}
                  </span>
                  <span className="text-xs text-slate-400">
                    Safe Surplus: <span className="text-white font-semibold">{formatINR(adviceResult.total_safe_surplus_paise)}</span>
                  </span>
                </div>
                <p className="text-sm text-slate-200">{adviceResult.recommendation}</p>

                {adviceResult.allocation && adviceResult.allocation.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {adviceResult.allocation.map((alloc: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-xs py-1 border-t border-slate-900">
                        <span className="text-slate-400">Debit from {alloc.bank}:</span>
                        <span className="font-semibold text-indigo-300">{formatINR(alloc.amount_paise)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Payments Calendar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              Upcoming Payments (Next 30 Days)
            </h3>
            <span className="text-xs text-slate-400 font-mono">{upcoming.length} scheduled</span>
          </div>

          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No upcoming recurring obligations detected.
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {upcoming.map((item, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                      {item.due_date?.slice(8, 10)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.merchant}</p>
                      <p className="text-xs text-slate-400">
                        {item.type.toUpperCase()} • Deducts from <span className="text-emerald-400 font-medium">{item.bank_attributed}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-400">-{formatINR(item.typical_amount_paise)}</p>
                    <p className="text-xs text-slate-500">{item.due_date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Statement Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Upload Bank Statement</h3>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Supports CSV & PDF statements (HDFC, SBI, ICICI, Axis, PhonePe, GPay, Paytm). Bank is auto-detected automatically.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Bank (Optional hint — leave on Auto to detect automatically)
                </label>
                <select
                  value={bankHint}
                  onChange={(e) => setBankHint(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                >
                  <option value="auto">Auto-detect bank from statement headers</option>
                  <option value="HDFC">HDFC Bank</option>
                  <option value="SBI">State Bank of India (SBI)</option>
                  <option value="ICICI">ICICI Bank</option>
                  <option value="Axis">Axis Bank</option>
                  <option value="PhonePe">PhonePe / UPI</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Select File</label>
                <input
                  type="file"
                  accept=".csv,.pdf"
                  onChange={handleFilePreview}
                  className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-400 hover:file:bg-slate-700"
                />
              </div>
            </div>

            {/* Preview Box */}
            {previewData && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Detected Bank:</span>
                  <span className="font-semibold text-emerald-400">{previewData.bank_detected} (•••• {previewData.masked_last4})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transactions Found:</span>
                  <span className="font-semibold text-white">{previewData.rows_detected}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reconciliation:</span>
                  <span className={`font-semibold ${previewData.reconciliation_status === 'PASSED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {previewData.reconciliation_status}
                  </span>
                </div>
              </div>
            )}

            {uploadMessage && (
              <p className="text-xs text-amber-300">{uploadMessage}</p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              {previewData && (
                <button
                  type="button"
                  onClick={handleCommitUpload}
                  disabled={uploadLoading}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-sm"
                >
                  {uploadLoading ? 'Saving...' : 'Confirm & Ingest'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
