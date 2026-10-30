'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  ArrowDownRight, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Filter, 
  Tag, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  X,
  RefreshCw,
  Building2,
  ChevronDown
} from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

const CATEGORIES = [
  { id: 'cat_rent', label: 'Rent' },
  { id: 'cat_groceries', label: 'Groceries' },
  { id: 'cat_food_dining', label: 'Food & Dining' },
  { id: 'cat_shopping', label: 'Shopping' },
  { id: 'cat_utilities', label: 'Utilities' },
  { id: 'cat_emi', label: 'EMI / Loan' },
  { id: 'cat_insurance', label: 'Insurance' },
  { id: 'cat_sip', label: 'SIP / Investment' },
  { id: 'cat_subscriptions', label: 'Subscriptions' },
  { id: 'cat_transport', label: 'Transport' },
  { id: 'cat_health', label: 'Health' },
  { id: 'cat_education', label: 'Education' },
  { id: 'cat_uncategorized', label: 'Uncategorized' },
];

export default function TransactionsPage() {
  const [txns, setTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Inline Category Edit Modal
  const [editingTxn, setEditingTxn] = useState<any>(null);
  const [newCategory, setNewCategory] = useState('');
  const [applyToMerchant, setApplyToMerchant] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);

  // Undo Notification Banner State
  const [lastCorrection, setLastCorrection] = useState<any>(null);
  const [undoing, setUndoing] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
    loadLatestCorrections();
  }, []);

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

  async function loadLatestCorrections() {
    try {
      const res = await api.getTransactionCorrections(5);
      if (res?.corrections && res.corrections.length > 0) {
        setLastCorrection(res.corrections[0]);
      }
    } catch (e) {
      // Non-blocking
    }
  }

  async function handleSaveCategory() {
    if (!editingTxn || !newCategory) return;
    setSavingCategory(true);
    try {
      const res = await api.updateTransactionCategory(
        editingTxn.id, 
        newCategory, 
        applyToMerchant
      );
      setLastCorrection(res.correction);
      setBannerMessage(
        `Categorized as "${newCategory.replace('cat_', '').replace('_', ' ')}"${
          applyToMerchant ? ' across all matching merchant records' : ''
        }.`
      );
      setEditingTxn(null);
      await loadTransactions();
    } catch (err: any) {
      alert(`Failed to update category: ${err.message}`);
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleUndoCorrection() {
    if (!lastCorrection?.id) return;
    setUndoing(true);
    try {
      await api.undoTransactionCorrection(lastCorrection.id);
      setBannerMessage('Category correction successfully rolled back.');
      setLastCorrection(null);
      await loadTransactions();
    } catch (err: any) {
      alert(`Failed to undo: ${err.message}`);
    } finally {
      setUndoing(false);
    }
  }

  const filtered = txns.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      t.raw_description?.toLowerCase().includes(term) ||
      t.normalized_description?.toLowerCase().includes(term) ||
      t.category_id?.toLowerCase().includes(term);
    
    let matchesType = true;
    if (filterType === 'credits') matchesType = t.amount_minor > 0 && !t.is_transfer;
    if (filterType === 'debits') matchesType = t.amount_minor < 0 && !t.is_transfer;
    if (filterType === 'transfers') matchesType = t.is_transfer;

    let matchesCategory = true;
    if (selectedCategory !== 'all') {
      matchesCategory = t.category_id === selectedCategory;
    }

    return matchesSearch && matchesType && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              Transactions Explorer
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-slate-900 border border-slate-700/80 text-emerald-400 font-mono">
              AUDITED LOG
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Browse normalized bank statements, internal transfers, and adjust machine-learning category assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            Showing {filtered.length} of {txns.length} records
          </span>
          <button
            onClick={loadTransactions}
            title="Refresh Transactions"
            className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Undo Action Banner */}
      <AnimatePresence>
        {(bannerMessage || lastCorrection) && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-2.5 text-xs text-slate-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{bannerMessage || `Recent correction logged for merchant.`}</span>
            </div>
            {lastCorrection && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndoCorrection}
                  disabled={undoing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-900/40 transition cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${undoing ? 'animate-spin' : ''}`} />
                  {undoing ? 'Reverting...' : 'Undo Correction'}
                </button>
                <button
                  onClick={() => { setBannerMessage(null); setLastCorrection(null); }}
                  className="text-slate-400 hover:text-slate-200 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by merchant, UPI handle, or raw bank narrative..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        {/* Type Filter Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'All' },
            { id: 'credits', label: 'Credits (Income)' },
            { id: 'debits', label: 'Debits (Spend)' },
            { id: 'transfers', label: 'Transfers' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition border cursor-pointer ${
                filterType === type.id
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Category Dropdown Filter */}
        <div className="min-w-[180px]">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Merchant / Narration</th>
                <th className="py-3 px-4 font-semibold">Channel</th>
                <th className="py-3 px-4 font-semibold">Category (Click to Edit)</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Cleared Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-sans text-sm">
                    No transactions matched your search or filters.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-950/50 transition">
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{t.posted_date}</td>
                    
                    {/* Merchant & Narration */}
                    <td className="py-3.5 px-4 font-sans text-slate-200 max-w-sm">
                      <p className="font-semibold text-xs sm:text-sm text-slate-100 truncate">
                        {t.normalized_description || t.raw_description}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5" title={t.raw_description}>
                        {t.raw_description}
                      </p>
                    </td>

                    {/* Channel */}
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] bg-slate-950 border border-slate-800 text-slate-300 font-mono">
                        {t.channel || 'OTHER'}
                      </span>
                    </td>

                    {/* Category Pill with Edit Trigger */}
                    <td className="py-3.5 px-4 font-sans">
                      {t.is_transfer ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800 flex items-center gap-1 w-fit">
                          <ArrowLeftRight className="w-3 h-3" />
                          Internal Transfer
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTxn(t);
                            setNewCategory(t.category_id || 'cat_uncategorized');
                          }}
                          className="group inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-950 border border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white transition cursor-pointer"
                        >
                          <Tag className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 transition" />
                          <span>{t.category_id?.replace('cat_', '').replace('_', ' ') || 'uncategorized'}</span>
                        </button>
                      )}
                    </td>

                    {/* Amount */}
                    <td className={`py-3.5 px-4 text-right font-bold text-xs sm:text-sm whitespace-nowrap ${
                      t.amount_minor > 0 ? 'text-emerald-400' : 'text-slate-100'
                    }`}>
                      {t.amount_minor > 0 ? '+' : ''}{formatINR(t.amount_minor)}
                    </td>

                    {/* Balance After */}
                    <td className="py-3.5 px-4 text-right text-slate-400 whitespace-nowrap">
                      {t.balance_after_minor != null ? formatINR(t.balance_after_minor) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Correction Modal */}
      <AnimatePresence>
        {editingTxn && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-400" />
                  Override Category
                </h3>
                <button
                  onClick={() => setEditingTxn(null)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <p className="text-xs text-slate-400">Transaction:</p>
                <p className="text-sm font-semibold text-slate-200 mt-0.5">
                  {editingTxn.normalized_description || editingTxn.raw_description}
                </p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Amount: {formatINR(editingTxn.amount_minor)} • Date: {editingTxn.posted_date}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Select New Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={applyToMerchant}
                    onChange={(e) => setApplyToMerchant(e.target.checked)}
                    className="mt-0.5 rounded border-slate-800 bg-slate-950 text-emerald-600 focus:ring-0"
                  />
                  <span>
                    Apply to all past and future transactions for this merchant name
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTxn(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategory}
                  disabled={savingCategory}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-xs transition shadow-lg shadow-emerald-950/40 cursor-pointer flex items-center gap-1.5"
                >
                  {savingCategory ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Correction'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
