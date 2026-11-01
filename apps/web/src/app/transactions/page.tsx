'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { 
  Search, 
  ArrowDownRight, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Filter, 
  Upload, 
  Tag, 
  RotateCcw, 
  History, 
  Edit2, 
  CheckCircle2, 
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Calendar,
  Landmark,
  CreditCard,
  DollarSign,
  Inbox,
  RefreshCw
} from 'lucide-react';
import { formatINR, DEFAULT_CATEGORIES, rupeesToPaise } from '@fdl/shared';
import { api } from '@/lib/api';
import { storageCache } from '@/lib/storage-cache';
import StatementUploadModal from '@/components/StatementUploadModal';
import RecategorizeModal from '@/components/RecategorizeModal';
import CorrectionHistoryDrawer from '@/components/CorrectionHistoryDrawer';

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
  hidden: { opacity: 0, y: 10 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.3 }
  },
};

interface SortableHeaderProps {
  label: string;
  columnKey: string;
  currentSortBy: string;
  currentSortOrder: 'asc' | 'desc';
  onSort: (col: string) => void;
  alignRight?: boolean;
}

function SortableHeader({
  label,
  columnKey,
  currentSortBy,
  currentSortOrder,
  onSort,
  alignRight = false,
}: SortableHeaderProps) {
  const isActive = currentSortBy === columnKey;

  return (
    <th className={`py-3 px-4 font-semibold select-none ${alignRight ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={`group inline-flex items-center gap-1.5 hover:text-foreground transition ${
          isActive ? 'text-primary font-bold' : 'text-muted-foreground'
        } ${alignRight ? 'ml-auto' : ''}`}
        title={`Sort by ${label} (${isActive && currentSortOrder === 'asc' ? 'Descending' : 'Ascending'})`}
      >
        <span>{label}</span>
        <span className="p-0.5 rounded transition">
          {isActive ? (
            currentSortOrder === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-primary" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-primary" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition" />
          )}
        </span>
      </button>
    </th>
  );
}

export default function TransactionsPage() {
  const [txns, setTxns] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Sorting state
  const [sortBy, setSortBy] = useState<string>('posted_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'credits' | 'debits' | 'transfers'
  const [accountId, setAccountId] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [channel, setChannel] = useState('all');
  const [timeframe, setTimeframe] = useState('all'); // 'all' | '30d' | '3m' | '6m' | '1y' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Accounts state
  const [accounts, setAccounts] = useState<any[]>([]);

  // Modals and notifications
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [recategorizeTxn, setRecategorizeTxn] = useState<any | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [toast, setToast] = useState<{
    logId: string;
    affectedCount: number;
    categoryName: string;
    merchant: string;
  } | null>(null);
  const [undoLoading, setUndoLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await api.getUserAccounts();
        if (Array.isArray(res)) {
          setAccounts(res);
        }
      } catch (err) {
        console.warn('Failed to load accounts for filter:', err);
      }
    }
    loadAccounts();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Auto-dismiss toast after 12 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 12000);
    return () => clearTimeout(timer);
  }, [toast]);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [notification]);

  // Instant hydration from IndexedDB cache on initial mount
  useEffect(() => {
    let active = true;
    async function hydrateCache() {
      try {
        const cached = await storageCache.getTransactions({
          limit: pageSize,
          offset: 0,
          sort_by: sortBy,
          sort_order: sortOrder,
        });
        if (cached && active && txns.length === 0) {
          setTxns(cached.transactions || []);
          setTotalCount(cached.total ?? 0);
          setLoading(false);
        }
      } catch {}
    }
    hydrateCache();
    return () => {
      active = false;
    };
  }, []);

  const loadTransactions = useCallback(async (options?: { bypassCache?: boolean }) => {
    // If not bypassing and we already have cached data, don't show full-page skeleton
    if (options?.bypassCache || txns.length === 0) {
      setLoading(true);
    }
    try {
      const offset = (currentPage - 1) * pageSize;
      const params: Record<string, any> = {
        limit: pageSize,
        offset,
        sort_by: sortBy,
        sort_order: sortOrder,
      };

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      if (filterType === 'credits') {
        params.type = 'credit';
      } else if (filterType === 'debits') {
        params.type = 'debit';
      } else if (filterType === 'transfers') {
        params.is_transfer = true;
      }

      if (accountId !== 'all') {
        params.account_id = accountId;
      }

      if (categoryId !== 'all') {
        params.category_id = categoryId;
      }

      if (channel !== 'all') {
        params.channel = channel;
      }

      // Date timeframe handling
      if (timeframe === 'custom') {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      } else if (timeframe === '30d') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        params.start_date = d.toISOString().split('T')[0];
      } else if (timeframe === '3m') {
        params.months = 3;
      } else if (timeframe === '6m') {
        params.months = 6;
      } else if (timeframe === '1y') {
        params.months = 12;
      }

      // Amount handling (₹ to integer paise)
      if (minAmount.trim() && !isNaN(Number(minAmount))) {
        params.min_amount_paise = rupeesToPaise(Number(minAmount));
      }
      if (maxAmount.trim() && !isNaN(Number(maxAmount))) {
        params.max_amount_paise = rupeesToPaise(Number(maxAmount));
      }

      const res = await api.getTransactions(params, options);
      setTxns(res?.transactions || []);
      setTotalCount(res?.total ?? 0);
    } catch (e) {
      console.error('Failed to load transactions:', e);
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    debouncedSearch,
    filterType,
    accountId,
    categoryId,
    channel,
    timeframe,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    txns.length,
  ]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function getCategoryName(catId?: string) {
    if (!catId) return 'Uncategorized';
    const found = DEFAULT_CATEGORIES.find((c) => c.id === catId);
    return found ? found.name : catId.replace('cat_', '').replace(/_/g, ' ');
  }

  function handleRecategorizeSuccess(result: {
    log_id: string;
    affected_count: number;
    new_category_id: string;
    previous_category_id: string;
    merchant: string;
  }) {
    setToast({
      logId: result.log_id,
      affectedCount: result.affected_count,
      categoryName: getCategoryName(result.new_category_id),
      merchant: result.merchant,
    });
    loadTransactions();
  }

  async function handleQuickUndo(logId: string) {
    setUndoLoading(true);
    try {
      const res = await api.undoCategoryCorrection(logId);
      setToast(null);
      setNotification(
        `Successfully restored ${res.reverted_transactions_count || 'affected'} transaction(s) back to original category.`
      );
      loadTransactions();
    } catch (err: any) {
      console.error('Undo failed:', err);
      setNotification('Failed to undo correction. Please try again.');
    } finally {
      setUndoLoading(false);
    }
  }

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      if (['posted_date', 'amount', 'balance'].includes(columnKey)) {
        setSortOrder('desc');
      } else {
        setSortOrder('asc');
      }
    }
    setCurrentPage(1);
  };

  const handleFilterTypeChange = (type: string) => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handleClearAllFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setFilterType('all');
    setAccountId('all');
    setCategoryId('all');
    setChannel('all');
    setTimeframe('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
    setSortBy('posted_date');
    setSortOrder('desc');
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // Count active advanced filters
  const activeAdvancedCount = useMemo(() => {
    let count = 0;
    if (accountId !== 'all') count++;
    if (categoryId !== 'all') count++;
    if (channel !== 'all') count++;
    if (timeframe !== 'all') count++;
    if (startDate || endDate) count++;
    if (minAmount.trim() || maxAmount.trim()) count++;
    return count;
  }, [accountId, categoryId, channel, timeframe, startDate, endDate, minAmount, maxAmount]);

  const hasAnyFilterActive = 
    debouncedSearch.trim() !== '' ||
    filterType !== 'all' ||
    activeAdvancedCount > 0 ||
    sortBy !== 'posted_date' ||
    sortOrder !== 'desc';

  // Grouped categories for filter dropdown
  const groupedCategories = useMemo(() => {
    return {
      income: DEFAULT_CATEGORIES.filter((c) => c.kind === 'income'),
      essential: DEFAULT_CATEGORIES.filter((c) => c.kind === 'essential'),
      committed: DEFAULT_CATEGORIES.filter((c) => c.kind === 'committed'),
      discretionary: DEFAULT_CATEGORIES.filter((c) => c.kind === 'discretionary'),
      system: DEFAULT_CATEGORIES.filter((c) => c.kind === 'system'),
    };
  }, []);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-6 max-w-7xl mx-auto text-foreground relative"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Transactions Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse normalized bank transactions, internal transfers, and adjust categories with merchant-wide sync & undo.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadTransactions({ bypassCache: true })}
            title="Force refresh transactions from server"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <History className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Correction History</span>
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold shadow-xs transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Statement</span>
          </button>
        </div>
      </motion.div>

      {/* General Notification Banner */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-muted-foreground hover:text-foreground p-1 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <motion.div variants={itemVariants} className="space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by merchant, UPI handle, or category..."
              className="w-full bg-input border border-border rounded-xl pl-10 pr-9 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Type Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'credits', label: 'Credits (+)' },
              { id: 'debits', label: 'Debits (-)' },
              { id: 'transfers', label: 'Transfers' },
            ].map((t) => (
              <motion.button
                key={t.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleFilterTypeChange(t.id)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl capitalize transition whitespace-nowrap shadow-sm ${
                  filterType === t.id
                    ? 'bg-primary text-primary-foreground font-bold'
                    : 'bg-card text-muted-foreground border border-border hover:text-foreground'
                }`}
              >
                {t.label}
              </motion.button>
            ))}

            {/* Toggle Advanced Filters Button */}
            <button
              type="button"
              onClick={() => setIsAdvancedOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition shadow-sm whitespace-nowrap ${
                isAdvancedOpen || activeAdvancedCount > 0
                  ? 'bg-primary/10 border-primary/40 text-primary font-bold'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters</span>
              {activeAdvancedCount > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                  {activeAdvancedCount}
                </span>
              )}
            </button>

            {/* Clear All Reset Button */}
            {hasAnyFilterActive && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition shadow-sm whitespace-nowrap"
                title="Reset all filters and sorting"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Expandable Advanced Filter Panel */}
        <AnimatePresence>
          {isAdvancedOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">Advanced Filters</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAdvancedOpen(false)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded"
                    title="Close filters"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                  {/* Account Filter */}
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Account</span>
                    </label>
                    <select
                      value={accountId}
                      onChange={(e) => {
                        setAccountId(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-input border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans cursor-pointer"
                    >
                      <option value="all">All Linked Accounts</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.bank} ({a.masked_last4 ? `••••${a.masked_last4}` : a.nickname || 'Acct'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Category</span>
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => {
                        setCategoryId(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-input border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans cursor-pointer"
                    >
                      <option value="all">All Categories</option>
                      <optgroup label="Income">
                        {groupedCategories.income.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Living Essentials">
                        {groupedCategories.essential.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Committed Obligations">
                        {groupedCategories.committed.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Discretionary & Lifestyle">
                        {groupedCategories.discretionary.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="System / Other">
                        {groupedCategories.system.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                        <option value="cat_uncategorized">Uncategorized</option>
                      </optgroup>
                    </select>
                  </div>

                  {/* Channel Filter */}
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Payment Channel</span>
                    </label>
                    <select
                      value={channel}
                      onChange={(e) => {
                        setChannel(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-input border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans cursor-pointer"
                    >
                      <option value="all">All Channels</option>
                      <option value="UPI">UPI</option>
                      <option value="POS">POS / Card</option>
                      <option value="NEFT">NEFT / RTGS</option>
                      <option value="ACH">ACH / Auto-Debit</option>
                      <option value="OTHER">Other / Cash</option>
                    </select>
                  </div>

                  {/* Timeframe Presets */}
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground font-medium flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Timeframe</span>
                    </label>
                    <select
                      value={timeframe}
                      onChange={(e) => {
                        setTimeframe(e.target.value);
                        if (e.target.value !== 'custom') {
                          setStartDate('');
                          setEndDate('');
                        }
                        setCurrentPage(1);
                      }}
                      className="w-full bg-input border border-border rounded-lg px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans cursor-pointer"
                    >
                      <option value="all">All Time</option>
                      <option value="30d">Last 30 Days</option>
                      <option value="3m">Last 3 Months</option>
                      <option value="6m">Last 6 Months</option>
                      <option value="1y">Last 1 Year</option>
                      <option value="custom">Custom Date Range</option>
                    </select>
                  </div>
                </div>

                {/* Custom Date Range Pickers (shown only if timeframe === 'custom') */}
                {timeframe === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-muted-foreground text-xs font-medium">Start Date (YYYY-MM-DD)</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-muted-foreground text-xs font-medium">End Date (YYYY-MM-DD)</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-input border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    </div>
                  </div>
                )}

                {/* Amount Range Filter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-xs font-medium flex items-center gap-1">
                      <span>Min Absolute Amount (₹)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-xs font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 500"
                        value={minAmount}
                        onChange={(e) => {
                          setMinAmount(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-input border border-border rounded-lg pl-7 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-muted-foreground text-xs font-medium flex items-center gap-1">
                      <span>Max Absolute Amount (₹)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-muted-foreground text-xs font-bold">₹</span>
                      <input
                        type="number"
                        min="0"
                        placeholder="e.g. 50,000"
                        value={maxAmount}
                        onChange={(e) => {
                          setMaxAmount(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full bg-input border border-border rounded-lg pl-7 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filter Chips Row */}
        {hasAnyFilterActive && (
          <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
            <span className="text-[11px] text-muted-foreground font-semibold">Active filters:</span>

            {debouncedSearch.trim() && (
              <span className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/25 text-foreground px-2.5 py-0.5 rounded-lg text-[11px]">
                <span>Search: "{debouncedSearch}"</span>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDebouncedSearch('');
                    setCurrentPage(1);
                  }}
                  className="hover:text-primary transition p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterType !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-card border border-border text-foreground px-2.5 py-0.5 rounded-lg text-[11px]">
                <span className="capitalize">{filterType}</span>
                <button
                  onClick={() => {
                    setFilterType('all');
                    setCurrentPage(1);
                  }}
                  className="hover:text-primary transition p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {accountId !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-card border border-border text-foreground px-2.5 py-0.5 rounded-lg text-[11px]">
                <span>
                  Account: {accounts.find((a) => a.id === accountId)?.bank || 'Selected'}
                </span>
                <button
                  onClick={() => {
                    setAccountId('all');
                    setCurrentPage(1);
                  }}
                  className="hover:text-primary transition p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {categoryId !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-card border border-border text-foreground px-2.5 py-0.5 rounded-lg text-[11px]">
                <span>Category: {getCategoryName(categoryId)}</span>
                <button
                  onClick={() => {
                    setCategoryId('all');
                    setCurrentPage(1);
                  }}
                  className="hover:text-primary transition p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {channel !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-card border border-border text-foreground px-2.5 py-0.5 rounded-lg text-[11px]">
                <span>Channel: {channel}</span>
                <button
                  onClick={() => {
                    setChannel('all');
                    setCurrentPage(1);
                  }}
                  className="hover:text-primary transition p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {timeframe !== 'all' && (
              <span className="inline-flex items-center gap-1.5 bg-card border border-border text-foreground px-2.5 py-0.5 rounded-lg text-[11px]">
                <span>
                  Time: {
                    timeframe === '30d' ? 'Last 30 Days' :
                    timeframe === '3m' ? 'Last 3 Months' :
                    timeframe === '6m' ? 'Last 6 Months' :
                    timeframe === '1y' ? 'Last 1 Year' :
                    `${startDate || '...'} to ${endDate || '...'}`
                  }
                </span>
                <button
                  onClick={() => {
                    setTimeframe('all');
                    setStartDate('');
                    setEndDate('');
                    setCurrentPage(1);
                  }}
                  className="hover:text-primary transition p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(minAmount.trim() || maxAmount.trim()) && (
              <span className="inline-flex items-center gap-1.5 bg-card border border-border text-foreground px-2.5 py-0.5 rounded-lg text-[11px]">
                <span>
                  Amount: ₹{minAmount || '0'} – {maxAmount ? `₹${maxAmount}` : '∞'}
                </span>
                <button
                  onClick={() => {
                    setMinAmount('');
                    setMaxAmount('');
                    setCurrentPage(1);
                  }}
                  className="hover:text-primary transition p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {(sortBy !== 'posted_date' || sortOrder !== 'desc') && (
              <span className="inline-flex items-center gap-1.5 bg-card border border-border text-foreground px-2.5 py-0.5 rounded-lg text-[11px]">
                <span>Sorted by: {sortBy} ({sortOrder})</span>
                <button
                  onClick={() => {
                    setSortBy('posted_date');
                    setSortOrder('desc');
                    setCurrentPage(1);
                  }}
                  className="hover:text-primary transition p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-primary hover:underline text-[11px] font-semibold ml-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </motion.div>

      {/* Transactions Table */}
      <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted border-b border-border text-muted-foreground">
                <SortableHeader
                  label="Date"
                  columnKey="posted_date"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Description"
                  columnKey="description"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Channel"
                  columnKey="channel"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Category (Click to change)"
                  columnKey="category_id"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Amount"
                  columnKey="amount"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                  alignRight
                />
                <SortableHeader
                  label="Balance After"
                  columnKey="balance"
                  currentSortBy={sortBy}
                  currentSortOrder={sortOrder}
                  onSort={handleSort}
                  alignRight
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {loading ? (
                // Skeleton loading rows
                Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="animate-pulse">
                    <td className="py-3 px-4">
                      <div className="h-4 bg-muted rounded w-20"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-muted rounded w-48 mb-1.5"></div>
                      <div className="h-3 bg-muted/60 rounded w-32"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-4 bg-muted rounded w-14"></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="h-6 bg-muted rounded w-28"></div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-4 bg-muted rounded w-20 ml-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-4 bg-muted rounded w-20 ml-auto"></div>
                    </td>
                  </tr>
                ))
              ) : txns.length > 0 ? (
                txns.map((t) => (
                  <motion.tr 
                    key={t.id} 
                    whileHover={{ backgroundColor: 'var(--muted)' }}
                    transition={{ duration: 0.15 }}
                    className="transition-colors group/row"
                  >
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">{t.posted_date}</td>
                    <td className="py-3 px-4 font-sans text-foreground">
                      <p className="font-semibold text-xs">{t.normalized_description || t.raw_description}</p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-md">{t.raw_description}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded text-[10px] font-semibold">
                        {t.channel || 'OTHER'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {/* Interactive Category Re-assignment Trigger */}
                      <button
                        type="button"
                        onClick={() => setRecategorizeTxn(t)}
                        className="group inline-flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-foreground border border-primary/25 hover:border-primary/50 px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition cursor-pointer shadow-2xs"
                        title="Click to edit category and sync across merchant"
                      >
                        <Tag className="w-3 h-3 text-primary shrink-0 opacity-80 group-hover:opacity-100" />
                        <span>{getCategoryName(t.category_id)}</span>
                        <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-90 transition text-muted-foreground ml-0.5" />
                      </button>
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${
                      t.amount_minor > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                    }`}>
                      {t.amount_minor > 0 ? '+' : ''}{formatINR(t.amount_minor)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted-foreground">
                      {t.balance_after_minor ? formatINR(t.balance_after_minor) : '—'}
                    </td>
                  </motion.tr>
                ))
              ) : (
                // Empty state
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <div className="p-3 bg-muted/60 border border-border rounded-2xl text-muted-foreground">
                        <Inbox className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-foreground">No transactions found</p>
                      <p className="text-xs text-muted-foreground">
                        No transactions match your search query or filter criteria. Try clearing some filters.
                      </p>
                      {hasAnyFilterActive && (
                        <button
                          type="button"
                          onClick={handleClearAllFilters}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-card hover:bg-muted text-foreground border border-border text-xs font-semibold shadow-xs transition flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>Clear All Filters</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer Bar */}
        <div className="p-4 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Row count and rows-per-page selector */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-input border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              {totalCount > 0 ? (
                <>
                  Showing <span className="font-bold text-foreground">{(currentPage - 1) * pageSize + 1}</span>–
                  <span className="font-bold text-foreground">{Math.min(currentPage * pageSize, totalCount)}</span> of{' '}
                  <span className="font-bold text-foreground">{totalCount.toLocaleString()}</span>
                </>
              ) : (
                '0 transactions'
              )}
            </div>
          </div>

          {/* Right: Navigation controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage <= 1 || loading}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="px-3 py-1 text-xs font-mono font-semibold text-foreground border border-border bg-muted rounded-lg select-none">
              Page {currentPage} of {totalPages}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || loading}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages || loading}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Floating Undo Notification Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-40 max-w-md w-full bg-card border border-border shadow-2xl rounded-2xl p-4 flex items-center justify-between gap-3 text-card-foreground ring-1 ring-border"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-foreground">
                  Updated {toast.affectedCount} transaction{toast.affectedCount !== 1 ? 's' : ''}
                </p>
                <p className="text-muted-foreground mt-0.5">
                  Set to <strong className="text-foreground">{toast.categoryName}</strong> for "{toast.merchant}".
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleQuickUndo(toast.logId)}
                disabled={undoLoading}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition flex items-center gap-1 shadow-xs disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${undoLoading ? 'animate-spin' : ''}`} />
                <span>{undoLoading ? 'Undoing...' : 'Undo'}</span>
              </button>

              <button
                type="button"
                onClick={() => setToast(null)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recategorization Modal */}
      <RecategorizeModal
        isOpen={Boolean(recategorizeTxn)}
        transaction={recategorizeTxn}
        onClose={() => setRecategorizeTxn(null)}
        onSuccess={handleRecategorizeSuccess}
      />

      {/* Correction History Drawer */}
      <CorrectionHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onUndoSuccess={(res) => {
          setNotification(
            `Restored ${res.reverted_transactions_count || 'affected'} transaction(s) back to original category.`
          );
          loadTransactions();
        }}
      />

      {/* Upload Modal */}
      <StatementUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => loadTransactions()}
      />
    </motion.div>
  );
}
