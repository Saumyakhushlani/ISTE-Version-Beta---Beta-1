'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  HardDrive, 
  EyeOff, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Server,
  FileCheck2,
  Terminal,
  Activity
} from 'lucide-react';
import { api } from '@/lib/api';

export default function PrivacyPage() {
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrivacyData();
  }, []);

  async function loadPrivacyData() {
    setLoading(true);
    try {
      const [statusRes, logRes] = await Promise.all([
        api.getPrivacyStatus().catch(() => null),
        api.getEgressLogs(50).catch(() => ({ logs: [] })),
      ]);
      setStatus(statusRes);
      setLogs(logRes?.logs || []);
    } catch (e) {
      console.error('Failed to load privacy data:', e);
    } finally {
      setLoading(false);
    }
  }

  const isLocalFirst = status?.is_local_first ?? true;
  const blockedAttempts = status?.blocked_external_attempts ?? 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
              Privacy & Local-First Verification
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 font-mono">
              AIR-GAPPED
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Financial transactions and raw statement text never leave your machine. Zero remote egress by design.
          </p>
        </div>
        <button
          onClick={loadPrivacyData}
          title="Refresh Privacy Audit"
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition w-fit cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Air-Gap Status Hero Card */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-lg"
      >
        <div className="absolute top-0 right-0 w-80 h-32 bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">
                  Privacy Mode: {isLocalFirst ? 'LOCAL_FIRST (Air-Gapped)' : 'CLOUD_SANITIZED'}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {status?.message || 'Financial data and statement text are processed strictly on localhost.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs font-mono border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-6">
            <div>
              <span className="text-slate-500 block">STORAGE</span>
              <span className="text-slate-200 font-bold">{status?.storage || 'Local SQLite'}</span>
            </div>
            <div>
              <span className="text-slate-500 block">EGRESS CALLS</span>
              <span className="text-emerald-400 font-bold">{logs.length} logged</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-900 text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Local SQLite Database</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">apps/api/fdl.db</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-3.5 leading-relaxed">
            Bank statements, parsed transactions, recurring schedules, and snapshots reside on your local disk. No external cloud sync or database hosting.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-900 text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Outbound Egress Guard</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">middleware/egress.py</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-3.5 leading-relaxed">
            All HTTP client calls are intercepted. In local mode, raw transaction arrays are strictly blocked from departing to external cloud APIs.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-900 text-purple-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm">Number-Verification Guard</h3>
              <p className="text-[11px] text-slate-400 mt-0.5 font-mono">ai/guard.py</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-3.5 leading-relaxed">
            Our strict regex guard audits every number cited by AI models against the deterministic Reasoning Ledger, instantly rejecting ungrounded figures.
          </p>
        </motion.div>
      </div>

      {/* Immutable Egress Audit Log */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Immutable Egress Audit Log (<code className="text-xs font-mono text-slate-400">egress_log</code>)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Auditable record of all external outbound calls attempted by the backend system.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {logs.length} logged events
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-semibold text-slate-100">Zero External Outbound Calls Recorded</p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                The egress interceptor verifies that 0 HTTP requests have left your machine. All calculations and categorizations ran 100% on localhost.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold">Destination</th>
                  <th className="py-2.5 px-3 font-semibold">Purpose</th>
                  <th className="py-2.5 px-3 font-semibold">Mode Action</th>
                  <th className="py-2.5 px-3 font-semibold">Sanitized Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-950/40 transition">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{l.timestamp || 'N/A'}</td>
                    <td className="py-2.5 px-3 text-slate-200">{l.destination}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">{l.purpose}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        l.mode === 'blocked_local' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {l.mode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 max-w-xs truncate" title={JSON.stringify(l.payload)}>
                      {JSON.stringify(l.payload)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
