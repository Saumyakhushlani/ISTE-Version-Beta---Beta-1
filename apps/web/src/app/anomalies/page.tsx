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

  const getAnomalyAmount = (a: any): number => {
    return a?.amount_minor ?? a?.amount_paise ?? a?.amount ?? 0;
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-8 max-w-7xl mx-auto text-foreground"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Anomalies & Spike Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Algorithmic detection of unusual spending spikes (Modified Z-Score &gt; 3.5), duplicate debits within 3 days, and new high-value merchants.
        </p>
      </motion.div>

      {/* Summary Stat */}
      <motion.div 
        variants={itemVariants}
        className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center justify-between text-card-foreground"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Active Anomaly Flags</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Automated detection flags requiring user review</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-3xl font-extrabold text-foreground font-mono">{anomalies.length}</span>
          <span className="text-xs text-muted-foreground block">Total flagged</span>
        </div>
      </motion.div>

      {/* Anomalies List */}
      <motion.div variants={containerVariants} className="space-y-4">
        {anomalies.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-xl">
            <CheckCircle className="w-10 h-10 text-primary mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-foreground">No anomalies detected</p>
            <p className="text-xs text-muted-foreground mt-1">Your spending matches historical distributions within normal parameters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {anomalies.map((a) => (
              <motion.div
                key={a.id}
                variants={itemVariants}
                whileHover={{ y: -2, boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.06)' }}
                transition={{ duration: 0.15 }}
                className="bg-card border border-border rounded-xl p-4 shadow-sm flex items-center justify-between gap-4 text-card-foreground"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      a.severity === 'high' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                      a.severity === 'medium' ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {a.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">Rule: {a.rule_id}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground mt-1">{a.reason_text}</p>
                </div>

                <div className="text-right whitespace-nowrap">
                  <p className="text-lg font-bold text-destructive font-mono">
                    {formatINR(getAnomalyAmount(a))}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{(a.detected_at || a.created_at || '')?.slice(0, 10)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
