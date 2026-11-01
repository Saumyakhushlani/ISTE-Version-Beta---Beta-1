'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
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
  Tag,
  Send,
  Wallet,
  ExternalLink,
  ShoppingBag,
  Plane,
  Smartphone
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

interface PurchaseChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  itemLabel?: string;
  pricePaise?: number;
  isEstimatedPrice?: boolean;
  benchmarkSource?: string;
  needsPriceClarification?: boolean;
  suggestedPricesPaise?: number[];
  isOutOfScope?: boolean;
  optionCash?: {
    verdict_code: string;
    can_afford: boolean;
    verdict_text: string;
    purchase_paise: number;
    p10_headroom_paise: number;
    p50_headroom_paise: number;
    lowest_balance_paise: number;
    safety_buffer_paise: number;
    max_affordable_paise: number;
  };
  optionEmi?: {
    verdict_code: string;
    can_afford: boolean;
    recommended_tenure_months: number;
    monthly_emi_paise: number;
    annual_interest_pct: number;
    total_interest_paise: number;
    monthly_net_savings_paise: number;
    emi_6m_paise: number;
    emi_12m_paise: number;
    total_interest_12m_paise: number;
  };
}

const DEFAULT_PURCHASE_STARTERS = [
  '📱 Can I buy an iPhone 16 Pro?',
  '✈️ Can I spend on a Goa trip this month?',
  '🎮 Can I afford a PS5?',
  '💻 Can I buy a MacBook Air for ₹1,14,900?',
  '🛵 Can I buy an Electric Scooter?',
];

const QUICK_PURCHASE_PILLS = [
  { name: 'iPhone 16 Pro', query: 'Can I buy an iPhone 16 Pro?' },
  { name: 'Goa Vacation', query: 'Can I spend on a Goa trip this month?' },
  { name: 'Sony PS5', query: 'Can I buy a Sony PS5 console?' },
  { name: 'MacBook Air M3', query: 'Can I afford a MacBook Air M3?' },
  { name: 'Electric Scooter', query: 'Can I buy an electric scooter?' },
  { name: '55" 4K TV', query: 'Can I buy a 55-inch Smart TV?' },
];

function getFormattedTime(): string {
  const d = new Date();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

export default function DecisionLabPage() {
  // Input parameters
  const [purchaseRs, setPurchaseRs] = useState('80000');
  const [label, setLabel] = useState('iPhone 16');
  const [timing, setTiming] = useState('next_month');
  const [paymentType, setPaymentType] = useState<'cash' | 'emi'>('cash');
  const [emiMonths, setEmiMonths] = useState(6);
  const [emiRate, setEmiRate] = useState(0.0);
  const [bufferMultiplier, setBufferMultiplier] = useState<number | undefined>(undefined);

  // Conversational Purchase Advisor State
  const [chatMessages, setChatMessages] = useState<PurchaseChatMessage[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      content:
        "Hello! I am your **Financial Decision Advisor**.\n\nAsk me anything about a purchase, travel plan, or expense (e.g. *\"Can I buy an iPhone 16 Pro?\"*, *\"Can I spend on a Goa trip this month?\"*, or *\"Can I afford a MacBook Air?\"*).\n\nIf you don't mention a price, I will automatically look up the average market benchmark for you. I will evaluate **both** your options: **Option 1 (One-Time Upfront)** and **Option 2 (Monthly EMI)** against your verified bank accounts!",
      timestamp: 'Just now',
      modelUsed: 'Google Gemini 3.5 Flash',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isSendingChat]);

  async function handleSendPurchaseChat(textToSend?: string) {
    const q = (textToSend || chatInput).trim();
    if (!q || isSendingChat) return;

    const userMsg: PurchaseChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: getFormattedTime(),
    };

    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setChatInput('');
    setIsSendingChat(true);

    try {
      const historyPayload = nextMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.sendPurchaseAdvisorChat(q, historyPayload);

      const assistantMsg: PurchaseChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: res.reply || 'No response generated.',
        timestamp: getFormattedTime(),
        modelUsed: res.is_out_of_scope ? undefined : 'Google Gemini (gemini-3.5-flash)',
        itemLabel: res.item_label,
        pricePaise: res.price_paise,
        isEstimatedPrice: res.is_estimated_price,
        benchmarkSource: res.benchmark_source,
        needsPriceClarification: res.needs_price_clarification,
        suggestedPricesPaise: res.suggested_prices_paise,
        isOutOfScope: res.is_out_of_scope,
        optionCash: res.option_cash,
        optionEmi: res.option_emi,
      };

      setChatMessages((prev) => [...prev, assistantMsg]);

      // If price was identified, prefill the simulation sliders below
      if (res.price_paise && res.price_paise > 0) {
        const rs = (res.price_paise / 100).toString();
        setPurchaseRs(rs);
        if (res.item_label) setLabel(res.item_label);
      }
    } catch (err: any) {
      console.error('Purchase chat query error:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'I encountered an error connecting to the purchase advisor. Please try again.',
          timestamp: getFormattedTime(),
        },
      ]);
    } finally {
      setIsSendingChat(false);
    }
  }

  function handleResetPurchaseChat() {
    setChatMessages([
      {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content:
          "Hello! I am your **Financial Decision Advisor**.\n\nAsk me anything about a purchase, travel plan, or expense (e.g. *\"Can I buy an iPhone 16 Pro?\"*, *\"Can I spend on a Goa trip this month?\"*, or *\"Can I afford a MacBook Air?\"*).\n\nIf you don't mention a price, I will automatically look up the average market benchmark for you. I will evaluate **both** your options: **Option 1 (One-Time Upfront)** and **Option 2 (Monthly EMI)** against your verified bank accounts!",
        timestamp: 'Just now',
        modelUsed: 'Google Gemini 3.5 Flash',
      },
    ]);
  }

  function handleSyncToLab(msg: PurchaseChatMessage) {
    if (!msg.pricePaise) return;
    const rs = (msg.pricePaise / 100).toString();
    setPurchaseRs(rs);
    if (msg.itemLabel) setLabel(msg.itemLabel);
    runEvaluation({
      purchaseRs: rs,
      label: msg.itemLabel || label,
      paymentType: 'cash',
    });
    const el = document.getElementById('simulation-controls');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
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

      {/* 1. CONVERSATIONAL PURCHASE AFFORDABILITY ADVISOR (Borderless, Dual Option Cash vs EMI) */}
      <motion.div variants={itemVariants} className="space-y-3 w-full">
        {/* Header Bar */}
        <div className="py-2 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Purchase Affordability Advisor</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                  Google Gemini 3.5 Flash
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 hidden sm:inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Dual Cash vs EMI Math
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Ask about any purchase, trip, or gadget · Evaluates Upfront Cash & Monthly EMI against your verified cash flow
              </div>
            </div>
          </div>

          <button
            onClick={handleResetPurchaseChat}
            title="Reset Conversation"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Starter Question Chips */}
        <div className="py-2 border-b border-border/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Try asking:
          </span>
          {DEFAULT_PURCHASE_STARTERS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPurchaseChat(q)}
              disabled={isSendingChat}
              className="text-xs px-3 py-1.5 rounded-full bg-card hover:bg-muted border border-border hover:border-emerald-500/50 text-foreground transition shrink-0 whitespace-nowrap cursor-pointer shadow-2xs font-medium"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Messages Thread */}
        <div ref={chatScrollRef} className="h-[460px] overflow-y-auto py-3 px-1 space-y-4">
          {chatMessages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] md:max-w-[82%] rounded-2xl px-4 py-3 text-xs md:text-sm leading-relaxed shadow-xs ${
                  m.role === 'user'
                    ? 'bg-emerald-600 dark:bg-emerald-600 text-white rounded-br-xs font-medium'
                    : 'bg-muted/40 dark:bg-[#111111] border border-border/70 dark:border-neutral-800 text-foreground rounded-bl-xs'
                }`}
              >
                {/* Assistant Message Header */}
                {m.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-border/50 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> FDL Advisor
                    </span>
                    {m.modelUsed && <span>· {m.modelUsed}</span>}
                  </div>
                )}

                {/* Benchmark Pill */}
                {m.isEstimatedPrice && m.pricePaise && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[11px] font-medium mb-2.5">
                    <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>
                      Estimated Average Market Price: <strong>{formatINR(m.pricePaise)}</strong> {m.benchmarkSource ? `(${m.benchmarkSource})` : ''}
                    </span>
                  </div>
                )}

                {/* Formatted Content */}
                {m.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <div className="space-y-2 text-xs md:text-sm leading-relaxed">
                    <ReactMarkdown
                      components={{
                        h1: ({ ...props }) => (
                          <h1 className="text-base font-bold text-foreground mt-2 mb-1" {...props} />
                        ),
                        h2: ({ ...props }) => (
                          <h2 className="text-sm font-bold text-foreground mt-2 mb-1" {...props} />
                        ),
                        h3: ({ ...props }) => (
                          <h3 className="text-xs md:text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2 mb-1 flex items-center gap-1.5" {...props} />
                        ),
                        p: ({ ...props }) => (
                          <p className="mb-2 leading-relaxed last:mb-0" {...props} />
                        ),
                        ul: ({ ...props }) => (
                          <ul className="list-disc pl-4 space-y-1.5 my-2" {...props} />
                        ),
                        ol: ({ ...props }) => (
                          <ol className="list-decimal pl-4 space-y-1.5 my-2" {...props} />
                        ),
                        li: ({ ...props }) => (
                          <li className="leading-relaxed" {...props} />
                        ),
                        strong: ({ ...props }) => (
                          <strong className="font-bold text-foreground" {...props} />
                        ),
                        code: ({ ...props }) => (
                          <code className="bg-background/80 border border-border px-1.5 py-0.5 rounded text-[11px] font-mono text-emerald-600 dark:text-emerald-400" {...props} />
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>

                    {/* Dual Option Comparison Cards */}
                    {m.optionCash && m.optionEmi && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 mt-3 border-t border-border/50">
                        {/* Option 1: Cash Outflow */}
                        <div className={`p-3.5 rounded-xl border ${m.optionCash.can_afford ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-rose-500/5 border-rose-500/30'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                              <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              Option 1: Upfront (Cash)
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.optionCash.can_afford ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-500'}`}>
                              {m.optionCash.can_afford ? 'YES · AFFORDABLE' : 'NO · TIGHT'}
                            </span>
                          </div>
                          <div className="space-y-1 text-[11px] text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Full Outflow:</span>
                              <span className="font-semibold text-foreground">{formatINR(m.optionCash.purchase_paise)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Conservative Headroom:</span>
                              <span className={`font-semibold ${m.optionCash.p10_headroom_paise >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                {formatINR(m.optionCash.p10_headroom_paise)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Safety Buffer:</span>
                              <span className="font-semibold text-foreground">{formatINR(m.optionCash.safety_buffer_paise)} Preserved</span>
                            </div>
                          </div>
                        </div>

                        {/* Option 2: EMI Installments */}
                        <div className={`p-3.5 rounded-xl border ${m.optionEmi.can_afford ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-amber-500/5 border-amber-500/30'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-primary" />
                              Option 2: Monthly EMI
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${m.optionEmi.can_afford ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/20 text-amber-500'}`}>
                              {m.optionEmi.can_afford ? 'YES · SAFE ON EMI' : 'NO · STRETCH'}
                            </span>
                          </div>
                          <div className="space-y-1 text-[11px] text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Monthly Installment:</span>
                              <span className="font-semibold text-foreground">{formatINR(m.optionEmi.monthly_emi_paise)} / mo</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Tenure & Interest:</span>
                              <span className="font-semibold text-foreground">
                                {m.optionEmi.recommended_tenure_months} Mo @ {m.optionEmi.annual_interest_pct}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Interest:</span>
                              <span className="font-semibold text-foreground">{formatINR(m.optionEmi.total_interest_paise)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sync to Lab Below */}
                    {m.optionCash && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSyncToLab(m)}
                          className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Simulate with 5,000 Monte Carlo Runs Below</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Ambiguous Price Chips */}
                    {m.needsPriceClarification && m.suggestedPricesPaise && (
                      <div className="pt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-muted-foreground">Quick select budget:</span>
                        {m.suggestedPricesPaise.map((p, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSendPurchaseChat(`Evaluate ${m.itemLabel || 'purchase'} for ${formatINR(p)}`)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition cursor-pointer font-medium"
                          >
                            {formatINR(p)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <span suppressHydrationWarning className="text-[10px] text-muted-foreground/70 mt-1 px-1">
                {m.timestamp}
              </span>
            </div>
          ))}

          {/* Loading Indicator */}
          {isSendingChat && (
            <div className="flex items-start gap-2">
              <div className="rounded-2xl px-4 py-3 bg-muted/40 dark:bg-[#111111] border border-border/70 dark:border-neutral-800 text-muted-foreground text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-75" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-150" />
                <span className="ml-1 text-xs">Evaluating price benchmarks & dual cash-flow options...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Category Buttons */}
        <div className="py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
            Presets:
          </span>
          {QUICK_PURCHASE_PILLS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => handleSendPurchaseChat(p.query)}
              disabled={isSendingChat}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border hover:border-emerald-500/40 text-foreground transition shrink-0 cursor-pointer shadow-2xs font-medium"
            >
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPurchaseChat();
          }}
          className="pt-2 pb-1 flex items-center gap-2"
        >
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask anything: 'Can I buy an iPhone 16 Pro?', 'Can I spend on a Goa trip?'..."
            disabled={isSendingChat}
            className="flex-1 bg-white dark:bg-black border border-border dark:border-neutral-800 rounded-xl px-4 py-3 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 shadow-xs"
          />
          <button
            type="submit"
            disabled={isSendingChat || !chatInput.trim()}
            className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs md:text-sm inline-flex items-center gap-1.5 disabled:opacity-40 transition shadow-xs cursor-pointer shrink-0"
          >
            <span>Ask Advisor</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </motion.div>

      {/* 2. MAIN SIMULATION INTERFACE (Grid: Controls on Left, Verdict & Horizon on Right) */}
      <div id="simulation-controls" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
