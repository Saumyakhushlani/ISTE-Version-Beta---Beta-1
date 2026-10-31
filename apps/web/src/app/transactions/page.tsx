'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Search, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Filter, Upload } from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';
import StatementUploadModal from '@/components/StatementUploadModal';

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

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    setLoading(true);
    try {
      const res = await api.getTransactions(200, 0);
      setTxns(res?.transactions || []);
    } catch (e) {
      console.error('Failed to load transactions:', e);
    } finally {
      setLoading(false);
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
      className="p-6 space-y-6 max-w-7xl mx-auto text-foreground"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Transactions Explorer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse normalized bank transactions, internal transfers, and category assignments.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
                <th className="py-3 px-4 font-semibold">Category</th>
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
                  className="transition-colors"
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
                    <span className="inline-block bg-primary/10 text-foreground border border-primary/20 px-2 py-0.5 rounded text-[11px] font-medium capitalize">
                      {t.category_id?.replace('cat_', '').replace('_', ' ') || 'uncategorized'}
                    </span>
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

      {/* Upload Modal */}
      <StatementUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => loadTransactions()}
      />
    </motion.div>
  );
}
