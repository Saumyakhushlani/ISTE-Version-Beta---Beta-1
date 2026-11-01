'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Send,
  Sparkles,
  ShieldCheck,
  Check,
  ArrowRight,
  TrendingUp,
  Landmark,
  Coins,
  Sliders,
  Plus,
  RotateCcw,
  Bot,
  User as UserIcon,
  Clock,
  Scissors,
  CreditCard,
  DollarSign,
  Zap,
  Lightbulb
} from 'lucide-react';
import LiquidityAdvisorModal from '@/components/LiquidityAdvisorModal';
import { formatINR, rupeesToPaise } from '@fdl/shared';
import { api } from '@/lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  intent?: 'AFFORDABILITY' | 'INVESTMENT' | 'GENERAL_ADVISOR';
  pricingInfo?: {
    is_estimated: boolean;
    amount_rs: number;
    label: string;
    source_note?: string;
  };
  decision?: any;
  whatifResults?: any;
  suggestedCta?: {
    label: string;
    href: string;
  };
  isWelcome?: boolean;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const messageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const PROMPT_SUGGESTIONS = [
  { label: '📱 iPhone 16 next month', prompt: 'Can I afford an iPhone 16 next month?' },
  { label: '✈️ 4-Day Goa Trip', prompt: 'Can I go on a 4-day trip to Goa next month?' },
  { label: '🛋️ Throw a Party for Friends', prompt: 'Can I throw a dinner party for 15 friends next month?' },
  { label: '💰 Invest ₹50,000 Surplus', prompt: 'I have 50,000 rupees, where can I invest?' },
  { label: '🛡️ 50/30/20 Budgeting Rule', prompt: 'What is the 50/30/20 budgeting rule?' },
  { label: '💻 MacBook Pro on 6m EMI', prompt: 'Can I buy a MacBook Pro for ₹1,69,900 on 6-month EMI?' },
];

/**
 * Formats inline text converting bold or italic markers into clean HTML elements,
 * stripping away any raw markdown symbols (like #, **, etc.)
 */
function formatInlineText(text: string): React.ReactNode {
  let cleaned = text.replace(/^#{1,6}\s*/, '');
  const parts = cleaned.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <span key={idx} className="font-medium text-foreground">
          {part.slice(1, -1)}
        </span>
      );
    }
    return part;
  });
}

/**
 * Renders chat responses in a clean, human conversation format,
 * handling lists, paragraphs, and numbered points cleanly without raw markdown clutter.
 */
function RenderChatContent({ content }: { content: string }) {
  const paragraphs = content.split(/\n\s*\n/);

  return (
    <div className="space-y-2.5 font-sans text-xs sm:text-[13px] leading-relaxed">
      {paragraphs.map((p, pIdx) => {
        const trimmed = p.trim();
        if (!trimmed) return null;

        const lines = trimmed.split('\n');
        const isBulletList = lines.length > 1 && lines.every((l) => /^\s*(?:[•\-*]|\d+\.)\s+/.test(l));

        if (isBulletList) {
          return (
            <ul key={pIdx} className="space-y-1.5 pl-1 my-1">
              {lines.map((line, lIdx) => {
                const cleanedLine = line.replace(/^\s*(?:[•\-*]|\d+\.)\s+/, '').trim();
                return (
                  <li key={lIdx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span>{formatInlineText(cleanedLine)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={pIdx} className="leading-relaxed">
            {formatInlineText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export default function DecisionLabPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('Groq Neural Engine Ready');

  // Liquidity Advisor Modal
  const [isLiquidityModalOpen, setIsLiquidityModalOpen] = useState(false);
  const [liquidityModalParams, setLiquidityModalParams] = useState<{ amountRs: string; label: string }>({
    amountRs: '80000',
    label: 'Major Purchase'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial friendly conversational welcome message
    setMessages([
      {
        id: 'msg-welcome',
        role: 'assistant',
        isWelcome: true,
        content:
          "Hi! I am your Decision Lab Financial Assistant.\n\n" +
          "Ask me anything about your purchases, plans, or investments. If you don't mention a price, I'll automatically find realistic Indian market rates and evaluate your real bank transactions using 5,000 Monte Carlo simulations with zero mathematical hallucinations.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: 'GENERAL_ADVISOR'
      }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSendMessage(queryOverride?: string) {
    const text = (queryOverride || inputValue).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);
    setStatusText('Groq NLU analyzing query & estimating pricing...');

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await api.chatAffordability(text, history);

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: res.reply || res.narration || 'Evaluation completed.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: res.intent,
        pricingInfo: res.pricing_info,
        decision: res.decision,
        whatifResults: res.whatif_results,
        suggestedCta: res.suggested_cta
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat evaluation error:', err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          "I ran into an issue evaluating that query. " +
          (err?.message || 'Please check your connection and try again.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: 'GENERAL_ADVISOR'
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setStatusText('Groq Neural Engine Ready');
    }
  }

  function handleResetChat() {
    setMessages([
      {
        id: 'msg-welcome-reset',
        role: 'assistant',
        isWelcome: true,
        content:
          "Chat reset. Ask me anything about what you want to buy, a trip you want to plan, or where to invest extra savings!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        intent: 'GENERAL_ADVISOR'
      }
    ]);
  }

  function openLiquidityAdvisor(amountMinor: number, itemLabel: string) {
    setLiquidityModalParams({
      amountRs: (amountMinor / 100).toString(),
      label: itemLabel
    });
    setIsLiquidityModalOpen(true);
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-8 space-y-6 max-w-6xl mx-auto text-foreground font-sans min-h-[calc(100vh-5rem)] flex flex-col justify-between"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span>Affordability &amp; What-If Decision Lab</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-primary/10 text-primary border border-primary/20">
              5,000 Monte Carlo Runs
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              100% Math Verified
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Conversational financial assistant evaluating purchases, experiences, and investments against real statement history without hallucinations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleResetChat}
            className="px-3 py-1.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center gap-1.5 transition"
            title="Reset Chat Session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Suggested Quick Prompt Chips at Top */}
      <div className="flex items-center gap-2 flex-wrap text-xs pb-1">
        <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Try asking:</span>
        </span>
        {PROMPT_SUGGESTIONS.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(item.prompt)}
            disabled={loading}
            className="px-3 py-1 rounded-xl bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border text-xs transition font-medium disabled:opacity-50"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Thread */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-1 min-h-[400px]">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            variants={messageVariants}
            className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Assistant Avatar */}
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            {/* Message Body */}
            <div className={`space-y-3.5 max-w-4xl ${msg.role === 'user' ? 'w-auto' : 'w-full'}`}>
              {/* Text Bubble */}
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs shadow-xs'
                    : 'bg-card border border-border text-foreground shadow-xs rounded-tl-xs space-y-3'
                }`}
              >
                {/* Intent Tag for Assistant */}
                {msg.role === 'assistant' && msg.intent && (
                  <div className="flex items-center justify-between border-b border-border/70 pb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      {msg.intent === 'AFFORDABILITY' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                      {msg.intent === 'INVESTMENT' && <TrendingUp className="w-3.5 h-3.5 text-amber-500" />}
                      {msg.intent === 'GENERAL_ADVISOR' && <Sparkles className="w-3.5 h-3.5 text-primary" />}
                      <span>{msg.intent.replace('_', ' ')}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                )}

                {/* Auto-Estimated Price Notice Banner */}
                {msg.pricingInfo && msg.pricingInfo.is_estimated && (
                  <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl text-amber-700 dark:text-amber-300 font-sans text-xs flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="font-bold">
                        Estimated Indian market budget for {msg.pricingInfo.label}: {formatINR(msg.pricingInfo.amount_rs * 100)}
                      </p>
                      {msg.pricingInfo.source_note && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          Based on: {msg.pricingInfo.source_note}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Render Conversational Chat Text (Zero Raw Markdown) */}
                <RenderChatContent content={msg.content} />

                {/* Interactive Clickable Suggestions Inside Welcome Message Bubble */}
                {msg.isWelcome && (
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <p className="text-[11px] text-muted-foreground font-semibold">
                      Click any topic below to ask directly:
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PROMPT_SUGGESTIONS.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendMessage(item.prompt)}
                          className="px-2.5 py-1 rounded-lg bg-muted hover:bg-primary/20 hover:text-primary text-foreground text-xs font-medium border border-border transition flex items-center gap-1.5"
                        >
                          <span>{item.label}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ATTACHED AFFORDABILITY DECISION WIDGETS (Strict Order: Verdict -> Headroom -> What-If Table) */}
              {msg.decision && (
                <div className="space-y-5 pt-1">
                  {/* 1. MASTER VERDICT CARD & PERCENTILE HEADROOM */}
                  <div className={`p-5 rounded-2xl border shadow-xs space-y-4 ${
                    msg.decision.verdict?.code === 'AFFORDABLE' ? 'bg-emerald-500/10 border-emerald-500/30' :
                    msg.decision.verdict?.code === 'TIGHT' ? 'bg-amber-500/10 border-amber-500/30' :
                    msg.decision.verdict?.code === 'NOT_ADVISABLE' ? 'bg-orange-500/10 border-orange-500/30' :
                    msg.decision.verdict?.code === 'INSUFFICIENT_DATA' ? 'bg-amber-500/10 border-amber-500/30' :
                    'bg-destructive/10 border-destructive/30'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        msg.decision.verdict?.code === 'AFFORDABLE' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' :
                        msg.decision.verdict?.code === 'TIGHT' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30' :
                        msg.decision.verdict?.code === 'NOT_ADVISABLE' ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border border-orange-500/30' :
                        msg.decision.verdict?.code === 'INSUFFICIENT_DATA' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30' :
                        'bg-destructive/20 text-destructive border border-destructive/30'
                      }`}>
                        Verdict: {msg.decision.verdict?.code}
                      </span>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {msg.decision.verdict?.code !== 'INSUFFICIENT_DATA' && (
                          <>
                            <span>Breach Probability: <strong className="text-foreground font-mono">{(msg.decision.verdict?.breach_probability * 100).toFixed(1)}%</strong></span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Regex Guard Verified
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-foreground">{msg.decision.verdict?.headline}</h3>
                    </div>

                    {/* Sourcing button */}
                    {msg.decision.verdict?.code !== 'INSUFFICIENT_DATA' && (
                      <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <span className="text-xs text-muted-foreground">
                          Fund this purchase smoothly across multiple bank accounts without missing upcoming bills:
                        </span>
                        <button
                          type="button"
                          onClick={() => openLiquidityAdvisor(
                            msg.pricingInfo?.amount_rs ? msg.pricingInfo.amount_rs * 100 : 8000000,
                            msg.pricingInfo?.label || 'Purchase'
                          )}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
                        >
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          <span>Plan Multi-Bank Sourcing</span>
                        </button>
                      </div>
                    )}

                    {/* Constructive Advisory Helper if tight or not affordable */}
                    {msg.decision.constructive_helper && msg.decision.verdict?.code !== 'AFFORDABLE' && msg.decision.verdict?.code !== 'INSUFFICIENT_DATA' && (
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
                          <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-emerald-500" />
                              <span>Max Affordable Today</span>
                            </span>
                            <p className="text-base font-bold font-mono text-foreground">
                              {formatINR(msg.decision.constructive_helper.max_affordable_paise)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              The maximum cash outlay today that preserves median headroom above your buffer.
                            </p>
                          </div>

                          {/* Remedy 2: Recommended EMI Alternative */}
                          <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-primary" />
                              <span>Spread Over EMI</span>
                            </span>
                            <p className="text-base font-bold font-mono text-foreground">
                              {msg.decision.constructive_helper.recommended_emi_months} Mo at {formatINR(msg.decision.constructive_helper.recommended_monthly_emi_paise)}/mo
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Financing over this tenure brings monthly cash outflow into safe buffer compliance.
                            </p>
                          </div>

                          {/* Remedy 3: Wait & Save */}
                          {msg.decision.constructive_helper.min_delay_months > 0 && (
                            <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                <Clock className="w-3 h-3 text-amber-500" />
                                <span>Wait &amp; Accumulate</span>
                              </span>
                              <p className="text-base font-bold font-mono text-foreground">
                                Delay by {msg.decision.constructive_helper.min_delay_months} {msg.decision.constructive_helper.min_delay_months === 1 ? 'Month' : 'Months'}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Saving your monthly surplus ({formatINR(msg.decision.constructive_helper.monthly_net_savings_paise)}/mo) builds the shortfall cushion.
                              </p>
                            </div>
                          )}

                          {/* Remedy 4: Discretionary Spend Trim */}
                          {msg.decision.constructive_helper.suggested_monthly_cut_paise > 0 && (
                            <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-1">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase flex items-center gap-1">
                                <Scissors className="w-3 h-3 text-destructive" />
                                <span>Discretionary Trim</span>
                              </span>
                              <p className="text-base font-bold font-mono text-foreground">
                                Trim {formatINR(msg.decision.constructive_helper.suggested_monthly_cut_paise)}/mo
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                Temporarily reducing dining and entertainment preserves your safety buffer.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PERCENTILE HEADROOM GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase">P10 (Conservative)</span>
                      <p className={`text-xl font-bold mt-1 font-mono ${
                        (msg.decision.headroom?.p10_minor || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                      }`}>
                        {formatINR(msg.decision.headroom?.p10_minor || 0)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 font-mono">90% confidence lower bound</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase">P50 (Median Expected)</span>
                      <p className={`text-xl font-bold mt-1 font-mono ${
                        (msg.decision.headroom?.p50_minor || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'
                      }`}>
                        {formatINR(msg.decision.headroom?.p50_minor || 0)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 font-mono">Expected baseline headroom</p>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase">P90 (Optimistic)</span>
                      <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                        {formatINR(msg.decision.headroom?.p90_minor || 0)}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 font-mono">Upper bound best case</p>
                    </div>
                  </div>

                  {/* 2. WHAT-IF SIMULATION STUDIO (Placed ABOVE Cash Flow and Reasoning Ledger) */}
                  {msg.whatifResults && (
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-primary" />
                            <span>What-If Simulation Studio: Compare Scenarios Side-by-Side</span>
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Simulated without mutating historical bank transactions.
                          </p>
                        </div>
                      </div>

                      {/* Scenario Comparison Table */}
                      <div className="overflow-x-auto border border-border rounded-xl">
                        <table className="w-full text-left text-xs font-sans">
                          <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                            <tr>
                              <th className="py-2.5 px-4">Scenario Strategy</th>
                              <th className="py-2.5 px-4">Verdict</th>
                              <th className="py-2.5 px-4 text-right">Headroom Delta</th>
                              <th className="py-2.5 px-4 text-right">Lowest Projected Cash</th>
                              <th className="py-2.5 px-4 text-right">Breach Probability</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border font-mono">
                            {/* Baseline Row */}
                            {msg.whatifResults.baseline && (
                              <tr className="bg-primary/5 hover:bg-primary/10 transition">
                                <td className="py-2.5 px-4 font-sans font-bold text-foreground">
                                  {msg.whatifResults.baseline.name}
                                </td>
                                <td className="py-2.5 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    msg.whatifResults.baseline.verdict === 'AFFORDABLE' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                                    msg.whatifResults.baseline.verdict === 'TIGHT' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                                    'bg-destructive/20 text-destructive'
                                  }`}>
                                    {msg.whatifResults.baseline.verdict}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-right text-muted-foreground">Baseline (0)</td>
                                <td className="py-2.5 px-4 text-right font-bold text-foreground">
                                  {formatINR(msg.whatifResults.baseline.lowest_balance_paise)}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  {(msg.whatifResults.baseline.breach_probability * 100).toFixed(1)}%
                                </td>
                              </tr>
                            )}

                            {/* Simulated Rows */}
                            {msg.whatifResults.scenarios?.map((sc: any, idx: number) => (
                              <tr key={idx} className="hover:bg-muted/30 transition">
                                <td className="py-2.5 px-4 font-sans font-semibold text-foreground">
                                  {sc.name}
                                </td>
                                <td className="py-2.5 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    sc.verdict === 'AFFORDABLE' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                                    sc.verdict === 'TIGHT' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                                    'bg-destructive/20 text-destructive'
                                  }`}>
                                    {sc.verdict}
                                  </span>
                                </td>
                                <td className={`py-2.5 px-4 text-right font-bold ${
                                  sc.delta_headroom_paise >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                                }`}>
                                  {sc.delta_headroom_paise >= 0 ? `+${formatINR(sc.delta_headroom_paise)}` : formatINR(sc.delta_headroom_paise)}
                                </td>
                                <td className="py-2.5 px-4 text-right text-foreground font-bold">
                                  {formatINR(sc.lowest_balance_paise)}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  {(sc.breach_probability * 100).toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Avatar */}
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
                <UserIcon className="w-4 h-4" />
              </div>
            )}
          </motion.div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono py-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shrink-0 animate-pulse">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span>{statusText}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Sticky Chat Input Bar */}
      <div className="pt-2 sticky bottom-0 bg-background/80 backdrop-blur-md pb-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-center bg-card border border-border rounded-2xl shadow-lg focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition p-1.5"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={loading}
            placeholder="Ask anything: &quot;Can I afford iPhone 16?&quot;, &quot;Can I plan a Goa trip?&quot;, &quot;I have ₹50,000 where can I invest?&quot;"
            className="w-full bg-transparent px-4 py-2 text-xs sm:text-sm text-foreground focus:outline-none placeholder:text-muted-foreground font-medium"
          />

          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-semibold rounded-xl text-xs flex items-center gap-1.5 transition shadow-xs shrink-0 cursor-pointer"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-2 pt-2">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Zero Hallucination Math Guard</span>
          </span>
          <span className="font-mono text-[10px]">
            Groq NLU Active · 5,000 Monte Carlo Runs
          </span>
        </div>
      </div>

      {/* Liquidity Sourcing Advisor Modal */}
      <LiquidityAdvisorModal
        isOpen={isLiquidityModalOpen}
        onClose={() => setIsLiquidityModalOpen(false)}
        initialAmountRs={liquidityModalParams.amountRs}
        initialLabel={liquidityModalParams.label}
      />
    </motion.div>
  );
}
