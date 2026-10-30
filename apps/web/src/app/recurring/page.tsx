'use client';

import React, { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Calendar, Repeat, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.35 }
  },
};

export default function RecurringPage() {
  const [items, setItems] = useState<any[]>([]);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [recRes, upRes] = await Promise.all([
        api.getRecurringItems().catch(() => ({ recurring_items: [] })),
        api.getUpcomingSchedule(45).catch(() => ({ upcoming_payments: [] })),
      ]);
      setItems(recRes?.recurring_items || []);
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

  const committedMonthly = items
    .filter((i) => i.type !== 'salary')
    .reduce((sum, i) => sum + getItemAmount(i), 0);

  const salaryExpected = items
    .filter((i) => i.type === 'salary')
    .reduce((sum, i) => sum + getItemAmount(i), 0);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-8 max-w-7xl mx-auto"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscriptions & Recurring Commitments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Automatically detected recurring obligations: EMIs, rent, utilities, insurance, SIPs, and subscriptions.
        </p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm"
        >
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Monthly Commitments</span>
          <p className="text-3xl font-extrabold text-rose-600 mt-2 tracking-tight">
            -{formatINR(committedMonthly)}
          </p>
          <p className="text-xs text-slate-400 mt-2">Rent, EMIs, Subscriptions, and SIPs</p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm"
        >
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expected Monthly Income</span>
          <p className="text-3xl font-extrabold text-emerald-600 mt-2 tracking-tight">
            +{formatINR(salaryExpected)}
          </p>
          <p className="text-xs text-slate-400 mt-2">Salary credits detected</p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm"
        >
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Recurring Tracks</span>
          <p className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
            {items.length}
          </p>
          <p className="text-xs text-slate-400 mt-2">Grouped by merchant cadence</p>
        </motion.div>
      </motion.div>

      {/* Recurring Items Grid */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <motion.div 
            key={item.id} 
            variants={itemVariants}
            whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
            transition={{ duration: 0.2 }}
            className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  item.type === 'salary' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  item.type === 'emi' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                  item.type === 'rent' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {item.type}
                </span>

                <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {item.cadence}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-3">{item.merchant}</h3>
              <p className="text-2xl font-extrabold text-slate-900 mt-1 font-mono tracking-tight">
                {formatINR(getItemAmount(item))}
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Next Expected: <strong className="text-slate-800">{item.next_expected_date}</strong></span>
              <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-semibold">
                {((item.confidence || 0.9) * 100).toFixed(0)}% score
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
