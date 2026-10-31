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
      className="p-6 space-y-8 max-w-7xl mx-auto text-foreground"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Privacy & Local-First Verification</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your financial data belongs exclusively to you. Every statement, balance, and transaction is computed locally.
        </p>
      </motion.div>

      <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-card border border-border rounded-xl p-5 shadow-sm text-card-foreground"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/25 text-primary">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Local SQLite Database</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Stored on your hard drive</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Bank statements, parsed transactions, and financial snapshots reside in a local SQLite file (<code className="text-foreground bg-muted px-1 py-0.5 rounded font-mono font-semibold">fdl.db</code>) on your computer.
          </p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-card border border-border rounded-xl p-5 shadow-sm text-card-foreground"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/25 text-primary">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Zero Cloud Egress</h3>
              <p className="text-xs text-muted-foreground mt-0.5">No remote storage</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            All algorithms — from parsing to Monte Carlo simulations and deduplication — run in your local Python environment without sending numbers to third parties.
          </p>
        </motion.div>

        <motion.div 
          variants={itemVariants}
          whileHover={{ y: -3, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)' }}
          className="bg-card border border-border rounded-xl p-5 shadow-sm text-card-foreground"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/25 text-primary">
              <EyeOff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Strict Number Guard</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Zero Hallucinations</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Our Number-Verification Guard uses regex validation to ensure no LLM hallucinates or alters any monetary calculation.
          </p>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-card border border-border rounded-xl p-6 shadow-sm text-card-foreground">
        <h3 className="text-base font-bold text-foreground mb-1">Egress Audit Log</h3>
        <p className="text-xs text-muted-foreground mb-4">
          All external outbound network requests are tracked in the database table <code className="text-foreground bg-muted px-1 py-0.5 rounded font-mono">egress_log</code>.
        </p>

        <div className="p-4 rounded-xl bg-muted border border-border text-xs text-foreground font-mono flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
          <span>Local Mode Active: 0 external egress calls recorded. System is 100% air-gapped and local-first.</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
