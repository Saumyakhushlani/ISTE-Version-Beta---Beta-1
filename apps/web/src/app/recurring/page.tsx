'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Calendar,
  Repeat,
  CheckCircle2,
  Clock,
  Sparkles,
  UploadCloud,
  RefreshCw,
  Search,
  Filter,
  Check,
  CheckCheck,
  X,
  Edit3,
  RotateCcw,
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Tag
} from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';
import EditRecurringModal from '@/components/EditRecurringModal';

type TabType = 'active' | 'needs_review' | 'confirmed' | 'dismissed';

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

export default function RecurringPage() {
  const [items, setItems] = useState<any[]>([]);
  const [allActiveItems, setAllActiveItems] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('active');
  const [counts, setCounts] = useState({
    all_active: 0,
    needs_review: 0,
    confirmed: 0,
    dismissed: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [showTimeline, setShowTimeline] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData(options?: { bypassCache?: boolean }) {
    if (options?.bypassCache || items.length === 0) {
      setLoading(true);
    }
    try {
      const status_filter = activeTab === 'dismissed' ? 'paused' : 'active';
      const user_status_filter =
        activeTab === 'needs_review'
          ? 'auto'
          : activeTab === 'confirmed'
          ? 'confirmed'
          : undefined;

      const [recRes, upRes, activeRes] = await Promise.all([
        api.getRecurringItems({
          status_filter,
          user_status_filter,
          limit: 100,
        }, options).catch(() => ({ recurring_items: [], counts: {} })),
        api.getUpcomingSchedule(30, options).catch(() => ({ upcoming_payments: [] })),
        activeTab === 'active'
          ? Promise.resolve(null)
          : api.getRecurringItems({ status_filter: 'active', limit: 200 }, options).catch(() => null),
      ]);

      const currentItems = recRes?.recurring_items || [];
      setItems(currentItems);
      if (activeTab === 'active') {
        setAllActiveItems(currentItems);
      } else if (activeRes?.recurring_items) {
        setAllActiveItems(activeRes.recurring_items);
      }

      if (recRes?.counts) {
        setCounts({
          all_active: recRes.counts.all_active || 0,
          needs_review: recRes.counts.needs_review || 0,
          confirmed: recRes.counts.confirmed || 0,
          dismissed: recRes.counts.dismissed || 0,
        });
      }
      setUpcoming(upRes?.upcoming_payments || upRes?.schedule || []);
    } catch (e) {
      console.error('Failed to load recurring data:', e);
    } finally {
      setLoading(false);
    }
  }

  const getItemAmount = (item: any): number => {
    return item?.typical_amount_minor ?? item?.typical_amount_paise ?? item?.amount_minor ?? item?.amount_paise ?? 0;
  };

  async function handleConfirm(item: any) {
    setActionLoadingId(item.id);
    try {
      await api.updateRecurringItem(item.id, { user_status: 'confirmed' });
      await loadData();
    } catch (e) {
      console.error('Failed to confirm commitment:', e);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDismiss(item: any) {
    setActionLoadingId(item.id);
    try {
      await api.updateRecurringItem(item.id, { user_status: 'rejected' });
      await loadData();
    } catch (e) {
      console.error('Failed to dismiss commitment:', e);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleRestore(item: any) {
    setActionLoadingId(item.id);
    try {
      await api.updateRecurringItem(item.id, { user_status: 'confirmed' });
      await loadData();
    } catch (e) {
      console.error('Failed to restore commitment:', e);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleBatchConfirm() {
    setBatchConfirming(true);
    try {
      await api.batchConfirmRecurring();
      await loadData();
    } catch (e) {
      console.error('Failed to batch confirm:', e);
    } finally {
      setBatchConfirming(false);
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || item.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const summarySourceItems = allActiveItems.length > 0 ? allActiveItems : items;
  const committedMonthly = summarySourceItems
    .filter((i) => i.type !== 'salary' && i.status !== 'paused' && i.user_status !== 'rejected')
    .reduce((sum, i) => sum + getItemAmount(i), 0);

  const salaryExpected = summarySourceItems
    .filter((i) => i.type === 'salary' && i.status !== 'paused' && i.user_status !== 'rejected')
    .reduce((sum, i) => sum + getItemAmount(i), 0);

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Subscriptions & Recurring Commitments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review auto-detected obligations, confirm active subscriptions, and lock recurring outflows into your headroom forecast.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload Statement</span>
          </Link>
          <button
            onClick={() => loadData({ bypassCache: true })}
            title="Refresh (Bypass Cache)"
            className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Needs Review Alert Banner */}
      <AnimatePresence>
        {counts.needs_review > 0 && (
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
                  {counts.needs_review} Auto-Detected Commitment{counts.needs_review > 1 ? 's' : ''} Awaiting Review
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Confirm recurring debits to guarantee their reserves in your cash-flow buffer, or dismiss false positives to remove them from future obligations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => setActiveTab('needs_review')}
                className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition"
              >
                Review Items
              </button>
              <button
                onClick={handleBatchConfirm}
                disabled={batchConfirming}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                {batchConfirming ? (
                  <span className="animate-spin text-xs">⏳</span>
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>Confirm All ({counts.needs_review})</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-card border border-border rounded-xl p-5 shadow-xs text-card-foreground"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Monthly Commitments
            </span>
            <span className="p-1.5 rounded-md bg-destructive/10 text-destructive">
              <ArrowDownRight className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-destructive mt-2 tracking-tight font-mono">
            {committedMonthly > 0 ? `-${formatINR(committedMonthly)}` : '₹0'}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-2">Active rent, EMIs, SIPs & subscriptions</p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-card border border-border rounded-xl p-5 shadow-xs text-card-foreground"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Expected Monthly Income
            </span>
            <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight font-mono">
            {salaryExpected > 0 ? `+${formatINR(salaryExpected)}` : '₹0'}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-2">Verified recurring payroll credits</p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-card border border-border rounded-xl p-5 shadow-xs text-card-foreground"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Recurring Tracks
            </span>
            <span className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Repeat className="w-4 h-4" />
            </span>
          </div>
          <p className="text-3xl font-extrabold text-foreground mt-2 tracking-tight font-mono">
            {counts.all_active}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-2">
            {counts.confirmed} confirmed • {counts.needs_review} awaiting review
          </p>
        </motion.div>
      </motion.div>

      {/* Tabs and Search Bar */}
      <motion.div variants={itemVariants} className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition relative ${
              activeTab === 'active'
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>All Active</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-mono">
              {counts.all_active}
            </span>
            {activeTab === 'active' && (
              <motion.div
                layoutId="tabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('needs_review')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition relative ${
              activeTab === 'needs_review'
                ? 'text-amber-500 bg-amber-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>Needs Review</span>
            {counts.needs_review > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono font-bold">
                {counts.needs_review}
              </span>
            )}
            {activeTab === 'needs_review' && (
              <motion.div
                layoutId="tabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('confirmed')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition relative ${
              activeTab === 'confirmed'
                ? 'text-emerald-500 bg-emerald-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <span>Confirmed</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-mono">
              {counts.confirmed}
            </span>
            {activeTab === 'confirmed' && (
              <motion.div
                layoutId="tabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
              />
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
            <span>Dismissed / Excluded</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted font-mono">
              {counts.dismissed}
            </span>
            {activeTab === 'dismissed' && (
              <motion.div
                layoutId="tabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted-foreground"
              />
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
              placeholder="Search commitment by merchant or category..."
              className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs capitalize"
            >
              <option value="all">All Types</option>
              <option value="subscription">Subscriptions</option>
              <option value="emi">Loan EMIs</option>
              <option value="rent">Rent</option>
              <option value="utility">Utilities</option>
              <option value="insurance">Insurance</option>
              <option value="sip">SIP / Investments</option>
              <option value="salary">Salary Inflow</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Recurring Items Grid */}
      {filteredItems.length === 0 && !loading ? (
        <motion.div
          variants={itemVariants}
          className="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl space-y-3 shadow-xs"
        >
          <Repeat className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-semibold text-foreground">
            {activeTab === 'dismissed'
              ? 'No Dismissed Commitments'
              : activeTab === 'needs_review'
              ? 'All Auto-Detected Items Reviewed!'
              : 'No Recurring Items Found'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            {activeTab === 'needs_review'
              ? 'Great job! All recurring obligations have been confirmed or reviewed.'
              : activeTab === 'dismissed'
              ? 'No commitments have been dismissed or excluded from your forecast.'
              : 'Once bank statements are uploaded, repeat merchant debits will appear here automatically.'}
          </p>
          {activeTab === 'active' && (
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:opacity-90 transition mt-2"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Bank Statement
            </Link>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => {
              const isNeedsReview = item.user_status === 'auto';
              const isConfirmed = item.user_status === 'confirmed';
              const isDismissed = item.status === 'paused' || item.user_status === 'rejected';
              const isLoading = actionLoadingId === item.id;

              return (
                <motion.div
                  key={item.id}
                  layout
                  variants={itemVariants}
                  exit="exit"
                  whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
                  className={`border rounded-xl p-5 shadow-xs flex flex-col justify-between transition-colors ${
                    isDismissed
                      ? 'bg-muted/40 border-border/60 opacity-75'
                      : isNeedsReview
                      ? 'bg-card border-amber-500/30'
                      : 'bg-card border-border'
                  }`}
                >
                  {/* Card Header & Badges */}
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.type === 'salary'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                              : 'bg-primary/15 text-primary border border-primary/25'
                          }`}
                        >
                          {item.type}
                        </span>

                        <span className="text-[11px] text-muted-foreground capitalize flex items-center gap-1 font-mono">
                          <Repeat className="w-3 h-3" /> {item.cadence}
                        </span>
                      </div>

                      {/* Status Indicator Badge */}
                      {isConfirmed && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <Check className="w-3 h-3" /> Confirmed
                        </span>
                      )}
                      {isNeedsReview && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          <AlertTriangle className="w-3 h-3" /> Needs Review
                        </span>
                      )}
                      {isDismissed && (
                        <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
                          Dismissed
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-foreground text-base mt-3 truncate" title={item.merchant}>
                      {item.merchant}
                    </h3>
                    <p className="text-2xl font-extrabold mt-1 text-foreground font-mono">
                      {formatINR(getItemAmount(item))}
                    </p>
                  </div>

                  {/* Card Metadata */}
                  <div className="mt-4 pt-3 border-t border-border space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Next:{' '}
                        <span className="font-semibold text-foreground">
                          {item.next_expected_date || 'Upcoming'}
                        </span>
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {item.occurrences || 1}x recorded
                      </span>
                    </div>

                    {/* Interactive Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {isDismissed ? (
                        /* Restore Action */
                        <button
                          onClick={() => handleRestore(item)}
                          disabled={isLoading}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition shadow-xs disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-primary" />
                          <span>Restore Commitment</span>
                        </button>
                      ) : (
                        /* Normal Actions: Confirm, Edit, Dismiss */
                        <>
                          {!isConfirmed && (
                            <button
                              onClick={() => handleConfirm(item)}
                              disabled={isLoading}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition shadow-xs disabled:opacity-50"
                            >
                              {isLoading ? (
                                <span className="animate-spin text-xs">⏳</span>
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>Confirm</span>
                            </button>
                          )}

                          <button
                            onClick={() => setEditingItem(item)}
                            disabled={isLoading}
                            title="Edit amount or date"
                            className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition shadow-xs"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDismiss(item)}
                            disabled={isLoading}
                            title="Dismiss as false positive / exclude from forecast"
                            className="p-1.5 rounded-lg border border-border bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition shadow-xs"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Upcoming Schedule Timeline Section */}
      <motion.div variants={itemVariants} className="pt-6 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span>Upcoming 30-Day Payment Schedule</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Deterministic 30-day timeline of expected cash inflows and outflows with bank account attribution.
            </p>
          </div>
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border bg-card transition"
          >
            <span>{showTimeline ? 'Hide Timeline' : 'Show Timeline'}</span>
            {showTimeline ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <AnimatePresence>
          {showTimeline && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-card border border-border rounded-xl overflow-hidden shadow-xs"
            >
              {upcoming.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No upcoming payments scheduled in the next 30 days.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Commitment</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4">Bank Account</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {upcoming.map((payment, idx) => (
                        <tr key={idx} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap text-foreground font-semibold">
                            {payment.due_date || payment.date || payment.expected_date}
                          </td>
                          <td className="py-3 px-4 font-sans text-foreground">
                            <span className="font-semibold">{payment.merchant}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-muted border border-border text-muted-foreground">
                              {payment.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                              <span>{payment.bank_name || payment.bank || 'Primary Bank'}</span>
                              {payment.masked_last4 && (
                                <span className="font-mono text-[11px]">••••{payment.masked_last4}</span>
                              )}
                            </span>
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-bold ${
                              payment.is_income || payment.type === 'salary'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-foreground'
                            }`}
                          >
                            {payment.is_income || payment.type === 'salary' ? '+' : '-'}
                            {formatINR(payment.amount_minor ?? payment.typical_amount_minor ?? 0)}
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
      </motion.div>

      {/* Edit Commitment Modal */}
      <EditRecurringModal
        isOpen={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSuccess={() => loadData()}
      />
    </motion.div>
  );
}
