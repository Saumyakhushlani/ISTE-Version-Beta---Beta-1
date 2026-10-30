'use client';

import React, { useState, useEffect } from 'react';
import { Search, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Filter } from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

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
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Transactions Explorer</h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse normalized bank transactions, internal transfers, and category assignments.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          Showing {filtered.length} of {txns.length} records
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by merchant, UPI handle, or category..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'credits', 'debits', 'transfers'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 text-xs font-semibold rounded-xl capitalize transition ${
                filterType === type
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-medium">Date</th>
                <th className="py-3 px-4 font-medium">Description</th>
                <th className="py-3 px-4 font-medium">Channel</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium text-right">Amount</th>
                <th className="py-3 px-4 font-medium text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-950/40 transition">
                  <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{t.posted_date}</td>
                  <td className="py-3 px-4 font-sans text-slate-200">
                    <p className="font-medium text-sm">{t.normalized_description || t.raw_description}</p>
                    <p className="text-xs text-slate-500 truncate max-w-md">{t.raw_description}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      {t.channel || 'OTHER'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-sans">
                    {t.is_transfer ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800 flex items-center gap-1 w-fit">
                        <ArrowLeftRight className="w-3 h-3" />
                        Internal Transfer
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
                        {t.category_id?.replace('cat_', '').replace('_', ' ') || 'uncategorized'}
                      </span>
                    )}
                  </td>
                  <td className={`py-3 px-4 text-right font-bold text-sm whitespace-nowrap ${
                    t.amount_minor > 0 ? 'text-emerald-400' : 'text-slate-100'
                  }`}>
                    {t.amount_minor > 0 ? '+' : ''}{formatINR(t.amount_minor)}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-400 whitespace-nowrap">
                    {t.balance_after_minor != null ? formatINR(t.balance_after_minor) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
