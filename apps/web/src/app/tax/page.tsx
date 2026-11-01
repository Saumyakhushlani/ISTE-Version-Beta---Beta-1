'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  FileDown,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Coins,
  TrendingUp,
  PiggyBank,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Info,
  Receipt,
  Landmark,
  Layers,
  ArrowRight,
  RefreshCw,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatINR } from '@fdl/shared';

interface TransactionItem {
  id: string;
  date: string;
  amount_minor: number;
  amount_rs: number;
  description: string;
  normalized_description: string;
  bank: string;
  category_id: string;
  sub_type?: string;
  reason?: string;
}

interface IncomeSource {
  category: string;
  section: string;
  observed_total_minor: number;
  observed_total_rs: number;
  transaction_count: number;
  sources: string[];
  transactions: TransactionItem[];
  nature: string;
  clarification: string;
}

interface ExcludedInflow {
  type: string;
  total_minor: number;
  total_rs: number;
  count: number;
  transactions: TransactionItem[];
  reason: string;
}

interface DeductionGuidance {
  section: string;
  statute: string;
  regime: string;
  max_eligible_rs?: number;
  observed_minor: number;
  observed_rs: number;
  eligible: boolean;
  summary: string;
  transactions?: TransactionItem[];
  proof_required: string;
}

interface MissingInfoItem {
  document: string;
  issuer: string;
  status: string;
  why_bank_cannot_establish: string;
  action: string;
}

interface TaxSummaryResponse {
  user_name: string;
  assessment_year: string;
  financial_year: string;
  generated_at: string;
  total_accounts_analyzed: number;
  total_transactions_analyzed: number;
  summary_metrics: {
    total_observed_salary_rs: number;
    total_observed_interest_rs: number;
    total_observed_dividends_rs: number;
    total_taxable_inflow_observed_rs: number;
    total_excluded_credits_rs: number;
    total_potential_80c_rs: number;
    total_potential_80d_rs: number;
    annual_rent_paid_rs: number;
  };
  income_sources: IncomeSource[];
  excluded_inflows: ExcludedInflow[];
  deductions_guidance: DeductionGuidance[];
  missing_information: MissingInfoItem[];
  regime_guidance: {
    assessment_year: string;
    default_regime: string;
    new_regime_features: string[];
    old_regime_features: string[];
    recommendation_note: string;
  };
}

export default function TaxIntelligencePage() {
  const [data, setData] = useState<TaxSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'financial' | 'deductions' | 'pdf'>('financial');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({});
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    loadTaxData();
  }, []);

  async function loadTaxData() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getTaxSummary();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load tax intelligence data:', err);
      setError(err?.message || 'Failed to load tax intelligence summary. Ensure statements are uploaded.');
    } finally {
      setLoading(false);
    }
  }

  const toggleDocChecked = (docName: string) => {
    setCheckedDocs(prev => ({
      ...prev,
      [docName]: !prev[docName]
    }));
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      const res = await fetch('/api/proxy/tax/pdf', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!res.ok) {
        let errorText = 'Failed to generate tax report PDF.';
        try {
          const errJson = await res.json();
          errorText = errJson.detail || errorText;
        } catch {}
        throw new Error(errorText);
      }

      const buffer = await res.arrayBuffer();
      const uint8 = new Uint8Array(buffer.slice(0, 5));
      const magic = String.fromCharCode(...uint8);
      const contentType = res.headers.get('content-type') || '';
      const isPdf = magic.startsWith('%PDF') || contentType.includes('application/pdf');

      if (!isPdf) {
        const text = new TextDecoder('utf-8').decode(buffer.slice(0, 200));
        throw new Error(`Server returned non-PDF response: ${text}`);
      }

      const pdfBlob = new Blob([buffer], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FDL_ITR1_Preparation_Summary_AY2026-27.pdf`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 2500);
    } catch (err: any) {
      console.error('PDF download error:', err);
      alert(err?.message || 'Could not download PDF. Please try again.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-mono">
          Synthesizing bank transactions for ITR-1 (AY 2026–27)...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="p-6 bg-destructive/10 border border-destructive/30 rounded-2xl space-y-3">
          <div className="flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h3 className="text-base font-bold">Unable to Load Tax Intelligence</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{error}</p>
          <button
            onClick={loadTaxData}
            className="px-4 py-2 bg-destructive/20 hover:bg-destructive/30 text-destructive text-xs font-semibold rounded-xl transition"
          >
            Retry Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="p-4 sm:p-8 max-w-7xl mx-auto space-y-6"
    >
      {/* 1. TOP HEADER & HERO */}
      <div className="pb-4 border-b border-border">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            <span>Tax Intelligence · ITR-1 Assistant</span>
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-primary/15 text-primary border border-primary/30">
            AY 2026–27 (FY 2025–26)
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-muted text-muted-foreground border border-border">
            Salaried (Sahaj)
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
          Automated, deterministic analysis of your existing uploaded bank statements. Identifies salary, interest, and dividends; maps potential Chapter VI-A deductions; and highlights critical missing documents.
        </p>
      </div>

      {/* 2. STRICT BOUNDARY & DISCLAIMER BANNER */}
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-xs leading-relaxed">
        <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-600 dark:text-amber-400">
            Important Boundaries: Preparation Assistant Only (Not an Official Filing Tool)
          </p>
          <p className="text-muted-foreground text-[11px]">
            This tool prepares you for filing <strong>ITR-1 (Sahaj)</strong> by examining your bank transactions. It does <strong>NOT</strong> calculate final tax liabilities or refunds, nor does it generate ITR JSON. Bank statement inflows reflect <em>net in-hand pay</em>; always cross-verify your gross salary, CTC perks, and TDS with <strong>Form 16 Part B, AIS, and Form 26AS</strong>.
          </p>
        </div>
      </div>

      {/* 3. QUICK SUMMARY STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Salary */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Observed Salary Inflows</span>
            <Building2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground">
            {formatINR(data.summary_metrics.total_observed_salary_rs * 100)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Net take-home credited to accounts
          </p>
        </div>

        {/* Other Income (Interest & Div) */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Interest &amp; Dividends</span>
            <Coins className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground">
            {formatINR((data.summary_metrics.total_observed_interest_rs + data.summary_metrics.total_observed_dividends_rs) * 100)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Savings / FD interest &amp; equity dividends
          </p>
        </div>

        {/* Excluded Non-Taxable */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Excluded Inflows</span>
            <ShieldCheck className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {formatINR(data.summary_metrics.total_excluded_credits_rs * 100)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Internal transfers &amp; refunds (0 tax liability)
          </p>
        </div>

        {/* Potential 80C & 80D Outlays */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span className="font-medium">Potential Deductions</span>
            <PiggyBank className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold font-mono text-foreground">
            {formatINR((data.summary_metrics.total_potential_80c_rs + data.summary_metrics.total_potential_80d_rs) * 100)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Observed 80C &amp; 80D qualifying debits
          </p>
        </div>
      </div>

      {/* 4. MAIN 3-SECTION TAB CONTROLS */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'financial'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Landmark className="w-3.5 h-3.5" />
          <span>1. Financial Analysis &amp; Inflows</span>
        </button>

        <button
          onClick={() => setActiveTab('deductions')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'deductions'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <PiggyBank className="w-3.5 h-3.5" />
          <span>2. Tax Benefits &amp; Missing Information</span>
        </button>

        <button
          onClick={() => setActiveTab('pdf')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'pdf'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>3. Download PDF Report</span>
        </button>
      </div>

      {/* 5. TAB 1: FINANCIAL ANALYSIS (INCOME SOURCES & NON-TAXABLE INFLOWS) */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Income Sources Observed */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Coins className="w-4 h-4 text-primary" />
                  <span>Income Sources Detected in Bank Statements</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Transactions matching recurring salary, interest, and dividends during the financial year.
                </p>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                Total Observed Inflow: <strong>{formatINR(data.summary_metrics.total_taxable_inflow_observed_rs * 100)}</strong>
              </span>
            </div>

            <div className="space-y-3">
              {data.income_sources.map((src, idx) => {
                const isExpanded = expandedSection === `inc-${idx}`;
                return (
                  <div
                    key={idx}
                    className="border border-border rounded-xl bg-card overflow-hidden transition hover:border-primary/40"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedSection(isExpanded ? null : `inc-${idx}`)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition text-xs"
                    >
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-sm">{src.category}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                            {src.section}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            ({src.transaction_count} {src.transaction_count === 1 ? 'transaction' : 'transactions'})
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {src.clarification}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-sm text-foreground">
                          {formatINR(src.observed_total_rs * 100)}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expandable Supporting Transactions */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border space-y-2"
                        >
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pb-1">
                            <span className="font-semibold uppercase text-xs">Supporting Transaction Evidence</span>
                            <span className="font-mono">Sources: {src.sources.join(', ') || 'Bank Statements'}</span>
                          </div>

                          <div className="overflow-x-auto border border-border rounded-lg bg-card">
                            <table className="w-full text-left text-xs font-sans">
                              <thead className="bg-muted/40 border-b border-border text-[11px] text-muted-foreground font-semibold">
                                <tr>
                                  <th className="py-2 px-3">Date</th>
                                  <th className="py-2 px-3">Bank</th>
                                  <th className="py-2 px-3">Description</th>
                                  <th className="py-2 px-3 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border font-mono text-[11px]">
                                {src.transactions.map((t, tIdx) => (
                                  <tr key={tIdx} className="hover:bg-muted/20 transition">
                                    <td className="py-1.5 px-3 whitespace-nowrap text-muted-foreground">{t.date}</td>
                                    <td className="py-1.5 px-3 whitespace-nowrap font-sans">{t.bank}</td>
                                    <td className="py-1.5 px-3 max-w-xs truncate font-sans text-foreground" title={t.description}>
                                      {t.description}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                      +{formatINR(t.amount_minor)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Excluded Non-Taxable Inflows */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Non-Taxable Inflows (Zero Tax Liability)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Filtered and excluded credits that represent own capital transfers or merchant reversals. Never treated as income.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                Total Excluded: {formatINR(data.summary_metrics.total_excluded_credits_rs * 100)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.excluded_inflows.map((ex, idx) => (
                <div key={idx} className="p-4 bg-muted/30 border border-border rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground text-xs">{ex.type}</span>
                    <span className="font-mono font-bold text-xs text-foreground">
                      {formatINR(ex.total_rs * 100)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {ex.reason}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    Observed in {ex.count} {ex.count === 1 ? 'transaction' : 'transactions'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: TAX BENEFITS & MISSING INFORMATION */}
      {activeTab === 'deductions' && (
        <div className="space-y-6">
          {/* Deductions Breakdown */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-primary" />
                  <span>Potential Tax Deductions &amp; Benefits (ITR-1)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Observed transactions that may qualify for tax relief under Old vs New Tax Regimes.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Statutory Guidelines
              </span>
            </div>

            <div className="space-y-3">
              {data.deductions_guidance.map((ded, idx) => {
                const isExpanded = expandedSection === `ded-${idx}`;
                return (
                  <div
                    key={idx}
                    className="border border-border rounded-xl bg-card overflow-hidden transition hover:border-primary/40"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedSection(isExpanded ? null : `ded-${idx}`)}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/30 transition text-xs"
                    >
                      <div className="space-y-1 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-sm">{ded.section}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border">
                            {ded.statute}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                            {ded.regime}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {ded.summary}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="font-mono font-bold text-sm text-foreground">
                            {ded.eligible ? formatINR(ded.observed_rs * 100) : 'None detected'}
                          </p>
                          {ded.max_eligible_rs && (
                            <p className="text-[10px] font-mono text-muted-foreground">
                              Cap: {formatINR(ded.max_eligible_rs * 100)}
                            </p>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {/* Expandable Proof & Transactions */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="px-4 pb-4 pt-2 bg-muted/20 border-t border-border space-y-3"
                        >
                          {/* Required Proof */}
                          <div className="p-3 bg-card border border-border rounded-lg text-xs space-y-1">
                            <span className="font-semibold text-foreground flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                              <span>Required Documentation / Proof:</span>
                            </span>
                            <p className="text-[11px] text-muted-foreground">
                              {ded.proof_required}
                            </p>
                          </div>

                          {/* Supporting Transactions if any */}
                          {ded.transactions && ded.transactions.length > 0 && (
                            <div className="overflow-x-auto border border-border rounded-lg bg-card">
                              <table className="w-full text-left text-xs font-sans">
                                <thead className="bg-muted/40 border-b border-border text-[11px] text-muted-foreground font-semibold">
                                  <tr>
                                    <th className="py-2 px-3">Date</th>
                                    <th className="py-2 px-3">Bank</th>
                                    <th className="py-2 px-3">Description</th>
                                    <th className="py-2 px-3 text-right">Amount Paid</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border font-mono text-[11px]">
                                  {ded.transactions.map((t, tIdx) => (
                                    <tr key={tIdx} className="hover:bg-muted/20 transition">
                                      <td className="py-1.5 px-3 text-muted-foreground">{t.date}</td>
                                      <td className="py-1.5 px-3 font-sans">{t.bank}</td>
                                      <td className="py-1.5 px-3 max-w-xs truncate font-sans text-foreground" title={t.description}>
                                        {t.description}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-bold text-foreground">
                                        {formatINR(Math.abs(t.amount_minor))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Missing Information Checklist */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  <span>Missing Information &amp; Document Collection Checklist</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Critical documents that bank statements alone cannot establish. Gather these before filing.
                </p>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                {Object.values(checkedDocs).filter(Boolean).length} of {data.missing_information.length} collected
              </span>
            </div>

            <div className="space-y-3">
              {data.missing_information.map((item, idx) => {
                const isChecked = !!checkedDocs[item.document];
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition flex items-start gap-3.5 ${
                      isChecked ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleDocChecked(item.document)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition cursor-pointer ${
                        isChecked
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-muted-foreground/40 hover:border-primary'
                      }`}
                    >
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </button>

                    <div className="space-y-1.5 w-full">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className={`font-bold text-xs ${isChecked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {item.document}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border self-start sm:self-auto">
                          Issuer: {item.issuer}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        <strong className="text-foreground">Why Bank Data Cannot Establish:</strong> {item.why_bank_cannot_establish}
                      </p>

                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <span className="text-primary font-medium flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          <span>Action: {item.action}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB 3: DOWNLOAD PDF REPORT & REGIME GUIDANCE */}
      {activeTab === 'pdf' && (
        <div className="space-y-6">
          {/* PDF Download Action Card */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30 font-semibold uppercase">
                    CA-Ready Report
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                    AY 2026–27
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  ITR-1 (Sahaj) Tax Preparation Assistant Report (PDF)
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Synthesizes your bank statements into a structured, audit-ready document formatted to ITR-1 schedules. Ready for your Chartered Accountant or self-preparation reference.
                </p>
              </div>

              {/* Action Buttons: Download + View */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <a
                  href="/api/proxy/tax/pdf?inline=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Browser</span>
                </a>

                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs shrink-0 disabled:opacity-60 cursor-pointer"
                >
                  {downloadingPdf ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  <span>{downloadingPdf ? 'Building PDF Document...' : 'Download ITR-1 PDF'}</span>
                </button>
              </div>
            </div>

            {/* Structured Report Outline Grid */}
            <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/20 border border-border space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                  <Landmark className="w-3.5 h-3.5 text-primary" />
                  <span>Part A &amp; Bank Accounts</span>
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Taxpayer details, masked A/C numbers, and primary refund bank designation.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Schedule B1: Salary Inflows</span>
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Month-by-month salary credit audit, employer sources, and net in-hand total.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>Schedule B3: Other Sources</span>
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Savings bank interest (80TTA), FD interest, and equity dividends breakdown.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-muted/20 border border-border space-y-1">
                <span className="font-bold text-foreground flex items-center gap-1.5 text-[11px]">
                  <PiggyBank className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Part C: Deductions &amp; TDS</span>
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Standard deduction ₹75k, 80C, 80D, HRA outlays, and Form 16/26AS checklist.
                </p>
              </div>
            </div>
          </div>

          {/* Regime Comparison Card */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                AY 2026–27 Tax Regime Comparison Guidance
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Tax Regime (Default) */}
              <div className="p-4 bg-muted/30 border border-primary/30 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <span>New Tax Regime (Section 115BAC)</span>
                    <span className="text-[10px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                      Statutory Default
                    </span>
                  </h4>
                </div>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed pl-1">
                  {data.regime_guidance.new_regime_features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Old Tax Regime */}
              <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-foreground">
                    Old Tax Regime (Optional)
                  </h4>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Chapter VI-A Deductions
                  </span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground leading-relaxed pl-1">
                  {data.regime_guidance.old_regime_features.map((feat, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground shrink-0 mt-1.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-3 bg-muted/20 border border-border rounded-xl text-xs text-muted-foreground flex items-start gap-2">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Next Step:</strong> {data.regime_guidance.recommendation_note}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
