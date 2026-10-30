'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Repeat, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  TrendingDown, 
  TrendingUp, 
  Layers, 
  RefreshCw,
  Wallet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

export default function RecurringPage() {
  const [items, setItems] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [recRes, upRes] = await Promise.all([
        api.getRecurringItems().catch(() => ({ recurring_items: [] })),
        api.getUpcomingSchedule(45).catch(() => ({ schedule: [] })),
      ]);
      setItems(recRes?.recurring_items || []);
      setUpcoming(upRes?.schedule || []);
    } catch (e) {
      console.error('Failed to load recurring data:', e);
    } finally {
      setLoading(false);
    }
  }

  const committedMonthly = items
    .filter((i) => i.type !== 'salary' && (i.amount_minor < 0 || i.typical_amount_minor > 0))
    .reduce((sum, i) => sum + (i.typical_amount_minor || 0), 0);

  const salaryExpected = items
    .filter((i) => i.type === 'salary')
    .reduce((sum, i) => sum + (i.typical_amount_minor || 0), 0);

  const netMonthlyRecurring = salaryExpected - committedMonthly;

  // Aggregate monthly calendar day of month distribution (Day 1 - 31)
  const dayDistribution = Array.from({ length: 31 }, (_, i) => ({
    day: `${i + 1}`,
    amountRs: 0,
    merchants: [] as string[],
  }));

  items.forEach((item) => {
    if (item.type === 'salary') return;
    let day = 1;
    if (item.next_expected_date) {
      day = parseInt(item.next_expected_date.slice(8, 10), 10) || 1;
    }
    const idx = Math.min(30, Math.max(0, day - 1));
    dayDistribution[idx].amountRs += Math.round((item.typical_amount_minor || 0) / 100);
    dayDistribution[idx].merchants.push(item.merchant);
  });

  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    if (filterType === 'emi') return item.type === 'emi' || item.type === 'loan';
    if (filterType === 'subs') return item.type === 'subscription' || item.type === 'utilities' || item.type === 'rent';
    if (filterType === 'sip') return item.type === 'sip' || item.type === 'investment';
    if (filterType === 'salary') return item.type === 'salary';
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              Subscriptions & Recurring Commitments
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-slate-900 border border-slate-700/80 text-indigo-400 font-mono">
              CADENCE ENGINE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Automatically detected recurring obligations: EMIs, rent, utilities, insurance, SIPs, and subscriptions.
          </p>
        </div>
        <button
          onClick={loadData}
          title="Refresh Commitments"
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition w-fit"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Monthly Commitments */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Monthly Outflows
          </span>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-rose-400 mt-2 tracking-tight">
            -{formatINR(committedMonthly)}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Rent, EMIs, Subscriptions, and SIPs
          </p>
        </motion.div>

        {/* Expected Monthly Income */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Expected Monthly Income
          </span>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mt-2 tracking-tight">
            +{formatINR(salaryExpected)}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Verified recurring salary credits
          </p>
        </motion.div>

        {/* Net Free Recurring */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Net Recurring Cash Flow
          </span>
          <p className={`text-2xl sm:text-3xl font-bold font-mono mt-2 tracking-tight ${
            netMonthlyRecurring >= 0 ? 'text-indigo-400' : 'text-rose-400'
          }`}>
            {netMonthlyRecurring >= 0 ? '+' : ''}{formatINR(netMonthlyRecurring)}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Income minus fixed obligations
          </p>
        </motion.div>

        {/* Active Track Count */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active Tracked Commitments
          </span>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 mt-2 tracking-tight">
            {items.length}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Grouped by cadence & merchant
          </p>
        </motion.div>
      </div>

      {/* Calendar Day of Month Burn-Rate Distribution Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              Calendar Day-of-Month Outflow Distribution
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Identifies cash-flow pinch points across monthly calendar days (1st to 31st)
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Cycle: Day 1 — 31
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayDistribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis 
                dataKey="day" 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false} 
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={10} 
                tickLine={false}
                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#020617', 
                  borderColor: '#334155', 
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#f8fafc'
                }}
                formatter={(val: any, _, props: any) => [
                  `₹${Number(val).toLocaleString('en-IN')}`,
                  props?.payload?.merchants?.length ? props.payload.merchants.join(', ') : 'Deductions'
                ]}
              />
              <Bar dataKey="amountRs" fill="#f43f5e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
        {[
          { id: 'all', label: `All Commitments (${items.length})` },
          { id: 'emi', label: 'Loans & EMIs' },
          { id: 'subs', label: 'Subscriptions & Bills' },
          { id: 'sip', label: 'SIPs & Investments' },
          { id: 'salary', label: 'Income & Salary' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition border cursor-pointer ${
              filterType === tab.id
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Recurring Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm">
            No recurring commitments match the selected filter.
          </div>
        ) : (
          filteredItems.map((item) => (
            <motion.div 
              key={item.id} 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-lg"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono ${
                    item.type === 'salary' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    item.type === 'emi' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                    item.type === 'rent' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    item.type === 'sip' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                    'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {item.type}
                  </span>

                  <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {item.cadence}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-100 mt-3">{item.merchant}</h3>
                <p className={`text-2xl font-extrabold font-mono tracking-tight mt-1 ${
                  item.type === 'salary' ? 'text-emerald-400' : 'text-slate-100'
                }`}>
                  {item.type === 'salary' ? '+' : '-'}{formatINR(item.typical_amount_minor)}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span className="text-[11px]">
                  Next Due: <strong className="text-slate-200 font-mono">{item.next_expected_date || 'Projected'}</strong>
                </span>
                <span className="font-mono text-emerald-400 text-[11px] bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {Math.round((item.confidence || 0.95) * 100)}% score
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
