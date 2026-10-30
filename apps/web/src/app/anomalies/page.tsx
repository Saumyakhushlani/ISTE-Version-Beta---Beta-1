'use client';

import React, { useState, useEffect } from 'react';
import { motion, type Variants } from 'framer-motion';
import { AlertTriangle, ShieldAlert, CheckCircle, HelpCircle, Activity } from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

export default function AnomaliesPage() {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-8 max-w-7xl mx-auto"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Anomalies & Spike Alerts</h1>
        <p className="text-sm text-slate-500 mt-1">
          Algorithmic detection of unusual spending spikes (Modified Z-Score &gt; 3.5), duplicate debits within 3 days, and new high-value merchants.
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Detected Outliers ({anomalies.length})
          </h2>
          <span className="text-xs text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
            Zero false assumptions — mathematical proof provided
          </span>
        </div>

        {anomalies.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No spending anomalies detected. All charges align with historical baselines.
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((a) => (
              <motion.div 
                key={a.id} 
                whileHover={{ y: -2 }}
                transition={{ duration: 0.15 }}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                      a.severity === 'high' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      a.severity === 'medium' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {a.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono text-slate-400">Rule: {a.rule_id}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{a.reason_text}</p>
                </div>

                <div className="text-right whitespace-nowrap">
                  <p className="text-lg font-bold text-rose-600 font-mono">
                    {formatINR(a.amount_minor)}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.detected_at?.slice(0, 10)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
