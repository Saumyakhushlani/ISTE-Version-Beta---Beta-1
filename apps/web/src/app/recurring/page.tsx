'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Repeat, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

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
    .filter((i) => i.type !== 'salary')
    .reduce((sum, i) => sum + (i.typical_amount_minor || 0), 0);

  const salaryExpected = items
    .filter((i) => i.type === 'salary')
    .reduce((sum, i) => sum + (i.typical_amount_minor || 0), 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Subscriptions & Recurring Commitments</h1>
        <p className="text-sm text-slate-400 mt-1">
          Automatically detected recurring obligations: EMIs, rent, utilities, insurance, SIPs, and subscriptions.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Monthly Commitments</span>
          <p className="text-3xl font-bold text-rose-400 mt-2 tracking-tight">
            -{formatINR(committedMonthly)}
          </p>
          <p className="text-xs text-slate-400 mt-2">Rent, EMIs, Subscriptions, and SIPs</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Expected Monthly Income</span>
          <p className="text-3xl font-bold text-emerald-400 mt-2 tracking-tight">
            +{formatINR(salaryExpected)}
          </p>
          <p className="text-xs text-slate-400 mt-2">Salary credits detected</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Recurring Tracks</span>
          <p className="text-3xl font-bold text-white mt-2 tracking-tight">
            {items.length}
          </p>
          <p className="text-xs text-slate-400 mt-2">Grouped by merchant cadence</p>
        </div>
      </div>

      {/* Recurring Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                  item.type === 'salary' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                  item.type === 'emi' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                  item.type === 'rent' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                  'bg-slate-800 text-slate-300'
                }`}>
                  {item.type}
                </span>

                <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {item.cadence}
                </span>
              </div>

              <h3 className="text-lg font-bold text-white mt-3">{item.merchant}</h3>
              <p className="text-2xl font-extrabold text-slate-100 mt-1 font-mono tracking-tight">
                {formatINR(item.typical_amount_minor)}
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span>Next Expected: <strong className="text-slate-200">{item.next_expected_date}</strong></span>
              <span className="font-mono">{(item.confidence * 100).toFixed(0)}% score</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
