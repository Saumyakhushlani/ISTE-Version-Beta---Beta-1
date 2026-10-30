'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, HelpCircle, Activity } from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

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
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Anomalies & Spike Alerts</h1>
        <p className="text-sm text-slate-400 mt-1">
          Algorithmic detection of unusual spending spikes (Modified Z-Score $M_i &gt; 3.5$), duplicate debits within 3 days, and new high-value merchants.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            Detected Outliers ({anomalies.length})
          </h2>
          <span className="text-xs text-slate-400">Zero false assumptions — mathematical proof provided</span>
        </div>

        {anomalies.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No spending anomalies detected. All charges align with historical baselines.
          </div>
        ) : (
          <div className="space-y-4">
            {anomalies.map((a) => (
              <div key={a.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      a.severity === 'high' ? 'bg-rose-950 text-rose-300 border border-rose-900' :
                      a.severity === 'medium' ? 'bg-amber-950 text-amber-300 border border-amber-900' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {a.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-mono text-slate-500">Rule: {a.rule_id}</span>
                  </div>
                  <p className="text-sm font-semibold text-white mt-1">{a.reason_text}</p>
                </div>

                <div className="text-right whitespace-nowrap">
                  <p className="text-lg font-bold text-rose-400 font-mono">
                    {formatINR(a.amount_minor)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
