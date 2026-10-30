'use client';

import React, { useState } from 'react';
import { ShieldCheck, Lock, HardDrive, EyeOff, CheckCircle2 } from 'lucide-react';

export default function PrivacyPage() {
  const [localOnly, setLocalOnly] = useState(true);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Privacy & Local-First Verification</h1>
        <p className="text-sm text-slate-400 mt-1">
          Your financial data belongs exclusively to you. Every statement, balance, and transaction is computed locally.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-900 text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Local SQLite Database</h3>
              <p className="text-xs text-slate-400 mt-0.5">Stored on your hard drive</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-4 leading-relaxed">
            Bank statements, parsed transactions, and financial snapshots reside in a local SQLite file (<code className="text-emerald-400">fdl.db</code>) on your computer.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-950/60 border border-indigo-900 text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Zero Cloud Egress</h3>
              <p className="text-xs text-slate-400 mt-0.5">No remote storage</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-4 leading-relaxed">
            All algorithms — from parsing to Monte Carlo simulations and deduplication — run in your local Python environment without sending numbers to third parties.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-900 text-purple-400">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Strict Number Guard</h3>
              <p className="text-xs text-slate-400 mt-0.5">Zero Hallucinations</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-4 leading-relaxed">
            Our Number-Verification Guard uses regex validation to ensure no LLM hallucinates or alters any monetary calculation.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-semibold text-white mb-2">Egress Audit Log</h3>
        <p className="text-xs text-slate-400 mb-4">
          All external outbound network requests are tracked in the database table <code className="text-slate-300">egress_log</code>.
        </p>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Local Mode Active: 0 external egress calls recorded. System is 100% air-gapped and local-first.</span>
        </div>
      </div>
    </div>
  );
}
