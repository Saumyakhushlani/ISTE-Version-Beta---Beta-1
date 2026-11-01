'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
  Activity,
  Check,
  CheckCheck,
  X,
  RotateCcw,
  Search,
  Filter,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  EyeOff,
  Copy,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';
import DisputeGuideModal from '@/components/DisputeGuideModal';

type TabType = 'unresolved' | 'expected' | 'duplicates_disputed' | 'dismissed' | 'all';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.25 }
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 }
  }
};

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('unresolved');
  const [counts, setCounts] = useState({
    total: 0,
    unresolved: 0,
    expected: 0,
    real_duplicate: 0,
    disputed: 0,
    dismissed: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [disputeModalData, setDisputeModalData] = useState<{
    anomaly: any;
    mode: 'real_duplicate' | 'disputed';
  } | null>(null);

  useEffect(() => {
    loadAnomalies();
  }, [activeTab]);

  async function loadAnomalies(options?: { bypassCache?: boolean }) {
    if (options?.bypassCache || anomalies.length === 0) {
      setLoading(true);
    }
    try {
      const res = await api.getAnomalies({
        feedback_filter: activeTab,
        limit: 100,
      }, options);
      setAnomalies(res?.anomalies || []);
      if (res?.counts) {
        setCounts({
          total: res.counts.total || 0,
          unresolved: res.counts.unresolved || 0,
          expected: res.counts.expected || 0,
          real_duplicate: res.counts.real_duplicate || 0,
          disputed: res.counts.disputed || 0,
          dismissed: res.counts.dismissed || 0,
        });
      }
    } catch (e) {
      console.error('Failed to load anomalies:', e);
    } finally {
      setLoading(false);
    }
  }

  const getAnomalyAmount = (a: any): number => {
    return a?.amount_paise ?? a?.amount_minor ?? a?.amount ?? 0;
  };

  async function handleFeedback(
    anomalyId: string,
    feedback: 'expected' | 'real_duplicate' | 'disputed' | 'dismissed' | 'none'
  ) {
    setActionLoadingId(anomalyId);
    try {
      await api.submitAnomalyFeedback(anomalyId, feedback);
      await loadAnomalies();
    } catch (e) {
      console.error('Failed to submit anomaly feedback:', e);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleBatchDismiss(severity?: string) {
    setBatchLoading(true);
    try {
      await api.batchAnomalyFeedback({
        feedback: 'dismissed',
        severity,
      });
      await loadAnomalies();
    } catch (e) {
      console.error('Failed to batch dismiss anomalies:', e);
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleBatchExpected() {
    setBatchLoading(true);
    try {
      await api.batchAnomalyFeedback({
        feedback: 'expected',
      });
      await loadAnomalies();
    } catch (e) {
      console.error('Failed to mark all expected:', e);
    } finally {
      setBatchLoading(false);
    }
  }

  const filtered = anomalies.filter((a) => {
    const matchesSearch =
      a.reason_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.raw_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter;
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesSearch && matchesSeverity && matchesType;
  });

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-8 max-w-7xl mx-auto text-foreground"
    >
      {/* Top Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Anomalies & Spike Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Algorithmic detection of spending spikes (Modified Z-Score &gt; 3.5), duplicate debits within 3 days, and new high-value merchants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadAnomalies({ bypassCache: true })}
            title="Refresh (Bypass Cache)"
            className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Review Alert Banner */}
      <AnimatePresence>
        {counts.unresolved > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-card-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  {counts.unresolved} Anomaly Flag{counts.unresolved > 1 ? 's' : ''} Require Your Review
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Acknowledge planned purchases as Expected, dismiss false alerts, or flag duplicate charges to generate formal dispute claims.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={handleBatchExpected}
                disabled={batchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {batchLoading ? <span className="animate-spin text-xs">⏳</span> : <CheckCheck className="w-3.5 h-3.5" />}
                <span>Mark All Expected</span>
              </button>
              <button
                onClick={() => handleBatchDismiss()}
                disabled={batchLoading}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition shadow-xs disabled:opacity-50"
              >
                Dismiss All ({counts.unresolved})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2 }}
          className="bg-card border border-border rounded-xl p-5 shadow-xs text-card-foreground"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Unresolved Alerts</span>
            <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-amber-500 mt-2 tracking-tight font-mono">
            {counts.unresolved}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1">Pending user feedback</p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2 }}
          className="bg-card border border-border rounded-xl p-5 shadow-xs text-card-foreground"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marked Expected</span>
            <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Check className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight font-mono">
            {counts.expected}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1">Legitimate planned spends</p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2 }}
          className="bg-card border border-border rounded-xl p-5 shadow-xs text-card-foreground"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Disputes & Duplicates</span>
            <span className="p-1.5 rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-destructive mt-2 tracking-tight font-mono">
            {counts.real_duplicate + counts.disputed}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1">Flagged for dispute/chargeback</p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2 }}
          className="bg-card border border-border rounded-xl p-5 shadow-xs text-card-foreground"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dismissed Alerts</span>
            <span className="p-1.5 rounded-md bg-muted text-muted-foreground">
              <EyeOff className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-foreground mt-2 tracking-tight font-mono">
            {counts.dismissed}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-1">False alarms archived</p>
        </motion.div>
      </motion.div>

      {/* Tabs and Search Bar */}
      <motion.div variants={itemVariants} className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('unresolved')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition relative ${
              activeTab === 'unresolved'
                ? 'text-amber-500 bg-amber-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>Needs Review</span>
            {counts.unresolved > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">
                {counts.unresolved}
              </span>
            )}
            {activeTab === 'unresolved' && (
              <motion.div layoutId="tabUnderlineAnom" className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('expected')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition relative ${
              activeTab === 'expected'
                ? 'text-emerald-500 bg-emerald-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>Marked Expected</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-mono">
              {counts.expected}
            </span>
            {activeTab === 'expected' && (
              <motion.div layoutId="tabUnderlineAnom" className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('duplicates_disputed')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition relative ${
              activeTab === 'duplicates_disputed'
                ? 'text-destructive bg-destructive/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>Duplicates & Disputed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-mono">
              {counts.real_duplicate + counts.disputed}
            </span>
            {activeTab === 'duplicates_disputed' && (
              <motion.div layoutId="tabUnderlineAnom" className="absolute bottom-0 left-0 right-0 h-0.5 bg-destructive" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('dismissed')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition relative ${
              activeTab === 'dismissed'
                ? 'text-foreground bg-muted font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>Dismissed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-mono">
              {counts.dismissed}
            </span>
            {activeTab === 'dismissed' && (
              <motion.div layoutId="tabUnderlineAnom" className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted-foreground" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition relative ${
              activeTab === 'all'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>All Records</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-mono">
              {counts.total}
            </span>
            {activeTab === 'all' && (
              <motion.div layoutId="tabUnderlineAnom" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by merchant, reason text, or transaction details..."
              className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs capitalize"
            >
              <option value="all">All Severities</option>
              <option value="high">High Severity</option>
              <option value="medium">Medium Severity</option>
              <option value="low">Low Severity</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs capitalize"
            >
              <option value="all">All Anomaly Rules</option>
              <option value="large_amount">Large Spikes</option>
              <option value="duplicate_charge">Duplicate Charges</option>
              <option value="new_merchant">New Merchants</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Anomalies List */}
      <motion.div variants={containerVariants} className="space-y-4">
        {filtered.length === 0 && !loading ? (
          <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl shadow-xs space-y-2">
            <CheckCircle className="w-10 h-10 text-primary mx-auto mb-2 opacity-80" />
            <p className="text-base font-semibold text-foreground">
              {activeTab === 'unresolved'
                ? 'All Anomalies Reviewed!'
                : activeTab === 'dismissed'
                ? 'No Dismissed Anomalies'
                : activeTab === 'duplicates_disputed'
                ? 'No Disputed Charges'
                : 'No Anomalies Found'}
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {activeTab === 'unresolved'
                ? 'Your spending matches expected historical distributions with zero unreviewed outliers.'
                : 'No anomaly records match the selected filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((a) => {
                const isLoading = actionLoadingId === a.id;
                const isUnresolved = (a.user_feedback || 'none') === 'none';
                const isDuplicateType = a.type === 'duplicate_charge';

                return (
                  <motion.div
                    key={a.id}
                    layout
                    variants={itemVariants}
                    exit="exit"
                    whileHover={{ y: -2, boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.06)' }}
                    className={`bg-card border rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 text-card-foreground transition ${
                      a.user_feedback === 'dismissed'
                        ? 'opacity-70 border-border/60 bg-muted/30'
                        : a.user_feedback === 'real_duplicate' || a.user_feedback === 'disputed'
                        ? 'border-destructive/30 bg-destructive/5'
                        : isUnresolved
                        ? 'border-border'
                        : 'border-border'
                    }`}
                  >
                    {/* Left Details */}
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Severity Pill */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            a.severity === 'high'
                              ? 'bg-destructive/20 text-destructive border border-destructive/30'
                              : a.severity === 'medium'
                              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {a.severity}
                        </span>

                        {/* Anomaly Rule / Type */}
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted border border-border text-foreground font-mono">
                          {a.type?.replace('_', ' ')}
                        </span>

                        {/* Account Attribution */}
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                          <Building2 className="w-3 h-3 text-primary" />
                          <span>{a.bank_name || 'Bank'} ••••{a.masked_last4 || 'XXXX'}</span>
                        </span>

                        {/* Date */}
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
                          <Calendar className="w-3 h-3 text-primary" />
                          <span>{a.posted_date || a.detected_at?.slice(0, 10)}</span>
                        </span>
                      </div>

                      {/* Explanation Reason */}
                      <p className="text-sm font-semibold text-foreground leading-relaxed">
                        {a.reason_text}
                      </p>

                      {/* User Feedback Status Badge */}
                      <div className="flex items-center gap-2 pt-1">
                        {a.user_feedback === 'expected' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <Check className="w-3 h-3" /> Marked as Planned / Expected
                          </span>
                        )}
                        {a.user_feedback === 'dismissed' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                            <EyeOff className="w-3 h-3" /> Dismissed as False Alarm
                          </span>
                        )}
                        {a.user_feedback === 'real_duplicate' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">
                            <AlertTriangle className="w-3 h-3" /> Confirmed Duplicate Charge
                          </span>
                        )}
                        {a.user_feedback === 'disputed' && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded border border-destructive/20">
                            <ShieldAlert className="w-3 h-3" /> Disputed with Bank
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Amount & Actions */}
                    <div className="flex flex-col md:items-end justify-between gap-3 shrink-0">
                      <div>
                        <p className="text-xl font-bold text-destructive font-mono md:text-right">
                          {formatINR(getAnomalyAmount(a))}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-mono md:text-right">
                          Channel: {a.channel || 'OTHER'}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isUnresolved ? (
                          <>
                            {/* Expected Button */}
                            <button
                              onClick={() => handleFeedback(a.id, 'expected')}
                              disabled={isLoading}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                              title="Acknowledge this expense as intentional/expected"
                            >
                              {isLoading ? <span className="animate-spin text-xs">⏳</span> : <Check className="w-3.5 h-3.5" />}
                              <span>Expected</span>
                            </button>

                            {/* Duplicate Button (if duplicate charge alert) */}
                            {isDuplicateType && (
                              <button
                                onClick={() => {
                                  handleFeedback(a.id, 'real_duplicate');
                                  setDisputeModalData({ anomaly: a, mode: 'real_duplicate' });
                                }}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
                                title="Flag as real accidental duplicate charge"
                              >
                                <Copy className="w-3.5 h-3.5" />
                                <span>Real Duplicate</span>
                              </button>
                            )}

                            {/* Dispute Button */}
                            <button
                              onClick={() => {
                                handleFeedback(a.id, 'disputed');
                                setDisputeModalData({ anomaly: a, mode: 'disputed' });
                              }}
                              disabled={isLoading}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold shadow-xs transition disabled:opacity-50"
                              title="Flag unrecognized charge for bank dispute"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Dispute</span>
                            </button>

                            {/* Dismiss Button */}
                            <button
                              onClick={() => handleFeedback(a.id, 'dismissed')}
                              disabled={isLoading}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold shadow-xs transition disabled:opacity-50"
                              title="Dismiss as false alarm"
                            >
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Dismiss</span>
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Guide Button for Disputed/Duplicate */}
                            {(a.user_feedback === 'real_duplicate' || a.user_feedback === 'disputed') && (
                              <button
                                onClick={() =>
                                  setDisputeModalData({
                                    anomaly: a,
                                    mode: a.user_feedback as any,
                                  })
                                }
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Dispute Steps</span>
                              </button>
                            )}

                            {/* Reopen Action */}
                            <button
                              onClick={() => handleFeedback(a.id, 'none')}
                              disabled={isLoading}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold shadow-xs transition disabled:opacity-50"
                              title="Reopen anomaly for review"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-primary" />
                              <span>Reopen</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Dispute Guidance Modal */}
      <DisputeGuideModal
        isOpen={!!disputeModalData}
        anomaly={disputeModalData?.anomaly}
        mode={disputeModalData?.mode || 'disputed'}
        onClose={() => setDisputeModalData(null)}
      />
    </motion.div>
  );
}
