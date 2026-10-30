'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Activity, 
  RefreshCw, 
  Layers, 
  Copy, 
  ArrowRight,
  ShieldCheck,
  Info
} from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAnomalies();
  }, []);

  async function loadAnomalies() {
    setLoading(true);
    try {
      const res = await api.getAnomalies();
      setAnomalies(res?.anomalies || []);
    } catch (e) {
      console.error('Failed to load anomalies:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleAcknowledge(id: string) {
    setAcknowledged((prev) => ({ ...prev, [id]: true }));
  }

  const highSeverityCount = anomalies.filter((a) => a.severity === 'high').length;
  const mediumSeverityCount = anomalies.filter((a) => a.severity === 'medium').length;
  const totalOutlierAmountPaise = anomalies.reduce((sum, a) => sum + (a.amount_minor || 0), 0);

  const filtered = anomalies.filter((a) => {
    if (filterSeverity === 'all') return true;
    if (filterSeverity === 'high') return a.severity === 'high';
    if (filterSeverity === 'medium') return a.severity === 'medium';
    if (filterSeverity === 'duplicates') return a.type?.includes('duplicate');
    if (filterSeverity === 'spikes') return a.type?.includes('spike');
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              Anomalies & Spending Spikes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-slate-900 border border-slate-700/80 text-amber-400 font-mono">
              MODIFIED Z-SCORE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Algorithmic detection of unusual spending spikes (Modified Z-Score $M_i &gt; 3.5$), duplicate charges within 3 days, and high-value anomalies.
          </p>
        </div>
        <button
          onClick={loadAnomalies}
          title="Refresh Anomalies"
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition w-fit"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Flagged Anomalies
          </span>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 mt-2 tracking-tight">
            {anomalies.length}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Outliers exceeding category baselines
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            High-Severity Alerts
          </span>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-rose-400 mt-2 tracking-tight">
            {highSeverityCount}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Require urgent manual verification
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Flagged Volume
          </span>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 mt-2 tracking-tight">
            {formatINR(totalOutlierAmountPaise)}
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Cumulative sum of anomalous debits
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Detection Standard
          </span>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 mt-2 tracking-tight">
            M &gt; 3.5
          </p>
          <p className="text-xs text-slate-400 mt-1.5">
            Median Absolute Deviation (MAD)
          </p>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
        {[
          { id: 'all', label: `All Alerts (${anomalies.length})` },
          { id: 'high', label: `High Severity (${highSeverityCount})` },
          { id: 'medium', label: `Medium Severity (${mediumSeverityCount})` },
          { id: 'spikes', label: 'Spending Spikes' },
          { id: 'duplicates', label: 'Duplicate Charges' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterSeverity(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition border cursor-pointer ${
              filterSeverity === tab.id
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/40'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Anomalies Feed */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-sm">
            <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-slate-200 font-semibold text-base">No anomalies matching this filter</p>
            <p className="text-xs text-slate-400 mt-1">All debit events align cleanly with your historical spending baselines.</p>
          </div>
        ) : (
          filtered.map((a) => {
            const isAck = acknowledged[a.id];
            return (
              <motion.div 
                key={a.id} 
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-slate-900 border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-lg ${
                  isAck ? 'opacity-60 border-slate-800' : 
                  a.severity === 'high' ? 'border-rose-900/60 bg-rose-950/10' :
                  a.severity === 'medium' ? 'border-amber-900/60 bg-amber-950/10' :
                  'border-slate-800'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider ${
                      a.severity === 'high' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                      a.severity === 'medium' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      {a.severity} Severity
                    </span>

                    <span className="text-xs px-2 py-0.5 rounded bg-slate-950 text-slate-400 font-mono border border-slate-800">
                      Rule: {a.rule_id || a.type}
                    </span>

                    {isAck && (
                      <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Acknowledged
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-100 mt-1">
                    {a.reason_text}
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 shrink-0">
                  <p className="text-lg sm:text-xl font-bold font-mono text-rose-400">
                    -{formatINR(a.amount_minor || 0)}
                  </p>
                  
                  {!isAck && (
                    <button
                      onClick={() => handleAcknowledge(a.id)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition border border-slate-700/80 cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
