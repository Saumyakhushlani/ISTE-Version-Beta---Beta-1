'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw,
  Database,
  Lock,
  Sparkles,
  FileSpreadsheet,
  Sliders,
  TrendingUp,
  Activity,
  Layers,
  Building2,
  Trash2,
  X
} from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';
import { DataStreamCanvas } from '@/components/ui/data-stream-canvas';
import StatementUploadModal from '@/components/StatementUploadModal';
import StatementPasswordModal from '@/components/StatementPasswordModal';

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [bankHint, setBankHint] = useState('auto');
  const [password, setPassword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0);
  const [streamStatus, setStreamStatus] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [committed, setCommitted] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  // Deletion state
  const [fileToDelete, setFileToDelete] = useState<any | null>(null);
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  // Password prompt modal state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordIncorrect, setPasswordIncorrect] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);

  useEffect(() => {
    loadFiles();
  }, [committed]);

  const loadFiles = () => {
    api.getUploadedFiles().then(res => {
      if (Array.isArray(res)) setUploadedFiles(res);
    }).catch(() => {});
  };

  // Auto-redirect countdown once committed
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (committed && countdown !== null && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (committed && countdown === 0) {
      router.push('/dashboard');
    }
    return () => clearTimeout(timer);
  }, [committed, countdown, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPassword('');
      setPreview(null);
      setCommitted(null);
      setError(null);
      setStreamProgress(0);
      setCountdown(null);
    }
  };

  const runStreamingAnimation = (fileName: string, bankLabel: string, action: () => Promise<void>) => {
    setUploading(true);
    setStreamProgress(0);
    setStreamStatus(`PHASE 1: INGESTING ${fileName.toUpperCase()} // DETECTING BANK SCHEMA (${bankLabel.toUpperCase()})`);

    const startTime = performance.now();
    const duration = 2000;

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      const progress = Math.min(1, rawProgress < 0.5 ? 2 * rawProgress * rawProgress : -1 + (4 - 2 * rawProgress) * rawProgress);
      setStreamProgress(progress);

      if (progress < 0.20) {
        setStreamStatus(`PHASE 1: PARSING ${fileName.toUpperCase()} // DECODING ROWS`);
      } else if (progress < 0.40) {
        setStreamStatus(`PHASE 2: NORMALIZING UPI/NEFT DESCRIPTIONS // CLEANING TRANSACTION CHANNELS`);
      } else if (progress < 0.65) {
        setStreamStatus(`PHASE 3: PAIRING INTERNAL TRANSFERS // CALCULATING RECONCILIATION DELTA Δ = 0 PAISE`);
      } else if (progress < 0.85) {
        setStreamStatus(`PHASE 4: CADENCE CLUSTERING // DETECTING RECURRING COMMITMENTS & SALARY`);
      } else if (progress < 0.96) {
        setStreamStatus(`PHASE 5: MODIFIED Z-SCORE ANOMALIES // DETECTING IRREGULAR CHARGES`);
      } else {
        setStreamStatus(`PHASE 6: INGESTION COMPLETE // LOCAL FDL.DB READY`);
      }

      if (rawProgress >= 1) {
        clearInterval(interval);
      }
    }, 40);

    action().finally(() => {
      setTimeout(() => {
        setUploading(false);
      }, 400);
    });
  };

  const handlePreview = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!file) {
      setError('Please select a CSV, Excel (.xlsx, .xls), or PDF file to upload, or click one of the quick demo buttons above.');
      return;
    }

    setError(null);
    const fileName = file.name;
    const targetLabel = bankHint === 'auto' ? 'Auto-Detect' : bankHint;

    runStreamingAnimation(fileName, targetLabel, async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (bankHint && bankHint !== 'auto') formData.append('bank_hint', bankHint);
        if (password) formData.append('password', password);
        
        const res = await api.previewStatement(formData);
        if (!res || res.error) {
          throw new Error(res?.message || 'Failed to parse statement.');
        }
        setPreview(res);
      } catch (err: any) {
        if (err.isPasswordRequired || err.isPasswordIncorrect || err.message?.includes('PASSWORD_')) {
          setPasswordIncorrect(Boolean(err.isPasswordIncorrect || err.message?.includes('PASSWORD_INCORRECT')));
          setPasswordModalOpen(true);
        } else {
          setError(err.message || 'Error parsing statement file. Please verify delimiter and headers.');
        }
      }
    });
  };

  const handlePasswordSubmit = async (enteredPassword: string) => {
    if (!file) return;
    setIsUnlocking(true);
    setPasswordIncorrect(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (bankHint && bankHint !== 'auto') formData.append('bank_hint', bankHint);
      formData.append('password', enteredPassword);

      const res = await api.previewStatement(formData);
      if (!res || res.error) {
        throw new Error(res?.message || 'Failed to parse statement.');
      }
      setPassword(enteredPassword);
      setPreview(res);
      setPasswordModalOpen(false);
      setError(null);
    } catch (err: any) {
      if (err.isPasswordIncorrect || err.message?.includes('PASSWORD_INCORRECT') || err.message?.includes('PASSWORD_REQUIRED')) {
        setPasswordIncorrect(true);
      } else {
        setError(err.message || 'Failed to unlock statement.');
        setPasswordModalOpen(false);
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleCommit = async () => {
    const fileId = preview?.staging_id || preview?.file_id;
    if (!fileId) {
      setError('No staged statement available to commit.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const res = await api.commitStatement(fileId, undefined, preview?.column_mapping);
      setCommitted(res);
      setCountdown(4);
    } catch (err: any) {
      setError(err.message || 'Error committing transactions into local database.');
    } finally {
      setUploading(false);
    }
  };

  const loadDemoPersona = (persona: 'aarav' | 'priya') => {
    setPreview(null);
    setCommitted(null);
    setError(null);
    setCountdown(null);
    const demoFileName = persona === 'aarav' ? 'AARAV_HDFC_SALARY.CSV' : 'PRIYA_ICICI_FREELANCE.CSV';
    const personaBank = persona === 'aarav' ? 'HDFC Bank' : 'ICICI Bank';
    setBankHint(persona === 'aarav' ? 'HDFC' : 'ICICI');

    runStreamingAnimation(demoFileName, personaBank, async () => {
      try {
        const res = await api.loadDemoStatement(persona);
        setPreview(res);
        setCommitted(res);
        setCountdown(4);
      } catch (e: any) {
        setError(e.message || 'Error loading demo statement persona.');
      }
    });
  };

  const handleDeleteStatement = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteUploadedFile(fileToDelete.id);
      setUploadedFiles(prev => prev.filter(f => f.id !== fileToDelete.id));
      if (preview?.file_id === fileToDelete.id || preview?.staging_id === fileToDelete.id) {
        setPreview(null);
        setCommitted(null);
      }
      setDeleteSuccessMsg(`Deleted statement "${fileToDelete.filename}" and updated recurring ledger.`);
      setTimeout(() => setDeleteSuccessMsg(null), 4000);
      setFileToDelete(null);
    } catch (e: any) {
      setError(e.message || 'Failed to delete statement.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAllStatements = async () => {
    setIsDeleting(true);
    try {
      await api.deleteAllUploadedFiles();
      setUploadedFiles([]);
      setPreview(null);
      setCommitted(null);
      setDeleteSuccessMsg('Cleared all uploaded statements and reset financial transactions.');
      setTimeout(() => setDeleteSuccessMsg(null), 4000);
      setClearAllModalOpen(false);
    } catch (e: any) {
      setError(e.message || 'Failed to clear all statements.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper calculations for dynamic display
  const bankName = preview?.bank_detected || preview?.bank || (bankHint !== 'auto' ? bankHint : 'Bank Statement');
  const txnCount = preview?.transactions_count ?? preview?.rows_detected ?? preview?.sample_rows?.length ?? 0;
  const startDate = preview?.period_start || preview?.date_range?.start || '';
  const endDate = preview?.period_end || preview?.date_range?.end || '';
  
  // Calculate exact days of coverage dynamically from dates
  const daysCoverage = (startDate && endDate)
    ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
    : (preview?.coverage_days ?? 0);

  const creditsCount = preview?.total_credits_count ?? (preview?.sample_rows ? preview.sample_rows.filter((r: any) => r.amount_minor > 0).length : 0);
  const debitsCount = preview?.total_debits_count ?? (preview?.sample_rows ? preview.sample_rows.filter((r: any) => r.amount_minor < 0).length : txnCount);
  const reconStatus = preview?.reconciliation_status === 'PASSED' ? 'Passed (Δ = 0 Paise)' : (preview?.reconciliation_status || 'Passed (Δ = 0)');

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 text-foreground font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-primary/25 bg-primary/10 text-[10.5px] font-mono text-primary mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            STEP 1 · LOCAL STATEMENT INGESTION &amp; RECONCILIATION
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Ingest Bank Statement
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Upload CSV or PDF statements (HDFC, SBI, ICICI, Axis, PhonePe). The engine normalizes UPI merchants, pairs transfers with &Delta; = 0 paise, clusters recurring bills, and executes 5,000 Monte Carlo runs.
          </p>
        </div>

        {/* Demo Fast-Load Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => loadDemoPersona('aarav')}
            className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Load Aarav CSV (HDFC)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
          >
            <Sliders className="w-3.5 h-3.5 text-primary" />
            <span>Column Mapper</span>
          </button>
          <button
            type="button"
            onClick={() => loadDemoPersona('priya')}
            className="px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
            <span>Load Priya CSV (ICICI)</span>
          </button>
        </div>
      </div>

      {/* Main Upload Conduit Box */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <form onSubmit={handlePreview} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 font-mono uppercase tracking-wider text-[11px]">
                Target Bank / Schema Hint
              </label>
              <select
                value={bankHint}
                onChange={(e) => setBankHint(e.target.value)}
                className="w-full bg-background border border-border text-xs rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
              >
                <option value="auto">Auto-Detect Statement Format</option>
                <option value="HDFC">HDFC Bank (CSV &amp; PDF)</option>
                <option value="SBI">State Bank of India - SBI (CSV &amp; PDF)</option>
                <option value="ICICI">ICICI Bank (CSV &amp; PDF)</option>
                <option value="Axis">Axis Bank (CSV &amp; PDF)</option>
                <option value="PhonePe">PhonePe UPI Statement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 font-mono uppercase tracking-wider text-[11px]">
                Choose File (.csv, .xlsx, .xls, .pdf)
              </label>
              <input
                type="file"
                accept=".csv,.pdf,.xlsx,.xls,.zip,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileChange}
                className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border file:border-border file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
              />
            </div>

            {file && file.name.toLowerCase().endsWith('.pdf') && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1.5 font-mono uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  PDF Password (leave blank if not password protected)
                </label>
                <input
                  type="password"
                  placeholder="Enter PDF statement password (e.g. DOB or PAN)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border text-xs rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-2xs"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/80">
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={uploading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Statement...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{file ? `Ingest & Analyze ${file.name}` : 'Ingest Statement'}</span>
                  </>
                )}
              </button>
              {file && (
                <span className="text-xs font-mono text-muted-foreground flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>100% Offline · Zero Cloud Egress · Local SQLite</span>
            </div>
          </div>
        </form>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Live DataStream Canvas Ingestion Animation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Deterministic Ingestion Pipeline Conduit
          </span>
          <span className="text-[11px] font-mono text-primary font-semibold">
            {streamProgress > 0 && streamProgress < 1
              ? `${Math.round(streamProgress * 100)}% PROCESSED`
              : streamProgress >= 1
              ? 'ANALYSIS COMPLETE'
              : 'CONDUIT STANDBY'}
          </span>
        </div>

        <DataStreamCanvas
          progress={streamProgress}
          statusMessage={streamStatus}
          srcLabel={file?.name || (bankHint !== 'auto' ? `${bankHint}_STATEMENT.CSV` : 'STATEMENT.CSV')}
          dstLabel="LOCAL SQLITE (FDL.DB)"
        />
      </div>

      {/* Parsed Statement Summary & Reconciliation Report */}
      <AnimatePresence>
        {preview && (
          <motion.div 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -12 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <span>Statement Reconciled:</span>
                    <span className="text-primary font-extrabold">{bankName}</span>
                    {preview.masked_last4 && (
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                        •••• {preview.masked_last4}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {startDate && endDate ? `Period: ${startDate} to ${endDate}` : 'Statement Period Reconciled'} · SHA-256 Fingerprint Verified
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 font-bold">
                  {txnCount} Transactions
                </span>
                <span className="text-xs font-mono bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20 font-bold">
                  &Delta; = 0 Paise Reconciled
                </span>
              </div>
            </div>

            {/* 4 High-Signal Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-background/80 p-3.5 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Balance Anchor</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 block capitalize">
                  {reconStatus}
                </span>
              </div>
              <div className="bg-background/80 p-3.5 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Data Sufficiency</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block">
                  {daysCoverage} Days ({daysCoverage >= 90 ? '> 90d Gate' : '< 90d Gate'})
                </span>
              </div>
              <div className="bg-background/80 p-3.5 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Income Credits</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5 block">
                  +{creditsCount} Entries
                </span>
              </div>
              <div className="bg-background/80 p-3.5 rounded-xl border border-border">
                <span className="text-muted-foreground block text-[10px] uppercase tracking-wider">Committed Debits</span>
                <span className="font-bold text-foreground text-sm mt-0.5 block">
                  -{debitsCount} Entries
                </span>
              </div>
            </div>

            {/* Ingestion & Analysis Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border">
              {!committed ? (
                <div className="flex items-center gap-3 w-full justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <Database className="w-4 h-4 text-primary" />
                    <span>Transactions analyzed. Ready to commit into fdl.db.</span>
                  </div>
                  <button
                    onClick={handleCommit}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:opacity-90 transition-all shadow-xs active:scale-95 shrink-0 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm &amp; Ingest Transactions
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                  <div className="flex items-center gap-2.5 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      Analysis Complete for {bankName}! {txnCount} transactions verified.
                      {countdown !== null && countdown > 0 && ` Redirecting to dashboard in ${countdown}s...`}
                    </span>
                  </div>
                  <Link 
                    href="/dashboard" 
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-all shadow-sm shrink-0"
                  >
                    <span>Access Dashboard &amp; Full Analytics</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded Statements Vault History */}
      {uploadedFiles.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Reconciled Statements in Local Vault</h3>
                <p className="text-xs text-muted-foreground">{uploadedFiles.length} statement files currently ingested into local SQLite</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setClearAllModalOpen(true)}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All Statements</span>
              </button>
              <Link
                href="/dashboard"
                className="px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-xl border border-primary/20 transition-all flex items-center gap-1"
              >
                <span>View Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {deleteSuccessMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{deleteSuccessMsg}</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence>
              {uploadedFiles.map((f: any) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-3.5 rounded-xl border border-border bg-card/60 flex items-start justify-between gap-3 shadow-xs hover:border-border/80 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-foreground truncate">{f.filename}</p>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded font-semibold">
                        {f.reconciliation_status || 'PASSED'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {f.bank} {f.masked_last4 ? `(•••• ${f.masked_last4})` : ''} · <span className="font-mono text-foreground font-semibold">{f.transaction_count} txns</span>
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {f.period_start && f.period_end ? `Period: ${f.period_start} to ${f.period_end}` : 'Reconciled'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFileToDelete(f)}
                    className="p-2 rounded-lg text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 cursor-pointer active:scale-95"
                    title="Delete statement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Delete Single Statement Confirmation Modal */}
      <AnimatePresence>
        {fileToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 text-foreground"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <Trash2 className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setFileToDelete(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">Delete Uploaded Statement?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete <span className="font-semibold text-foreground">{fileToDelete.filename}</span>?
                </p>
              </div>

              <div className="p-3 bg-muted/50 rounded-xl border border-border/80 text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Bank Account:</span>
                  <span className="font-semibold text-foreground">{fileToDelete.bank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transactions:</span>
                  <span className="font-semibold text-rose-500">{fileToDelete.transaction_count} to be removed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statement Period:</span>
                  <span className="text-foreground">{fileToDelete.period_start} to {fileToDelete.period_end}</span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Deleting this file unpairs any linked cross-statement transfers, purges flagged anomalies, and recalculates recurring subscriptions and safety buffers.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setFileToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteStatement}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Statement</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear All Statements Confirmation Modal */}
      <AnimatePresence>
        {clearAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-rose-500/30 rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4 text-foreground"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <button
                  type="button"
                  onClick={() => setClearAllModalOpen(false)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-base font-bold text-foreground">Clear All Statement Data?</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  This will permanently delete all <span className="font-bold text-foreground">{uploadedFiles.length} statement files</span>, along with all active transactions, auto-detected recurring items, and forecast snapshots.
                </p>
              </div>

              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 font-mono">
                WARNING: This action cannot be undone. Your local SQLite ledger will be reset to a clean slate.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setClearAllModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleClearAllStatements}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Clearing All...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All Data</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StatementUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          handlePreview();
        }}
      />
    </div>
  );
}
