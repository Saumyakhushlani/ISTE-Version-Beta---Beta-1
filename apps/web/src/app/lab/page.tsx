'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-8 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Affordability & What-If Decision Lab</h1>
        <p className="text-sm text-slate-500 mt-1">
          Mathematically verified decisions with 5,000 Monte Carlo runs and step-by-step Reasoning Ledgers.
        </p>
      </motion.div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Purchase Parameters Form */}
        <motion.div 
          variants={itemVariants}
          className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-5 h-fit"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              Purchase Parameters
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">Input</span>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Item / Expense Name</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-inner"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Purchase Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-slate-400 text-sm font-medium">₹</span>
              <input
                type="number"
                value={purchaseRs}
                onChange={(e) => setPurchaseRs(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 shadow-inner font-mono font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Timing</label>
            <select
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="next_month">Next Month (Target Forecast Horizon)</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setPaymentType('cash')}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  paymentType === 'cash'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                Upfront Cash
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setPaymentType('emi')}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  paymentType === 'emi'
                    ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                EMI Financing
              </motion.button>
            </div>
          </div>

          {paymentType === 'emi' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-3 pt-2 border-t border-slate-100"
            >
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Tenure (Months)</label>
                <select
                  value={emiMonths}
                  onChange={(e) => setEmiMonths(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value={3}>3 Months</option>
                  <option value={6}>6 Months</option>
                  <option value={9}>9 Months</option>
                  <option value={12}>12 Months</option>
                  <option value={24}>24 Months</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5">Annual Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={emiRate}
                  onChange={(e) => setEmiRate(Number(e.target.value))}
                  placeholder="0.0 for No-Cost EMI"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={runEvaluation}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition shadow-sm"
          >
            {loading ? 'Running 5,000 Simulations...' : 'Re-evaluate Affordability'}
          </motion.button>
        </motion.div>

        {/* Right 2 Columns: Verdict Banner & Headroom & Reasoning Ledger */}
        <div className="lg:col-span-2 space-y-6">
          {/* Master Verdict Card */}
          <AnimatePresence mode="wait">
            {verdict && (
              <motion.div 
                key={verdict.code}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className={`p-6 rounded-2xl border shadow-sm ${
                  verdict.code === 'AFFORDABLE' ? 'bg-emerald-50/70 border-emerald-200 text-slate-900' :
                  verdict.code === 'TIGHT' ? 'bg-amber-50/70 border-amber-200 text-slate-900' :
                  verdict.code === 'NOT_ADVISABLE' ? 'bg-orange-50/70 border-orange-200 text-slate-900' :
                  verdict.code === 'INSUFFICIENT_DATA' ? 'bg-slate-100 border-slate-200 text-slate-900' :
                  'bg-rose-50/70 border-rose-200 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    verdict.code === 'AFFORDABLE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                    verdict.code === 'TIGHT' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    verdict.code === 'NOT_ADVISABLE' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                    'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}>
                    Verdict: {verdict.code}
                  </span>

                  <span className="text-xs text-slate-500">
                    Breach Probability: <span className="font-bold text-slate-800">{(verdict.breach_probability * 100).toFixed(1)}%</span>
                  </span>
                </div>

                <h2 className="text-xl font-extrabold text-slate-900 mt-3">{verdict.headline}</h2>
                <p className="text-sm text-slate-700 mt-2 leading-relaxed font-normal">
                  {decision.narration}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Headroom Percentiles Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div 
              whileHover={{ y: -2 }} 
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm"
            >
              <span className="text-xs font-semibold text-slate-500">P10 (Conservative)</span>
              <p className={`text-xl font-bold mt-1 font-mono ${
                (headroom?.p10_minor || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {formatINR(headroom?.p10_minor || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">90% confidence lower bound</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -2 }} 
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm"
            >
              <span className="text-xs font-semibold text-slate-500">P50 (Median Expected)</span>
              <p className={`text-xl font-bold mt-1 font-mono ${
                (headroom?.p50_minor || 0) >= 0 ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                {formatINR(headroom?.p50_minor || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Expected baseline headroom</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -2 }} 
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm"
            >
              <span className="text-xs font-semibold text-slate-500">P90 (Optimistic)</span>
              <p className="text-xl font-bold text-emerald-600 mt-1 font-mono">
                {formatINR(headroom?.p90_minor || 0)}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Upper bound best case</p>
            </motion.div>
          </motion.div>

          {/* Reasoning Ledger (8-Step Mathematical Proof) */}
          <motion.div variants={itemVariants} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Reasoning Ledger (Mathematical Proof)
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-medium">
                8 Verifiable Steps
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-medium">
                    <th className="py-2.5 font-medium">Step</th>
                    <th className="py-2.5 font-medium">Metric</th>
                    <th className="py-2.5 font-medium">Calculation / Basis</th>
                    <th className="py-2.5 font-medium text-right">Paise Value</th>
                    <th className="py-2.5 font-medium text-right">Rupees</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {ledger.map((step: any) => (
                    <tr key={step.step_no} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 text-slate-400 font-bold">#{step.step_no}</td>
                      <td className="py-3 font-sans text-slate-800 font-semibold">{step.label}</td>
                      <td className="py-3 font-sans text-slate-500 text-xs">{step.formula_text}</td>
                      <td className="py-3 text-right text-slate-500">{step.value_minor?.toLocaleString()}</td>
                      <td className={`py-3 text-right font-bold ${
                        step.status === 'breach' ? 'text-rose-600' :
                        step.status === 'warn' ? 'text-amber-600' : 'text-slate-900'
                      }`}>
                        {formatINR(step.value_minor || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </div>

      {/* What-If Scenario Comparison Bar */}
      <motion.div variants={itemVariants} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">What-If Scenarios: Compare Options Side-by-Side</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulate cash vs EMI vs waiting 2 months without mutating your active financial ledger.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={runWhatIfScenarios}
            disabled={simulatingWhatIf}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-xs transition shadow-sm"
          >
            {simulatingWhatIf ? 'Simulating Overlays...' : 'Compare What-If Scenarios'}
          </motion.button>
        </div>

        <AnimatePresence>
          {whatIfResults && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100"
            >
              {whatIfResults.scenarios.map((sc: any, idx: number) => (
                <motion.div 
                  whileHover={{ y: -3 }}
                  key={idx} 
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-900 text-sm">{sc.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                      sc.verdict === 'AFFORDABLE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      sc.verdict === 'TIGHT' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {sc.verdict}
                    </span>
                  </div>
                  <div className="text-xs space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Projected Lowest Balance:</span>
                      <span className="font-mono text-slate-900 font-bold">{formatINR(sc.lowest_balance_paise)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Headroom Delta:</span>
                      <span className="font-mono text-emerald-600 font-bold">+{formatINR(sc.delta_headroom_paise)}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
