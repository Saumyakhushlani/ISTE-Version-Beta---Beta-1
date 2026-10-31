'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Calendar, Repeat, CheckCircle2, Clock, Sparkles, UploadCloud, RefreshCw } from 'lucide-react';
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
      className="p-6 space-y-8 max-w-7xl mx-auto text-foreground"
    >
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscriptions & Recurring Commitments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automatically detected recurring obligations: EMIs, rent, utilities, insurance, SIPs, and subscriptions.
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
            onClick={loadData}
            title="Refresh"
            className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-card border border-border rounded-xl p-5 shadow-sm text-card-foreground"
        >
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Monthly Commitments</span>
          <p className="text-3xl font-extrabold text-destructive mt-2 tracking-tight font-mono">
            {committedMonthly > 0 ? `-${formatINR(committedMonthly)}` : '₹0'}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-2">Rent, EMIs, Subscriptions, and SIPs</p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-card border border-border rounded-xl p-5 shadow-sm text-card-foreground"
        >
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Expected Monthly Income</span>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2 tracking-tight font-mono">
            {salaryExpected > 0 ? `+${formatINR(salaryExpected)}` : '₹0'}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-2">Salary credits detected</p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-card border border-border rounded-xl p-5 shadow-sm text-card-foreground"
        >
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Recurring Tracks</span>
          <p className="text-3xl font-extrabold text-foreground mt-2 tracking-tight font-mono">
            {items.length}
          </p>
          <p className="text-xs text-muted-foreground/80 mt-2">Grouped by merchant cadence</p>
        </motion.div>
      </motion.div>

      {/* Recurring Items Grid or Empty State */}
      {items.length === 0 && !loading ? (
        <motion.div variants={itemVariants} className="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl space-y-3">
          <Repeat className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h3 className="text-base font-semibold text-foreground">No Recurring Items Detected</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Once you reconcile bank statements with repeat merchant debits or payroll credits, our cadence clustering algorithm will group them here automatically.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-90 transition mt-2"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Bank Statement
          </Link>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <motion.div 
              key={item.id} 
              variants={itemVariants}
              whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between text-card-foreground"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    item.type === 'salary'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-primary/20 text-foreground border border-primary/30'
                  }`}>
                    {item.type}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                    <Repeat className="w-3 h-3" /> {item.cadence}
                  </span>
                </div>

                <h3 className="font-bold text-foreground text-base mt-3">{item.merchant}</h3>
                <p className="text-2xl font-extrabold mt-1 text-foreground font-mono">
                  {formatINR(getItemAmount(item))}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Next: <span className="font-semibold text-foreground">{item.next_expected_date || 'Upcoming'}</span>
                </span>
                <span className="font-mono text-muted-foreground">
                  {item.occurrences || 1}x detected
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
