'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, type Variants } from 'framer-motion';
import { 
  Sparkles, 
  ShieldCheck, 
  HelpCircle, 
  RotateCcw, 
  Clock, 
  CreditCard, 
  Zap, 
  Send
} from 'lucide-react';
import { formatINR } from '@fdl/shared';
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

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto text-foreground font-sans"
    >
      {/* Top Header */}
      <motion.div variants={itemVariants} className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Affordability & Decision Lab
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

      {/* CONVERSATIONAL PURCHASE AFFORDABILITY ADVISOR (Clean, Borderless Layout) */}
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
        <div ref={chatScrollRef} className="h-[520px] overflow-y-auto py-3 px-1 space-y-4">
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
    </motion.div>
  );
}
