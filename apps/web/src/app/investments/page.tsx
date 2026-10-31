'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  ShieldCheck,
  Building2,
  Lock,
  Sparkles,
  Send,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Wallet,
  ArrowRight,
  Info,
  DollarSign,
  Coins
} from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  canInvest?: boolean;
}

const DEFAULT_STARTER_QUESTIONS = [
  'Can I invest ₹10,000 in Mutual Fund SIP or Gold this month?',
  'Am I saving enough to invest in Stocks or Crypto?'
];

const INVESTMENT_OPTIONS = [
  { name: 'Mutual Fund SIP', tag: 'Disciplined Rupee-Cost Averaging' },
  { name: 'Gold & Silver', tag: 'Inflation & Currency Hedge' },
  { name: 'Stocks (Equities)', tag: 'Long-Term 5yr+ Growth' },
  { name: 'Crypto', tag: 'Speculative (Max 1-5%)' },
  { name: 'Fixed Deposits & PPF', tag: '7.1%-7.5% Guaranteed EEE' },
];

export default function InvestmentsPage() {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(true);

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isSending]);

  async function fetchSummary() {
    setLoadingTelemetry(true);
    try {
      const res = await api.getInvestmentSummary();
      const t = res?.telemetry;
      setTelemetry(t);

      // Initialize welcome message from AI advisor
      if (t) {
        const welcomeText = t.can_invest
          ? `Hello! I have analyzed your accounts. You currently have **${formatINR(t.combined_liquid_paise)}** in liquid funds and a healthy monthly savings rate of **${t.savings_rate_pct}%** (saving approx. **${formatINR(t.monthly_savings_paise)}/month**).\n\nYou have **${formatINR(t.safe_surplus_paise)}** in safe deployable surplus after reserving for upcoming bills and emergency cushions. What would you like to explore investing in today? (SIPs, Gold, Stocks, Crypto, or FDs)?`
          : `Hello! I have reviewed your finances. **Important Safety Notice**: Your current monthly outflow (${formatINR(t.monthly_outflow_paise)}) equals or exceeds your income (${formatINR(t.monthly_inflow_paise)}), leaving a monthly deficit of **${formatINR(Math.abs(t.monthly_savings_paise))}** (Savings rate: ${t.savings_rate_pct}%).\n\n⚠️ **Validation Recommendation**: We strongly advise **pausing any new investments** (including Stocks, Crypto, Gold, and new SIPs) until you turn your monthly cash flow positive and establish an emergency buffer. How can I help you optimize your cash flow first?`;

        setMessages([
          {
            id: 'msg_welcome',
            role: 'assistant',
            content: welcomeText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            modelUsed: 'Groq NLU',
            canInvest: t.can_invest,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load investment summary:', err);
    } finally {
      setLoadingTelemetry(false);
    }
  }

  async function handleSendMessage(textToSend?: string) {
    const q = (textToSend || inputMessage).trim();
    if (!q || isSending) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputMessage('');
    setIsSending(true);

    try {
      // Prepare history for API
      const historyPayload = nextMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await api.sendInvestmentChat(q, historyPayload);
      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: res.reply || 'No response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: res.model_used || 'Groq Cloud',
        canInvest: res.can_invest,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat query error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'I encountered an error connecting to the investment engine. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleResetChat() {
    if (telemetry) {
      const welcomeText = telemetry.can_invest
        ? `Chat reset. You have **${formatINR(telemetry.combined_liquid_paise)}** in liquid balance and **${formatINR(telemetry.safe_surplus_paise)}** in safe deployable surplus. What would you like to invest in?`
        : `Chat reset. Deficit detected. We recommend focusing on emergency savings before taking investment risk.`;
      setMessages([
        {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          canInvest: telemetry.can_invest,
        },
      ]);
    } else {
      setMessages([]);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. HEADER SECTION (Matches screenshot layout) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              Investments & Multi-Bank Liquidity Sourcing
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            Capital Preservation First
          </span>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground max-w-4xl">
          Explore benchmark Indian Fixed Deposits, tax-free instruments, and safely calculate multi-bank deployment without bouncing upcoming obligations.
        </p>
      </div>

      {/* 2. DETERMINISTIC SAVINGS GATE & REAL-TIME CASH FLOW TELEMETRY */}
      {telemetry && (
        <div className="rounded-2xl border border-border bg-card/60 p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-primary" />
              Verified Financial Run-Rate & Safety Status
            </span>
            {telemetry.can_invest ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Eligible to Invest ({telemetry.savings_rate_pct}% Savings Rate)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-3.5 h-3.5" />
                Hold Off on Investing (Zero/Deficit Savings)
              </span>
            )}
          </div>

          {/* Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-background/80 rounded-xl p-3 border border-border/70">
              <div className="text-[11px] text-muted-foreground">Liquid Balance</div>
              <div className="text-sm md:text-base font-bold text-foreground mt-0.5">
                {formatINR(telemetry.combined_liquid_paise)}
              </div>
            </div>
            <div className="bg-background/80 rounded-xl p-3 border border-border/70">
              <div className="text-[11px] text-muted-foreground">Monthly Inflow</div>
              <div className="text-sm md:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                +{formatINR(telemetry.monthly_inflow_paise)}
              </div>
            </div>
            <div className="bg-background/80 rounded-xl p-3 border border-border/70">
              <div className="text-[11px] text-muted-foreground">Monthly Outflow</div>
              <div className="text-sm md:text-base font-bold text-rose-400 mt-0.5">
                -{formatINR(telemetry.monthly_outflow_paise)}
              </div>
            </div>
            <div className="bg-background/80 rounded-xl p-3 border border-border/70">
              <div className="text-[11px] text-muted-foreground">Net Monthly Savings</div>
              <div className={`text-sm md:text-base font-bold mt-0.5 ${telemetry.monthly_savings_paise >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-400'}`}>
                {telemetry.monthly_savings_paise >= 0 ? '+' : ''}{formatINR(telemetry.monthly_savings_paise)}
              </div>
            </div>
          </div>

          {/* Validation Alert Warning if not saving */}
          {!telemetry.can_invest && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 p-3.5 flex items-start gap-3 mt-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="text-xs font-bold text-rose-300">
                  Deficit Detected · Hold Off On New Investments
                </div>
                <div className="text-xs text-rose-200/90 leading-relaxed">
                  Your expenses match or exceed your income. Our safety validation rule instructs you not to invest right now. Prioritize turning monthly cash flow positive and parking a 3-month emergency safety buffer in liquid savings first.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. CONVERSATIONAL NLP CHAT INTERFACE (Open, seamless, borderless layout) */}
      <div className="flex flex-col h-[680px] overflow-hidden">
        {/* Chat Header */}
        <div className="py-3 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Investment NLP Advisor</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-mono">
                  Google Gemini 3.5 Flash
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Grounded in your real cash flow · Gold, Silver, Stocks, Crypto, SIP & Mutual Funds
              </div>
            </div>
          </div>

          <button
            onClick={handleResetChat}
            title="Reset Conversation"
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/60 transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* 1-2 Default Starter Question Chips */}
        <div className="py-2.5 border-b border-border/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Try asking:
          </span>
          {DEFAULT_STARTER_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isSending}
              className="text-xs px-3 py-1.5 rounded-full bg-card hover:bg-muted border border-border hover:border-emerald-500/50 text-foreground transition shrink-0 whitespace-nowrap cursor-pointer shadow-2xs font-medium"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Messages Thread */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto py-5 px-1 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-xs md:text-sm leading-relaxed shadow-xs ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-xs font-medium'
                    : 'bg-muted/50 border border-border text-foreground rounded-bl-xs'
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

                {/* Formatted Message Body */}
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
                        em: ({ ...props }) => (
                          <em className="text-muted-foreground italic" {...props} />
                        ),
                        code: ({ ...props }) => (
                          <code className="bg-background/80 border border-border px-1.5 py-0.5 rounded text-[11px] font-mono text-emerald-600 dark:text-emerald-400" {...props} />
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground/70 mt-1 px-1">
                {m.timestamp}
              </span>
            </div>
          ))}

          {/* Thinking / Loading Indicator */}
          {isSending && (
            <div className="flex items-start gap-2">
              <div className="rounded-2xl px-4 py-3 bg-muted/50 border border-border text-muted-foreground text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-75" />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-150" />
                <span className="ml-1 text-xs">Analyzing financial telemetry with Gemini AI...</span>
              </div>
            </div>
          )}
        </div>

        {/* Investment Options Bar */}
        <div className="py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
            Options:
          </span>
          {INVESTMENT_OPTIONS.map((opt) => (
            <button
              key={opt.name}
              type="button"
              onClick={() => {
                const prompt = `Tell me about investing in ${opt.name} based on my savings.`;
                handleSendMessage(prompt);
              }}
              disabled={isSending}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-card hover:bg-muted border border-border hover:border-emerald-500/40 text-foreground transition shrink-0 cursor-pointer shadow-2xs"
            >
              <span className="font-semibold">{opt.name}</span>
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="pt-2 pb-1 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask anything (e.g. 'Can I invest ₹15,000 in Gold or SIP this month?')..."
            disabled={isSending}
            className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-xs md:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 shadow-xs"
          />
          <button
            type="submit"
            disabled={isSending || !inputMessage.trim()}
            className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs md:text-sm inline-flex items-center gap-1.5 disabled:opacity-40 transition shadow-xs cursor-pointer shrink-0"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
