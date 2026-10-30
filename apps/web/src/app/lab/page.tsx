'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Sliders, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Layers, 
  Calendar,
  ChevronRight,
  TrendingDown,
  Info
} from 'lucide-react';
import { formatINR, rupeesToPaise } from '@fdl/shared';
import { api } from '@/lib/api';

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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Affordability & What-If Decision Lab</h1>
        <p className="text-sm text-slate-400 mt-1">
          Mathematically verified decisions with 5,000 Monte Carlo runs and step-by-step Reasoning Ledgers.
        </p>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Purchase Parameters Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 h-fit">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              Purchase Parameters
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">Input</span>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Item / Expense Name</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Purchase Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
              <input
                type="number"
                value={purchaseRs}
                onChange={(e) => setPurchaseRs(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Timing</label>
            <select
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
            >
              <option value="next_month">Next Month (Target Forecast Horizon)</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-300 block mb-1">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('cash')}
                className={`py-2 text-xs font-medium rounded-xl border transition ${
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
                className={`py-2 text-xs font-medium rounded-xl border transition ${
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
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Tenure (Months)</label>
                <select
                  value={emiMonths}
                  onChange={(e) => setEmiMonths(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={9}>9 Months</option>
                  <option value={12}>12 Months</option>
                  <option value={24}>24 Months</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Annual Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={emiRate}
                  onChange={(e) => setEmiRate(Number(e.target.value))}
                  placeholder="0.0 for No-Cost EMI"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
          )}

          <button
            onClick={runEvaluation}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm transition shadow-lg shadow-emerald-950/40"
          >
            {loading ? 'Running 5,000 Simulations...' : 'Re-evaluate Affordability'}
          </button>
        </div>

        {/* Right 2 Columns: Verdict Banner & Headroom & Reasoning Ledger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Master Verdict Card */}
          {verdict && (
            <div className={`p-6 rounded-2xl border ${
              verdict.code === 'AFFORDABLE' ? 'bg-emerald-950/40 border-emerald-800/80' :
              verdict.code === 'TIGHT' ? 'bg-amber-950/40 border-amber-800/80' :
              verdict.code === 'NOT_ADVISABLE' ? 'bg-orange-950/40 border-orange-800/80' :
              verdict.code === 'INSUFFICIENT_DATA' ? 'bg-slate-900 border-slate-700' :
              'bg-rose-950/40 border-rose-800/80'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  verdict.code === 'AFFORDABLE' ? 'bg-emerald-900 text-emerald-200' :
                  verdict.code === 'TIGHT' ? 'bg-amber-900 text-amber-200' :
                  verdict.code === 'NOT_ADVISABLE' ? 'bg-orange-900 text-orange-200' :
                  'bg-rose-900 text-rose-200'
                }`}>
                  Verdict: {verdict.code}
                </span>

                <span className="text-xs text-slate-400">
                  Breach Probability: <span className="font-semibold text-slate-200">{(verdict.breach_probability * 100).toFixed(1)}%</span>
                </span>
              </div>

              <h2 className="text-xl font-bold text-white mt-3">{verdict.headline}</h2>
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                {decision.narration}
              </p>
            </div>
          )}

          {/* Headroom Percentiles Grid */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs font-medium text-slate-400">P10 (Conservative)</span>
              <p className={`text-xl font-bold mt-1 ${
                (headroom?.p10_minor || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {formatINR(headroom?.p10_minor || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">90% confidence lower bound</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs font-medium text-slate-400">P50 (Median Expected)</span>
              <p className={`text-xl font-bold mt-1 ${
                (headroom?.p50_minor || 0) >= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {formatINR(headroom?.p50_minor || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Expected baseline headroom</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs font-medium text-slate-400">P90 (Optimistic)</span>
              <p className="text-xl font-bold text-emerald-400 mt-1">
                {formatINR(headroom?.p90_minor || 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Upper bound best case</p>
            </div>
          </div>

          {/* Reasoning Ledger (8-Step Mathematical Proof) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Reasoning Ledger (Mathematical Proof)
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                8 Verifiable Steps
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 font-medium">Step</th>
                    <th className="py-2 font-medium">Metric</th>
                    <th className="py-2 font-medium">Calculation / Basis</th>
                    <th className="py-2 font-medium text-right">Paise Value</th>
                    <th className="py-2 font-medium text-right">Rupees</th>
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-white text-base">What-If Scenarios: Compare Options Side-by-Side</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate cash vs EMI vs waiting 2 months without mutating your active financial ledger.
            </p>
          </div>
          <button
            onClick={runWhatIfScenarios}
            disabled={simulatingWhatIf}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-xl text-xs transition"
          >
            {simulatingWhatIf ? 'Simulating Overlays...' : 'Compare What-If Scenarios'}
          </button>
        </div>

        {whatIfResults && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            {whatIfResults.scenarios.map((sc: any, idx: number) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-white text-sm">{sc.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                    sc.verdict === 'AFFORDABLE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                    sc.verdict === 'TIGHT' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                    'bg-rose-950 text-rose-400 border border-rose-900'
                  }`}>
                    {sc.verdict}
                  </span>
                </div>
                <div className="text-xs space-y-1 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Projected Lowest Balance:</span>
                    <span className="font-mono text-white font-semibold">{formatINR(sc.lowest_balance_paise)}</span>
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
