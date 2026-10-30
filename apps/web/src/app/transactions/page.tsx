'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Search, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Filter } from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

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
      className="p-6 space-y-6 max-w-7xl mx-auto"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transactions Explorer</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse normalized bank transactions, internal transfers, and category assignments.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-mono bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
          Showing <span className="font-bold text-slate-800">{filtered.length}</span> of {txns.length} records
        </div>
      </motion.div>

      {/* Filter and Search Bar */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by merchant, UPI handle, or category..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 shadow-sm"
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
              }`}
            >
              {type}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Transactions Table */}
      <motion.div variants={itemVariants} className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold">Channel</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold text-right">Amount</th>
                <th className="py-3 px-4 font-semibold text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filtered.map((t) => (
                <motion.tr 
                  key={t.id} 
                  whileHover={{ backgroundColor: 'rgba(248, 250, 252, 0.9)' }}
                  transition={{ duration: 0.15 }}
                  className="transition-colors"
                >
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{t.posted_date}</td>
                  <td className="py-3 px-4 font-sans text-slate-800">
                    <p className="font-semibold text-xs">{t.normalized_description || t.raw_description}</p>
                    <p className="text-[11px] text-slate-400 truncate max-w-md">{t.raw_description}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {t.channel || 'OTHER'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    {t.is_transfer ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1 w-fit">
                        <ArrowLeftRight className="w-3 h-3" />
                        Internal Transfer
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                        {t.category_id?.replace('cat_', '').replace('_', ' ') || 'uncategorized'}
                      </span>
                    )}
                  </td>
                  <td className={`py-3 px-4 text-right font-bold text-xs whitespace-nowrap ${
                    t.amount_minor > 0 ? 'text-emerald-600' : 'text-slate-900'
                  }`}>
                    {t.amount_minor > 0 ? '+' : ''}{formatINR(t.amount_minor)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                    {t.balance_after_minor != null ? formatINR(t.balance_after_minor) : '—'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
