'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { UploadCloud, CheckCircle2, AlertCircle, FileText, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [bankHint, setBankHint] = useState('auto');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [committed, setCommitted] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreview(null);
      setCommitted(null);
      setError(null);
    }
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (bankHint) formData.append('bank_hint', bankHint);
      const res = await api.previewStatement(formData);
      setPreview(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to parse statement.');
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async () => {
    const fileId = preview?.staging_id || preview?.file_id;
    if (!fileId) return;
    setUploading(true);
    setError(null);
    try {
      const res = await api.commitStatement(fileId);
      setCommitted(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to commit statement import.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-foreground">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Import Bank Statement</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Upload PDF or CSV statements from HDFC, SBI, ICICI, Axis, or PhonePe. Statements are parsed locally.
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <form onSubmit={handlePreview} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Bank / Provider</label>
            <select
              value={bankHint}
              onChange={(e) => setBankHint(e.target.value)}
              className="w-full sm:w-64 bg-background border border-border text-xs rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="auto">Auto-Detect Bank</option>
              <option value="HDFC">HDFC Bank</option>
              <option value="SBI">State Bank of India (SBI)</option>
              <option value="ICICI">ICICI Bank</option>
              <option value="Axis">Axis Bank</option>
              <option value="PhonePe">PhonePe Statement</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">Select Statement File (.csv, .pdf)</label>
            <input
              type="file"
              accept=".csv,.pdf"
              onChange={handleFileChange}
              className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:opacity-90 cursor-pointer"
            />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={!file || uploading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition"
            >
              {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
              Analyze & Preview
            </button>
            {file && <span className="text-xs text-muted-foreground">{file.name}</span>}
          </div>
        </form>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {preview && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Statement Parsed: {preview.bank_detected || 'Bank Statement'}
            </h2>
            <span className="text-xs font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20">
              {preview.transactions_count || preview.preview_rows?.length || 0} Transactions Found
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-background p-3 rounded-xl border border-border">
              <span className="text-muted-foreground block text-[11px]">Reconciliation</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{preview.reconciliation_status || 'Verified'}</span>
            </div>
            <div className="bg-background p-3 rounded-xl border border-border">
              <span className="text-muted-foreground block text-[11px]">Period</span>
              <span className="font-semibold text-foreground">{preview.period_start || 'N/A'} - {preview.period_end || 'N/A'}</span>
            </div>
            <div className="bg-background p-3 rounded-xl border border-border">
              <span className="text-muted-foreground block text-[11px]">Total Credits</span>
              <span className="font-semibold text-foreground">{preview.total_credits_count || 0}</span>
            </div>
            <div className="bg-background p-3 rounded-xl border border-border">
              <span className="text-muted-foreground block text-[11px]">Total Debits</span>
              <span className="font-semibold text-foreground">{preview.total_debits_count || 0}</span>
            </div>
          </div>

          {!committed ? (
            <button
              onClick={handleCommit}
              disabled={uploading}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-500 transition shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm & Ingest Transactions
            </button>
          ) : (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Statement successfully committed! {committed.transactions_inserted || 0} transactions added.</span>
              </div>
              <Link href="/dashboard" className="underline font-bold hover:text-foreground">
                View in Dashboard &rarr;
              </Link>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
