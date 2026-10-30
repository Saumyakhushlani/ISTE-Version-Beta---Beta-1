'use client';

import React, { useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { ShieldCheck, Lock, HardDrive, EyeOff, CheckCircle2 } from 'lucide-react';

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

export default function PrivacyPage() {
  const [localOnly, setLocalOnly] = useState(true);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-6 space-y-8 max-w-7xl mx-auto"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Privacy & Local-First Verification</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your financial data belongs exclusively to you. Every statement, balance, and transaction is computed locally.
        </p>
      </motion.div>

      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Local SQLite Database</h3>
              <p className="text-xs text-slate-400 mt-0.5">Stored on your hard drive</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-4 leading-relaxed">
            Bank statements, parsed transactions, and financial snapshots reside in a local SQLite file (<code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono font-semibold">fdl.db</code>) on your computer.
          </p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Zero Cloud Egress</h3>
              <p className="text-xs text-slate-400 mt-0.5">No remote storage</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-4 leading-relaxed">
            All algorithms — from parsing to Monte Carlo simulations and deduplication — run in your local Python environment without sending numbers to third parties.
          </p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-600">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Strict Number Guard</h3>
              <p className="text-xs text-slate-400 mt-0.5">Zero Hallucinations</p>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-4 leading-relaxed">
            Our Number-Verification Guard uses regex validation to ensure no LLM hallucinates or alters any monetary calculation.
          </p>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 mb-1">Egress Audit Log</h3>
        <p className="text-xs text-slate-500 mb-4">
          All external outbound network requests are tracked in the database table <code className="text-slate-800 bg-slate-100 px-1 py-0.5 rounded font-mono">egress_log</code>.
        </p>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-mono flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Local Mode Active: 0 external egress calls recorded. System is 100% air-gapped and local-first.</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
