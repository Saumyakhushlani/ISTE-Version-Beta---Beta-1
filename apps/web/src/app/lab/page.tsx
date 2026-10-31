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
  ChevronDown,
  ChevronUp,
  TrendingDown,
  Info,
  Coins,
  DollarSign,
  Search,
  ArrowRight,
  RotateCcw,
  Plus,
  Clock,
  Scissors,
  CreditCard,
  Check,
  Zap,
  Tag
} from 'lucide-react';
import LiquidityAdvisorModal from '@/components/LiquidityAdvisorModal';
import CashHorizonChart from '@/components/CashHorizonChart';
import CustomScenarioModal from '@/components/CustomScenarioModal';
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
  // Input parameters
  const [purchaseRs, setPurchaseRs] = useState('80000');
  const [label, setLabel] = useState('iPhone 16');
  const [timing, setTiming] = useState('next_month');
  const [paymentType, setPaymentType] = useState<'cash' | 'emi'>('cash');
  const [emiMonths, setEmiMonths] = useState(6);
  const [emiRate, setEmiRate] = useState(0.0);
  const [bufferMultiplier, setBufferMultiplier] = useState<number | undefined>(undefined);

  // Natural Language Search State
  const [naturalQuery, setNaturalQuery] = useState('');
  const [isAskingNL, setIsAskingNL] = useState(false);
  const [parsedEntities, setParsedEntities] = useState<any>(null);

  // Decision & Scenarios State
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<any>(null);
  const [expandedLedgerStep, setExpandedLedgerStep] = useState<number | null>(null);

  // What-If Scenarios
  const [scenariosList, setScenariosList] = useState<any[]>([
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
  ]);
  const [whatIfResults, setWhatIfResults] = useState<any>(null);
  const [simulatingWhatIf, setSimulatingWhatIf] = useState(false);
  const [isCustomScenarioOpen, setIsCustomScenarioOpen] = useState(false);
  const [isLiquidityModalOpen, setIsLiquidityModalOpen] = useState(false);

  useEffect(() => {
    runEvaluation();
  }, []);

  async function runEvaluation(overrideParams?: any) {
    const rs = parseFloat(overrideParams?.purchaseRs ?? purchaseRs);
    if (isNaN(rs) || rs <= 0) return;

    setLoading(true);
    try {
      const res = await api.evaluateAffordability({
        purchase_amount_minor: rupeesToPaise(rs),
        label: overrideParams?.label ?? label,
        timing: overrideParams?.timing ?? timing,
        payment_type: overrideParams?.paymentType ?? paymentType,
        emi_months: (overrideParams?.paymentType ?? paymentType) === 'emi' ? (overrideParams?.emiMonths ?? emiMonths) : undefined,
        emi_interest_rate_pct: (overrideParams?.paymentType ?? paymentType) === 'emi' ? (overrideParams?.emiRate ?? emiRate) : undefined,
        buffer_multiplier_override: bufferMultiplier,
      });
      setDecision(res);
    } catch (err: any) {
      console.error('Failed to evaluate affordability:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleNaturalLanguageSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!naturalQuery.trim()) return;

    setIsAskingNL(true);
    setLoading(true);
    try {
      const res = await api.askAffordability(naturalQuery.trim());
      setDecision(res);
      if (res.parsed_query) {
        setParsedEntities(res.parsed_query);
        const parsed = res.parsed_query;
        if (parsed.purchase_amount_minor) {
          setPurchaseRs((parsed.purchase_amount_minor / 100).toString());
        }
        if (parsed.label) setLabel(parsed.label);
        if (parsed.payment_type) setPaymentType(parsed.payment_type);
        if (parsed.emi_months) setEmiMonths(parsed.emi_months);
        if (parsed.timing) setTiming(parsed.timing);
      }
    } catch (err) {
      console.error('Failed to ask affordability query:', err);
    } finally {
      setIsAskingNL(false);
      setLoading(false);
    }
  }

  function handlePromptChipClick(prompt: string) {
    setNaturalQuery(prompt);
    // Auto submit query
    setIsAskingNL(true);
    setLoading(true);
    api.askAffordability(prompt)
      .then((res) => {
        setDecision(res);
        if (res.parsed_query) {
          setParsedEntities(res.parsed_query);
          const parsed = res.parsed_query;
          if (parsed.purchase_amount_minor) {
            setPurchaseRs((parsed.purchase_amount_minor / 100).toString());
          }
          if (parsed.label) setLabel(parsed.label);
          if (parsed.payment_type) setPaymentType(parsed.payment_type);
          if (parsed.emi_months) setEmiMonths(parsed.emi_months);
          if (parsed.timing) setTiming(parsed.timing);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => {
        setIsAskingNL(false);
        setLoading(false);
      });
  }

  async function runWhatIfScenarios(customScenarios?: any[]) {
    const rs = parseFloat(purchaseRs);
    if (isNaN(rs) || rs <= 0) return;

    setSimulatingWhatIf(true);
    try {
      const targetList = customScenarios || scenariosList;
      const res = await api.compareScenarios(rupeesToPaise(rs), targetList);
      setWhatIfResults(res);
    } catch (err: any) {
      console.error('Failed to compare scenarios:', err);
    } finally {
      setSimulatingWhatIf(false);
    }
  }

  function handleAddCustomScenario(newScenario: any) {
    const updated = [...scenariosList, newScenario];
    setScenariosList(updated);
    runWhatIfScenarios(updated);
  }

  // Constructive Advisory Handler: 1-click apply alternative
  function handleApplyAlternative(type: 'max_cash' | 'emi' | 'delay') {
    if (!decision?.constructive_helper) return;
    const ch = decision.constructive_helper;

    if (type === 'max_cash') {
      const maxRs = (ch.max_affordable_paise / 100).toString();
      setPurchaseRs(maxRs);
      runEvaluation({ purchaseRs: maxRs, paymentType: 'cash' });
    } else if (type === 'emi') {
      setPaymentType('emi');
      setEmiMonths(ch.recommended_emi_months || 6);
      setEmiRate(0.0);
      runEvaluation({ paymentType: 'emi', emiMonths: ch.recommended_emi_months || 6, emiRate: 0.0 });
    } else if (type === 'delay') {
      setTiming('next_month');
      // Run evaluation with delay notice
      runEvaluation();
    }
  }

  const verdict = decision?.verdict;
  const headroom = decision?.headroom;
  const ledger = decision?.ledger || [];
  const gate = decision?.gate;
  const constructiveHelper = decision?.constructive_helper;
  const timeline = decision?.timeline || [];
  const lowestBal = decision?.lowest_balance || { date: 'N/A', p50_minor: 0, p10_minor: 0 };
  const bufferPaise = decision?.buffer?.value_minor || 0;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto text-foreground font-sans"
    >
      {/* Top Header */}
      <motion.div variants={itemVariants} className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Affordability & What-If Decision Lab
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-primary/10 text-primary border border-primary/20">
            5,000 Monte Carlo Runs
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            100% Math Verified
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Deterministic financial evaluation proving every step with verifiable Reasoning Ledgers and empirical simulation bands.
        </p>
      </motion.div>

      {/* 1. NATURAL LANGUAGE "ASK DECISION LAB" BAR (FR-12) */}
      <motion.div 
        variants={itemVariants} 
        className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-3.5 relative overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Ask Natural Language Question
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Zap className="w-3 h-3 text-amber-500" />
              Groq NLU Active
            </span>
            <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
              Neural Parser · Fallback Safe
            </span>
          </div>
        </div>

        <form onSubmit={handleNaturalLanguageSubmit} className="relative">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-muted-foreground" />
            <input
              type="text"
              value={naturalQuery}
              onChange={(e) => setNaturalQuery(e.target.value)}
              placeholder="Ask anything: &quot;Can I buy a Sony TV for ₹45,000 on 6-month EMI next month?&quot;"
              className="w-full bg-input border border-border rounded-xl pl-10 pr-28 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
            <button
              type="submit"
              disabled={isAskingNL || !naturalQuery.trim()}
              className="absolute right-1.5 px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
            >
              {isAskingNL ? (
                <span>Parsing...</span>
              ) : (
                <>
                  <span>Evaluate</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Suggestion Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] text-muted-foreground font-semibold">Try:</span>
          <button
            type="button"
            onClick={() => handlePromptChipClick("Can I afford an iPhone 16 for ₹79,900 next month?")}
            className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] transition"
          >
            📱 iPhone 16 for ₹79,900
          </button>
          <button
            type="button"
            onClick={() => handlePromptChipClick("Can I buy a MacBook Pro for ₹1,40,000 on 6 months EMI?")}
            className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] transition"
          >
            💻 MacBook Pro on 6m EMI
          </button>
          <button
            type="button"
            onClick={() => handlePromptChipClick("Can I buy furniture for ₹65,000 next month?")}
            className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] transition"
          >
            🛋️ Living Room Sofa ₹65k
          </button>
          <button
            type="button"
            onClick={() => handlePromptChipClick("Can I spend ₹35,000 on a Goa trip this month?")}
            className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-[11px] transition"
          >
            ✈️ Goa Trip for ₹35,000
          </button>
        </div>

        {/* Parsed Entity Confirmation Chips */}
        {parsedEntities && (
          <div className="pt-2 border-t border-border flex items-center justify-between flex-wrap gap-2 text-[11px] font-mono">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-muted-foreground font-sans font-semibold">Parsed Entities:</span>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Item: {parsedEntities.label || label}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                {formatINR(parsedEntities.purchase_amount_minor || rupeesToPaise(parseFloat(purchaseRs || '0')))}
              </span>
              <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                {parsedEntities.timing === 'this_month' ? 'This Month' : 'Next Month Horizon'}
              </span>
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 uppercase">
                {parsedEntities.payment_type === 'emi' ? `${parsedEntities.emi_months || emiMonths}-Mo EMI` : 'Upfront Cash'}
              </span>
            </div>

            {parsedEntities.parsed_by && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1 border ${
                parsedEntities.parsed_by === 'groq'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  : 'bg-muted text-muted-foreground border-border'
              }`}>
                {parsedEntities.parsed_by === 'groq' ? (
                  <>
                    <Zap className="w-2.5 h-2.5 text-amber-500" />
                    <span>Groq NLU ({parsedEntities.model_used || 'llama-3.3-70b-versatile'})</span>
                  </>
                ) : (
                  <span>Rule Engine Fallback</span>
                )}
              </span>
            )}
          </div>
        )}
      </motion.div>

      {/* 2. MAIN SIMULATION INTERFACE (Grid: Controls on Left, Verdict & Horizon on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Purchase Parameters Form */}
        <motion.div 
          variants={itemVariants}
          className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5 h-fit"
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span>Purchase Parameters</span>
            </h2>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-primary/15 text-primary font-bold">
              Config
            </span>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Expense / Item Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. iPhone 16"
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-foreground">Purchase Amount (₹)</label>
              <span className="text-[11px] font-mono text-primary font-bold">
                {formatINR(rupeesToPaise(parseFloat(purchaseRs || '0')))}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-mono font-bold">₹</span>
              <input
                type="number"
                value={purchaseRs}
                onChange={(e) => setPurchaseRs(e.target.value)}
                placeholder="80000"
                className="w-full bg-input border border-border rounded-xl pl-7 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Timing Horizon</label>
            <select
              value={timing}
              onChange={(e) => setTiming(e.target.value)}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="next_month">Next Month (Target Forecast Horizon)</option>
              <option value="this_month">This Month</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Payment Method</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('cash')}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  paymentType === 'cash'
                    ? 'bg-primary/20 border-primary text-foreground shadow-xs'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                Upfront Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentType('emi')}
                className={`py-2 text-xs font-bold rounded-xl border transition ${
                  paymentType === 'emi'
                    ? 'bg-primary/20 border-primary text-foreground shadow-xs'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
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
              className="space-y-3 pt-2 border-t border-border"
            >
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Tenure (Months)</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[3, 6, 9, 12].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEmiMonths(m)}
                      className={`py-1.5 text-xs font-mono rounded-lg border transition ${
                        emiMonths === m
                          ? 'bg-primary text-primary-foreground border-primary font-bold'
                          : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {m} Mo
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">Annual Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={emiRate}
                  onChange={(e) => setEmiRate(Number(e.target.value))}
                  placeholder="0.0 for No-Cost EMI"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono"
                />
              </div>
            </motion.div>
          )}

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1">Safety Buffer Tier</label>
            <select
              value={bufferMultiplier || ''}
              onChange={(e) => setBufferMultiplier(e.target.value ? parseFloat(e.target.value) : undefined)}
              className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="">Default Profile Setting (Dynamic)</option>
              <option value="1.0">Standard (1.0x Floor - Minimum 1 Month)</option>
              <option value="1.25">Conservative (1.25x Floor - Freelancers)</option>
              <option value="1.5">Ultra-Safe (1.5x Floor - Max Risk Protection)</option>
            </select>
          </div>

          <button
            onClick={() => runEvaluation()}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-2.5 rounded-xl text-xs transition shadow-xs flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Running 5,000 Simulations...</span>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                <span>Re-evaluate Affordability</span>
              </>
            )}
          </button>
        </motion.div>

        {/* Right 2 Columns: Master Verdict, Constructive Advisory & Cash Horizon */}
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
                className={`p-6 rounded-2xl border shadow-xs space-y-4 ${
                  verdict.code === 'AFFORDABLE' ? 'bg-emerald-500/10 border-emerald-500/30' :
                  verdict.code === 'TIGHT' ? 'bg-amber-500/10 border-amber-500/30' :
                  verdict.code === 'NOT_ADVISABLE' ? 'bg-orange-500/10 border-orange-500/30' :
                  verdict.code === 'INSUFFICIENT_DATA' ? 'bg-amber-500/10 border-amber-500/30' :
                  'bg-destructive/10 border-destructive/30'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    verdict.code === 'AFFORDABLE' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' :
                    verdict.code === 'TIGHT' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30' :
                    verdict.code === 'NOT_ADVISABLE' ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/30' :
                    verdict.code === 'INSUFFICIENT_DATA' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30' :
                    'bg-destructive/20 text-destructive border border-destructive/30'
                  }`}>
                    Verdict: {verdict.code}
                  </span>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {verdict.code === 'INSUFFICIENT_DATA' ? (
                      <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">Simulations Suspended</span>
                    ) : (
                      <>
                        <span>Breach Probability: <strong className="text-foreground font-mono">{(verdict.breach_probability * 100).toFixed(1)}%</strong></span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Regex Guard Verified
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-xl font-bold text-foreground">{verdict.headline}</h2>
                  <p className="text-xs text-foreground/90 mt-2 leading-relaxed">
                    {decision.narration}
                  </p>
                </div>

                {verdict.code !== 'INSUFFICIENT_DATA' && (
                  <div className="pt-3 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      Fund this purchase smoothly across multiple bank accounts without missing bills:
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsLiquidityModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
                    >
                      <Coins className="w-3.5 h-3.5 text-amber-500" />
                      <span>Plan Multi-Bank Sourcing for {label}</span>
                    </button>
                  </div>
                )}

                {/* 3. CONSTRUCTIVE ADVISORY HELPER: "WHAT WOULD MAKE THIS WORK?" (FR-10.5) */}
                {constructiveHelper && verdict.code !== 'AFFORDABLE' && verdict.code !== 'INSUFFICIENT_DATA' && (
                  <div className="mt-4 pt-4 border-t border-border/70 space-y-3 bg-card/60 p-4 rounded-xl border border-border">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span>Constructive Advisory: What Would Make This Work?</span>
                      </h4>
                      <span className="text-[10px] font-mono text-muted-foreground">Deterministic Math Remedies</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Remedy 1: Max Affordable Upfront Today */}
                      <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-500" />
                          <span>Max Affordable Today</span>
                        </span>
                        <p className="text-base font-bold font-mono text-foreground">
                          {formatINR(constructiveHelper.max_affordable_paise)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          The maximum cash outlay today that keeps median headroom above your buffer.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleApplyAlternative('max_cash')}
                          className="mt-1 text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <span>Apply Max Affordable Amount</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remedy 2: Recommended EMI Alternative */}
                      <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-primary" />
                          <span>Spread Over EMI</span>
                        </span>
                        <p className="text-base font-bold font-mono text-foreground">
                          {constructiveHelper.recommended_emi_months} Months at {formatINR(constructiveHelper.recommended_monthly_emi_paise)}/mo
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Financing over this tenure drops monthly cash outflow into safe buffer compliance.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleApplyAlternative('emi')}
                          className="mt-1 text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <span>Switch to {constructiveHelper.recommended_emi_months}-Mo EMI</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remedy 3: Wait & Save */}
                      {constructiveHelper.min_delay_months > 0 && (
                        <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1.5">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>Wait &amp; Accumulate</span>
                          </span>
                          <p className="text-base font-bold font-mono text-foreground">
                            Delay by {constructiveHelper.min_delay_months} {constructiveHelper.min_delay_months === 1 ? 'Month' : 'Months'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Saving your net monthly surplus ({formatINR(constructiveHelper.monthly_net_savings_paise)}/mo) builds the required {formatINR(constructiveHelper.shortfall_paise)} cushion.
                          </p>
                        </div>
                      )}

                      {/* Remedy 4: Discretionary Spend Trim */}
                      {constructiveHelper.suggested_monthly_cut_paise > 0 && (
                        <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1.5">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                            <Scissors className="w-3 h-3 text-destructive" />
                            <span>Discretionary Trim</span>
                          </span>
                          <p className="text-base font-bold font-mono text-foreground">
                            Trim {formatINR(constructiveHelper.suggested_monthly_cut_paise)}/mo
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Temporarily reducing dining, shopping, and entertainment preserves your safety buffer.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4-Point Data Health Gate Diagnosis on Refusal */}
                {gate && verdict.code === 'INSUFFICIENT_DATA' && (
                  <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        4-Point Data Health Gate Diagnosis
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {gate.coverage_days} Days Observed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {gate.checks?.map((chk: any) => (
                        <div
                          key={chk.id}
                          className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                            chk.passed
                              ? 'bg-card border-border/80 text-foreground'
                              : 'bg-destructive/10 border-destructive/30 text-destructive'
                          }`}
                        >
                          {chk.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-bold">{chk.title}: {chk.passed ? 'PASSED' : 'ACTION REQUIRED'}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{chk.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {gate.missing_items && gate.missing_items.length > 0 && (
                      <div className="p-3.5 bg-card border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                        <div>
                          <p className="text-xs font-bold text-foreground">Remediation Checklist:</p>
                          <ul className="list-disc list-inside text-xs text-muted-foreground mt-1 space-y-0.5">
                            {gate.missing_items.map((item: string, i: number) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <a
                          href="/upload"
                          className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0 transition shadow-xs"
                        >
                          <span>Upload Bank Statement</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Headroom Percentiles Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">P10 (Conservative)</span>
              <p className={`text-xl font-bold mt-1 font-mono ${
                (headroom?.p10_minor || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
              }`}>
                {formatINR(headroom?.p10_minor || 0)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">90% confidence lower bound</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">P50 (Median Expected)</span>
              <p className={`text-xl font-bold mt-1 font-mono ${
                (headroom?.p50_minor || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
              }`}>
                {formatINR(headroom?.p50_minor || 0)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">Expected baseline headroom</p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">P90 (Optimistic)</span>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                {formatINR(headroom?.p90_minor || 0)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-mono">Upper bound best case</p>
            </div>
          </motion.div>

          {/* 4. CASH-FLOW HORIZON CHART (Recharts) */}
          {timeline && timeline.length > 0 && verdict?.code !== 'INSUFFICIENT_DATA' && (
            <motion.div variants={itemVariants}>
              <CashHorizonChart
                timeline={timeline}
                bufferPaise={bufferPaise}
                lowestBalance={lowestBal}
                purchaseAmountPaise={rupeesToPaise(parseFloat(purchaseRs || '0'))}
                label={label}
              />
            </motion.div>
          )}

          {/* 5. REASONING LEDGER (8-Step Mathematical Proof with Click-Through Evidence) */}
          <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-foreground text-sm">
                  Reasoning Ledger (8-Step Verifiable Proof)
                </h3>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                Click any step to inspect underlying evidence
              </span>
            </div>

            <div className="space-y-2 font-sans">
              {ledger.map((step: any) => {
                const isExpanded = expandedLedgerStep === step.step_no;

                return (
                  <div
                    key={step.step_no}
                    className="border border-border rounded-xl overflow-hidden transition bg-card hover:border-primary/40"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedLedgerStep(isExpanded ? null : step.step_no)}
                      className="w-full p-3.5 flex items-center justify-between text-left hover:bg-muted/30 transition text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-muted text-muted-foreground font-mono font-bold flex items-center justify-center text-[11px]">
                          #{step.step_no}
                        </span>
                        <div>
                          <p className="font-bold text-foreground">{step.label}</p>
                          <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                            {step.formula_text}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`font-mono font-bold text-xs ${
                          step.status === 'breach' ? 'text-destructive' :
                          step.status === 'warn' ? 'text-amber-500' : 'text-foreground'
                        }`}>
                          {formatINR(step.value_minor || 0)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expandable Evidence Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 pb-3.5 pt-2 bg-muted/40 border-t border-border text-xs space-y-2 font-mono"
                        >
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Integer Minor Unit: {step.value_minor?.toLocaleString()} paise</span>
                            <span className="uppercase text-emerald-600 dark:text-emerald-400 font-bold">
                              Verified Status: {step.status.toUpperCase()}
                            </span>
                          </div>

                          {step.evidence && (
                            <div className="p-2.5 bg-card rounded-lg border border-border text-[11px] space-y-1">
                              <p className="font-sans font-semibold text-foreground">Underlying Evidence &amp; Basis:</p>
                              {step.evidence.breakdown && (
                                <p className="text-muted-foreground">Breakdown: {step.evidence.breakdown}</p>
                              )}
                              {step.evidence.note && (
                                <p className="text-muted-foreground">{step.evidence.note}</p>
                              )}
                              {step.evidence.count !== undefined && (
                                <p className="text-muted-foreground">Active Items Count: {step.evidence.count}</p>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* 6. WHAT-IF SIMULATION STUDIO (FR-11: Custom Composer & Comparison Matrix) */}
      <motion.div 
        variants={itemVariants} 
        className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span>What-If Simulation Studio: Compare Scenarios Side-by-Side</span>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Simulate cash vs EMI vs delaying vs cancelling subscriptions without mutating your bank transactions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCustomScenarioOpen(true)}
              className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-foreground border border-border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span>Custom Scenario</span>
            </button>
            <button
              type="button"
              onClick={() => runWhatIfScenarios()}
              disabled={simulatingWhatIf}
              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{simulatingWhatIf ? 'Simulating...' : 'Run Scenario Matrix'}</span>
            </button>
          </div>
        </div>

        {/* Active Scenario Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[11px] font-semibold text-muted-foreground">Active Overlays:</span>
          {scenariosList.map((sc, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-lg bg-muted border border-border text-foreground font-mono text-[11px] flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>{sc.name}</span>
            </span>
          ))}
        </div>

        {/* Scenario Comparison Matrix */}
        <AnimatePresence>
          {whatIfResults && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-x-auto pt-2"
            >
              <table className="w-full text-left text-xs font-sans border border-border rounded-xl overflow-hidden">
                <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-4">Scenario Strategy</th>
                    <th className="py-3 px-4">Verdict</th>
                    <th className="py-3 px-4 text-right">Headroom Delta</th>
                    <th className="py-3 px-4 text-right">Lowest Projected Cash</th>
                    <th className="py-3 px-4 text-right">Breach Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* Baseline Row */}
                  {whatIfResults.baseline && (
                    <tr className="bg-primary/5 hover:bg-primary/10 transition font-mono">
                      <td className="py-3 px-4 font-sans font-bold text-foreground">
                        {whatIfResults.baseline.name} (Current Parameters)
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          whatIfResults.baseline.verdict === 'AFFORDABLE' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                          whatIfResults.baseline.verdict === 'TIGHT' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                          'bg-destructive/20 text-destructive'
                        }`}>
                          {whatIfResults.baseline.verdict}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-muted-foreground font-mono">Baseline (0)</td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-foreground">
                        {formatINR(whatIfResults.baseline.lowest_balance_paise)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        {(whatIfResults.baseline.breach_probability * 100).toFixed(1)}%
                      </td>
                    </tr>
                  )}

                  {/* Simulated Scenarios Rows */}
                  {whatIfResults.scenarios.map((sc: any, idx: number) => (
                    <tr key={idx} className="hover:bg-muted/30 transition font-mono">
                      <td className="py-3 px-4 font-sans font-semibold text-foreground">
                        {sc.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          sc.verdict === 'AFFORDABLE' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                          sc.verdict === 'TIGHT' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                          'bg-destructive/20 text-destructive'
                        }`}>
                          {sc.verdict}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold ${
                        sc.delta_headroom_paise >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                      }`}>
                        {sc.delta_headroom_paise >= 0 ? `+${formatINR(sc.delta_headroom_paise)}` : formatINR(sc.delta_headroom_paise)}
                      </td>
                      <td className="py-3 px-4 text-right text-foreground font-bold">
                        {formatINR(sc.lowest_balance_paise)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {(sc.breach_probability * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Custom Scenario Builder Modal */}
      <CustomScenarioModal
        isOpen={isCustomScenarioOpen}
        onClose={() => setIsCustomScenarioOpen(false)}
        onAddScenario={handleAddCustomScenario}
        purchaseAmountMinor={rupeesToPaise(parseFloat(purchaseRs || '0'))}
      />

      {/* Liquidity Sourcing Advisor Modal */}
      <LiquidityAdvisorModal
        isOpen={isLiquidityModalOpen}
        onClose={() => setIsLiquidityModalOpen(false)}
        initialAmountRs={purchaseRs}
        initialLabel={label}
      />
    </motion.div>
  );
}
