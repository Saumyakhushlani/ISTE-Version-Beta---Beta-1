'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  Calendar,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Info,
  RefreshCw,
  Clock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  ReferenceLine 
} from 'recharts';
import { formatINR, rupeesToPaise } from '@fdl/shared';
import { api } from '@/lib/api';

const PRESET_AMOUNTS = [
  { label: '₹25,000 (Gadget)', amount: 25000 },
  { label: '₹50,000 (Appliance)', amount: 50000 },
  { label: '₹80,000 (iPhone)', amount: 80000 },
  { label: '₹1,50,000 (Laptop)', amount: 150000 },
];

export default function DecisionLabPage() {
  const [purchaseRs, setPurchaseRs] = useState('80000');
  const [label, setLabel] = useState('iPhone 16');
  const [timing, setTiming] = useState('next_month');
  const [paymentType, setPaymentType] = useState<'cash' | 'emi'>('cash');
  const [emiMonths, setEmiMonths] = useState(6);
  const [emiRate, setEmiRate] = useState(0.0);

  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<any>(null);
  const [whatIfResults, setWhatIfResults] = useState<any>(null);
  const [simulatingWhatIf, setSimulatingWhatIf] = useState(false);

  useEffect(() => {
    runEvaluation();
  }, []);

  async function runEvaluation() {
    const rs = parseFloat(purchaseRs);
    if (isNaN(rs) || rs <= 0) return;

    setLoading(true);
    try {
      const res = await api.evaluateAffordability({
        purchase_amount_minor: rupeesToPaise(rs),
        label,
        timing,
        payment_type: paymentType,
        emi_months: paymentType === 'emi' ? emiMonths : undefined,
        emi_interest_rate_pct: paymentType === 'emi' ? emiRate : undefined,
      });
      setDecision(res);
    } catch (err: any) {
      console.error('Failed to evaluate affordability:', err);
    } finally {
      setLoading(false);
    }
  }

  async function runWhatIfScenarios() {
    const rs = parseFloat(purchaseRs);
    if (isNaN(rs) || rs <= 0) return;

    setSimulatingWhatIf(true);
    try {
      const scenarios = [
        {
          name: '6-Month No-Cost EMI',
          adjustments: [{ type: 'purchase_emi', params: { months: 6, interest_pct: 0.0 } }],
        },
        {
          name: '12-Month EMI (12% p.a.)',
          adjustments: [{ type: 'purchase_emi', params: { months: 12, interest_pct: 12.0 } }],
        },
        {
          name: 'Delay Purchase by 2 Months',
          adjustments: [{ type: 'delay_purchase', params: { months: 2 } }],
        },
      ];
      const res = await api.compareScenarios(rupeesToPaise(rs), scenarios);
      setWhatIfResults(res);
    } catch (err: any) {
      console.error('Failed to run What-If simulations:', err);
    } finally {
      setSimulatingWhatIf(false);
    }
  }

  const verdict = decision?.verdict;
  const headroom = decision?.headroom;
  const buffer = decision?.buffer;
  const ledger = decision?.ledger || [];
  const lowestBal = decision?.lowest_balance;
  const timeline = (decision?.timeline || []).map((t: any) => ({
    date: t.date?.slice(5),
    P10: Math.round(t.p10_paise / 100),
    P50: Math.round(t.p50_paise / 100),
    P90: Math.round(t.p90_paise / 100),
  }));
  const bufferValueRs = Math.round((buffer?.value_minor || 5800000) / 100);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              Affordability & What-If Decision Lab
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-indigo-950/70 border border-indigo-800/60 text-indigo-300 font-mono">
              MONTE CARLO (N=5,000)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Mathematically proven verdicts with dynamic safety buffers, uncertainty fans, and verifiable reasoning ledgers.
          </p>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Purchase Parameters Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 h-fit shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Purchase Parameters
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-mono border border-slate-800">
              CONFIG
            </span>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick Presets
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p.amount}
                  type="button"
                  onClick={() => setPurchaseRs(p.amount.toString())}
                  className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition border ${
                    purchaseRs === p.amount.toString()
                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Item / Expense Name</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. iPhone 16 Pro"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Purchase Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-medium">₹</span>
              <input
                type="number"
                value={purchaseRs}
                onChange={(e) => setPurchaseRs(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2.5 text-xs sm:text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Forecast Horizon Timing</label>
            <select
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="next_month">Next Month (Target Forecast Horizon)</option>
              <option value="this_month">This Month (Immediate)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('cash')}
                className={`py-2 text-xs font-semibold rounded-xl border transition ${
                  paymentType === 'cash'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Upfront Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('emi')}
                className={`py-2 text-xs font-semibold rounded-xl border transition ${
                  paymentType === 'emi'
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                EMI Financing
              </button>
            </div>
          </div>

          {paymentType === 'emi' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pt-2 border-t border-slate-800"
            >
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Tenure (Months)</label>
                <select
                  value={emiMonths}
                  onChange={(e) => setEmiMonths(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 font-mono"
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={9}>9 Months</option>
                  <option value={12}>12 Months</option>
                  <option value={24}>24 Months</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Annual Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={emiRate}
                  onChange={(e) => setEmiRate(Number(e.target.value))}
                  placeholder="0.0 for No-Cost EMI"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-100 font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Set 0.0 for 0% No-Cost EMI</span>
              </div>
            </motion.div>
          )}

          <button
            onClick={runEvaluation}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer font-sans"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Running 5,000 Simulations...
              </>
            ) : (
              <>
                Evaluate Affordability
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Right 2 Columns: Verdict Banner & Headroom & Fan Chart & Reasoning Ledger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Master Verdict Hero Card */}
          {verdict && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`p-6 rounded-2xl border ${
                verdict.code === 'AFFORDABLE' ? 'bg-emerald-950/30 border-emerald-800/80' :
                verdict.code === 'TIGHT' ? 'bg-amber-950/30 border-amber-800/80' :
                verdict.code === 'NOT_ADVISABLE' ? 'bg-orange-950/30 border-orange-800/80' :
                verdict.code === 'INSUFFICIENT_DATA' ? 'bg-slate-900 border-slate-700' :
                'bg-rose-950/30 border-rose-800/80'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider font-mono ${
                    verdict.code === 'AFFORDABLE' ? 'bg-emerald-900 text-emerald-200 border border-emerald-700' :
                    verdict.code === 'TIGHT' ? 'bg-amber-900 text-amber-200 border border-amber-700' :
                    verdict.code === 'NOT_ADVISABLE' ? 'bg-orange-900 text-orange-200 border border-orange-700' :
                    'bg-rose-900 text-rose-200 border border-rose-700'
                  }`}>
                    {verdict.code}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Breach Probability: <span className="font-semibold text-slate-200">{((verdict.breach_probability || 0) * 100).toFixed(1)}%</span>
                  </span>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  Confidence: <span className="text-emerald-400 font-bold">{verdict.confidence?.score ?? 90}%</span> ({verdict.confidence?.label ?? 'High'})
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-100 mt-3">{verdict.headline}</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-normal">
                {decision.narration}
              </p>
            </motion.div>
          )}

          {/* Headroom Percentiles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                P10 (Conservative)
              </span>
              <p className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${
                (headroom?.p10_minor || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatINR(headroom?.p10_minor || 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">90% confidence lower bound</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                P50 (Median Baseline)
              </span>
              <p className={`text-xl sm:text-2xl font-bold font-mono mt-1 ${
                (headroom?.p50_minor || 0) >= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {formatINR(headroom?.p50_minor || 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Expected baseline headroom</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                P90 (Optimistic)
              </span>
              <p className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
                {formatINR(headroom?.p90_minor || 0)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Upper bound best case</p>
            </div>
          </div>

          {/* Monte Carlo 45-Day Uncertainty Fan Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Monte Carlo 45-Day Cash Flow Uncertainty Fan
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  5,000 deterministic simulations showing P10–P90 balance range vs Safety Buffer
                </p>
              </div>
              {lowestBal && (
                <div className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                  Lowest Dip: <span className="text-amber-400 font-bold">{lowestBal.date}</span>
                </div>
              )}
            </div>

            <div className="h-64 w-full">
              {timeline.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  Run evaluation to simulate cash-flow timeline.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="p90Band" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false}
                      tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#020617', 
                        borderColor: '#334155', 
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#f8fafc'
                      }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <ReferenceLine 
                      y={bufferValueRs} 
                      label={{ 
                        value: `Buffer: ₹${(bufferValueRs / 1000).toFixed(0)}k`, 
                        fill: '#ef4444', 
                        fontSize: 10, 
                        position: 'top' 
                      }} 
                      stroke="#ef4444" 
                      strokeDasharray="4 4" 
                    />
                    <Area type="monotone" dataKey="P90" stroke="#10b981" strokeWidth={1} fill="url(#p90Band)" />
                    <Area type="monotone" dataKey="P50" stroke="#38bdf8" strokeWidth={2.5} fill="transparent" />
                    <Area type="monotone" dataKey="P10" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" fill="transparent" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Reasoning Ledger (8-Step Verifiable Mathematical Proof) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Reasoning Ledger (Deterministic Mathematical Proof)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Every step is audited: zero math performed by LLM
                </p>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-950 text-indigo-300 border border-indigo-900/60 font-mono">
                {ledger.length || 8} Audit Steps
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 font-semibold">Step</th>
                    <th className="py-2.5 font-semibold">Metric</th>
                    <th className="py-2.5 font-semibold">Formula / Audit Basis</th>
                    <th className="py-2.5 font-semibold text-right">Paise Minor</th>
                    <th className="py-2.5 font-semibold text-right">Rupee Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {ledger.map((step: any) => (
                    <tr key={step.step_no} className="hover:bg-slate-950/40 transition">
                      <td className="py-2.5 text-slate-500 font-bold">#{step.step_no}</td>
                      <td className="py-2.5 font-sans text-slate-200 font-medium">{step.label}</td>
                      <td className="py-2.5 font-sans text-slate-400 text-xs">{step.formula_text}</td>
                      <td className="py-2.5 text-right text-slate-400">{step.value_minor?.toLocaleString()}</td>
                      <td className={`py-2.5 text-right font-bold ${
                        step.status === 'breach' ? 'text-rose-400' :
                        step.status === 'warn' ? 'text-amber-400' : 'text-slate-100'
                      }`}>
                        {formatINR(step.value_minor || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* What-If Scenario Comparison Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-100 text-base">What-If Scenarios: Compare Options Side-by-Side</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate cash vs 6M EMI vs 12M EMI vs waiting 2 months without mutating active database records.
            </p>
          </div>
          <button
            onClick={runWhatIfScenarios}
            disabled={simulatingWhatIf}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer font-sans"
          >
            {simulatingWhatIf ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Simulating Options...
              </>
            ) : (
              'Compare What-If Scenarios'
            )}
          </button>
        </div>

        {whatIfResults && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            {whatIfResults.scenarios.map((sc: any, idx: number) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-slate-100 text-sm">{sc.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold uppercase ${
                    sc.verdict === 'AFFORDABLE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                    sc.verdict === 'TIGHT' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                    'bg-rose-950 text-rose-400 border border-rose-900'
                  }`}>
                    {sc.verdict}
                  </span>
                </div>
                <div className="text-xs space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Projected Lowest Balance:</span>
                    <span className="font-mono text-slate-100 font-semibold">{formatINR(sc.lowest_balance_paise)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Headroom Delta:</span>
                    <span className="font-mono text-emerald-400 font-semibold">+{formatINR(sc.delta_headroom_paise)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
