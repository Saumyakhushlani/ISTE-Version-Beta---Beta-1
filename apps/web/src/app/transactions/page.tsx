'use client';

import React, { useState, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { formatINR, DEFAULT_CATEGORIES } from '@fdl/shared';
import { api } from '@/lib/api';
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

export default function TransactionsPage() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Recategorization and History state
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

  useEffect(() => {
    loadTransactions();
  }, []);

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

  async function loadTransactions() {
    setLoading(true);
    try {
      const res = await api.getTransactions(250, 0);
      setTxns(res?.transactions || []);
    } catch (e) {
      console.error('Failed to load transactions:', e);
    } finally {
      setLoading(false);
    }
  }

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

  const filtered = txns.filter((t) => {
    const matchesSearch = 
      t.raw_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.normalized_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filterType === 'credits') return matchesSearch && t.amount_minor > 0;
    if (filterType === 'debits') return matchesSearch && t.amount_minor < 0;
    if (filterType === 'transfers') return matchesSearch && t.is_transfer;
    return matchesSearch;
  });

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
          
          <div className="text-xs text-muted-foreground font-mono bg-card border border-border px-3 py-1.5 rounded-lg shadow-sm">
            Showing <span className="font-bold text-foreground">{filtered.length}</span> of {txns.length} records
          </div>
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
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by merchant, UPI handle, or category..."
            className="w-full bg-input border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-sm"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'credits', 'debits', 'transfers'].map((type) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 text-xs font-bold rounded-xl capitalize transition shadow-sm ${
                filterType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground border border-border hover:text-foreground'
              }`}
            >
              {type}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Transactions Table */}
      <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-muted border-b border-border text-muted-foreground">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Channel</th>
                <th className="py-3 px-4 font-semibold">Category (Click to change)</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {filtered.map((t) => (
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
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    No transactions match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
