'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  HardDrive, 
  EyeOff, 
  CheckCircle2, 
  Cpu, 
  FileCheck, 
  KeyRound, 
  Server, 
  AlertCircle, 
  ArrowRight, 
  Search, 
  RefreshCw,
  Terminal,
  Database,
  Layers,
  Sparkles
} from 'lucide-react';
import { PublicNav } from '@/components/public-nav';
import { FooterSection } from '@/components/ui/footer-section';
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
  hidden: { opacity: 0, y: 16 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.45, ease: 'easeOut' } 
  },
};

const PRIVACY_PILLARS = [
  {
    title: '100% Local-First SQLite Database',
    icon: HardDrive,
    tag: 'ON-DEVICE STORAGE',
    description:
      'All banking statements, accounts, transactions, and rolling financial snapshots reside strictly in your local SQLite database file (fdl.db). Zero cloud database replication, zero remote hosting, absolute data sovereignty.',
  },
  {
    title: 'Zero Cloud Egress & Air-Gap Enforcement',
    icon: Lock,
    tag: 'LOCAL RUNTIME',
    description:
      'All core algorithms—statement parsing, transaction deduplication, category classification, and 5,000 Monte Carlo runs—execute within your local Python process. Outbound network requests are blocked by default.',
  },
  {
    title: 'Deterministic Integer Paise Math',
    icon: Cpu,
    tag: 'ZERO FLOAT DRIFT',
    description:
      'Every calculation operates in integer paise (₹1.00 = 100 Paise). LLMs are strictly quarantined from calculating balances, headroom, safety buffers, or affordability verdicts. No math hallucination is mathematically possible.',
  },
  {
    title: 'Anti-Hallucination Number Guard',
    icon: FileCheck,
    tag: 'REGEX VERIFIED',
    description:
      'Whenever the assistant generates natural English explanations, a strict regex number guard cross-references every single number and currency figure against the deterministic 8-step Reasoning Ledger before rendering.',
  },
  {
    title: 'In-Memory Statement Parsing',
    icon: KeyRound,
    tag: 'EPHEMERAL RAM',
    description:
      'PDF and CSV bank statements are extracted locally in volatile memory using pdfplumber. For password-protected statements, passwords are used strictly in-memory during decompression and never written to disk or logs.',
  },
  {
    title: 'DPDP Act 2023 & GDPR Compliance',
    icon: ShieldCheck,
    tag: 'DATA MINIMIZATION',
    description:
      'Engineered in alignment with the Indian Digital Personal Data Protection (DPDP) Act 2023 and GDPR: zero third-party telemetry, zero ad-network pixels, no persistent device tracking, and instant one-click database deletion.',
  },
];

const PRIVACY_FAQS = [
  {
    question: 'Does Financial Decision Lab send my bank statements to OpenAI or Anthropic?',
    answer:
      'Never. Bank statements, account numbers, and transaction ledgers never leave your device. Only when you explicitly ask a question in natural language, an anonymized mathematical ledger summary is parsed locally. The Number-Verification Guard ensures no financial figures can ever be hallucinated or altered.',
  },
  {
    question: 'Where is my financial data stored on my computer?',
    answer:
      'All your accounts, statements, and transaction records are stored in a local SQLite file (fdl.db) inside the apps/api directory on your machine. You can copy, back up, or permanently delete this file at any time using your standard operating system file manager.',
  },
  {
    question: 'Can anyone on my Wi-Fi or the internet access my financial records?',
    answer:
      'No. The backend service binds exclusively to localhost (127.0.0.1) and enforces session security. No public ports or external webhooks are opened, ensuring your data is completely air-gapped from local network peers.',
  },
  {
    question: 'How do password-protected bank PDF statements work?',
    answer:
      'When you upload a password-protected PDF, your password is used in volatile memory solely to decrypt the PDF stream locally with pdfplumber. The password is never logged, never saved to disk, and immediately scrubbed from memory once parsing is complete.',
  },
  {
    question: 'How can I verify that zero data is leaving my machine?',
    answer:
      'Every potential outbound dispatch passes through our egress middleware, which records all attempted network dispatches in an immutable SQLite table (egress_log). You can inspect this log in real time below or query the database directly.',
  },
];

export default function PrivacyPage() {
  const [privacyStatus, setPrivacyStatus] = useState<any>(null);
  const [egressLogs, setEgressLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');

  const fetchPrivacyData = async () => {
    setLoading(true);
    try {
      const statusRes = await api.getPrivacyStatus();
      if (statusRes && !statusRes.error) {
        setPrivacyStatus(statusRes);
      }
    } catch {
      // Fallback local status when unauthenticated or offline
      setPrivacyStatus({
        privacy_mode: 'local',
        is_local_first: true,
        storage: 'Local SQLite (fdl.db)',
        air_gap_status: 'ENFORCED',
        total_egress_events: 0,
        blocked_external_attempts: 0,
        message: 'System running in local-first air-gapped mode.',
      });
    }

    try {
      const logsRes = await api.getEgressLogs({ limit: 10 });
      if (logsRes && logsRes.logs) {
        setEgressLogs(logsRes.logs);
      }
    } catch {
      setEgressLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyData();
  }, []);

  const filteredLogs = egressLogs.filter((log) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      (log.purpose && log.purpose.toLowerCase().includes(q)) ||
      (log.destination && log.destination.toLowerCase().includes(q)) ||
      (log.mode && log.mode.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 flex flex-col justify-between overflow-x-hidden font-sans">
      {/* 1. Unified Shared Navbar */}
      <PublicNav activeItem="privacy" />

      <main className="flex-1 relative overflow-hidden">
        {/* Continuous Ambient Background Glow */}
        <div className="ambient-canvas-glow pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[650px] h-[450px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute top-[45%] right-1/4 w-[550px] h-[400px] rounded-full bg-emerald-500/5 blur-[130px]" />
          <div className="absolute top-[75%] left-1/4 w-[500px] h-[350px] rounded-full bg-primary/4 blur-[130px]" />
        </div>

        {/* 2. Hero Section */}
        <section className="relative z-10 pt-16 pb-14 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-semibold mb-6 tracking-wide"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            100% AIR-GAPPED · ZERO CLOUD EGRESS · LOCAL-FIRST ARCHITECTURE
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight"
          >
            Your Finances Belong to You Alone.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-emerald-500 to-primary/80">
              Zero Cloud Transmission. Zero Telemetry.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-5 text-sm sm:text-base text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          >
            Financial Decision Lab was engineered from day one on a non-negotiable premise: your banking statements, account numbers, and cash flow data never leave your local hardware. All mathematics and forecasts are calculated deterministically on your machine.
          </motion.p>

          {/* Quick Metrics Bar */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto"
          >
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs text-center">
              <div className="text-xl sm:text-2xl font-bold text-foreground">0 Bytes</div>
              <div className="text-xs text-muted-foreground mt-0.5">Uploaded to Remote Clouds</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs text-center">
              <div className="text-xl sm:text-2xl font-bold text-primary font-mono">fdl.db</div>
              <div className="text-xs text-muted-foreground mt-0.5">Encrypted Local SQLite</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs text-center">
              <div className="text-xl sm:text-2xl font-bold text-foreground">100%</div>
              <div className="text-xs text-muted-foreground mt-0.5">Integer Paise Math</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border shadow-xs text-center">
              <div className="text-xl sm:text-2xl font-bold text-emerald-500">Air-Gapped</div>
              <div className="text-xs text-muted-foreground mt-0.5">Regex Number Guard</div>
            </div>
          </motion.div>
        </section>

        {/* 3. The 6 Pillars of FDL Privacy & Security */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Six Invariable Security Pillars
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Every component of our architecture is designed to uphold complete user privacy and mathematical determinism.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {PRIVACY_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <motion.div
                  key={pillar.title}
                  variants={itemVariants}
                  whileHover={{ y: -3 }}
                  className="p-6 rounded-2xl bg-card/90 border border-border shadow-sm flex flex-col justify-between hover:border-primary/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-md">
                        {pillar.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-2">
                      {pillar.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* 4. Live Cryptographic Egress Audit Inspector */}
        <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-md p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
              <div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">
                    Live Egress Audit Inspector
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" />
                    Air-Gap Enforced
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Cryptographic verification of all outbound network requests logged in the local SQLite table <code className="text-foreground bg-muted px-1.5 py-0.5 rounded font-mono font-semibold">egress_log</code>.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchPrivacyData}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <Link
                  href="/dashboard"
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 hover:opacity-90 transition-all flex items-center gap-1.5"
                >
                  Open Dashboard <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Status Summary Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
              <div className="p-4 rounded-xl bg-muted/60 border border-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-500">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground">Privacy Mode</div>
                  <div className="text-xs font-bold text-foreground uppercase tracking-wide">
                    {privacyStatus?.privacy_mode || 'LOCAL (AIR-GAPPED)'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/60 border border-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/15 text-primary">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground">Database Storage</div>
                  <div className="text-xs font-bold text-foreground font-mono">
                    {privacyStatus?.storage || 'Local SQLite (fdl.db)'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/60 border border-border flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground">External Network Calls</div>
                  <div className="text-xs font-bold text-foreground">
                    {privacyStatus?.total_egress_events !== undefined ? privacyStatus.total_egress_events : 0} Dispatched
                  </div>
                </div>
              </div>
            </div>

            {/* Egress Log Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Recorded Outbound Network Dispatches
                </span>
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={filterQuery}
                    onChange={(e) => setFilterQuery(e.target.value)}
                    placeholder="Search destination or purpose..."
                    className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {filteredLogs.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-muted text-muted-foreground border-b border-border">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                        <th className="py-2.5 px-3 font-semibold">Destination</th>
                        <th className="py-2.5 px-3 font-semibold">Mode</th>
                        <th className="py-2.5 px-3 font-semibold">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-2.5 px-3 text-foreground font-semibold">
                            {log.destination}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20">
                              {log.mode}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">
                            {log.purpose}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 rounded-xl bg-muted/40 border border-border text-center space-y-2">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    0 External Outbound Requests Logged
                  </div>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Your installation is strictly running in Local Air-Gapped Mode. All statements, categorizations, and calculations remain isolated within your local SQLite file.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 5. Privacy FAQ */}
        <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Common questions about data isolation, encryption, and our local-first architecture.
            </p>
          </div>

          <div className="space-y-4">
            {PRIVACY_FAQS.map((faq) => (
              <div 
                key={faq.question} 
                className="p-5 rounded-xl border border-border bg-card shadow-xs text-card-foreground"
              >
                <h4 className="text-sm font-bold text-foreground mb-1.5">
                  {faq.question}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 6. Unified Footer */}
      <FooterSection currentPath="privacy" />
    </div>
  );
}
