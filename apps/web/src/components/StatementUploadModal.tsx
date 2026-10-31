'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Sliders,
  ChevronDown,
  Layers,
  Database,
  Lock
} from 'lucide-react';
import { formatINR } from '@fdl/shared';
import { api } from '@/lib/api';
import StatementPasswordModal from './StatementPasswordModal';

interface StatementUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function StatementUploadModal({
  isOpen,
  onClose,
  onSuccess,
}: StatementUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [bankHint, setBankHint] = useState<string>('auto');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [commitLoading, setCommitLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Preview result state
  const [previewData, setPreviewData] = useState<any>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [showMappingEditor, setShowMappingEditor] = useState<boolean>(false);

  // Commit result state
  const [commitResult, setCommitResult] = useState<any>(null);

  // Password prompt state
  const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false);
  const [passwordIncorrect, setPasswordIncorrect] = useState<boolean>(false);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function resetState() {
    setFile(null);
    setBankHint('auto');
    setPassword('');
    setLoading(false);
    setCommitLoading(false);
    setError(null);
    setPreviewData(null);
    setColumnMapping({});
    setShowMappingEditor(false);
    setCommitResult(null);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      setFile(selected);
      setError(null);
      setPreviewData(null);
      setCommitResult(null);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setError(null);
      setPreviewData(null);
      setCommitResult(null);
    }
  }

  async function handlePreview(overrideMapping?: Record<string, number>) {
    if (!file) {
      setError('Please select a CSV, Excel (.xlsx, .xls), or PDF file to upload.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (bankHint) formData.append('bank_hint', bankHint);
      if (password) formData.append('password', password);

      const mappingToSend = overrideMapping || (previewData?.column_mapping ? columnMapping : undefined);
      if (mappingToSend && Object.keys(mappingToSend).length > 0) {
        formData.append('column_mapping', JSON.stringify(mappingToSend));
      }

      const res = await api.previewStatement(formData);
      setPreviewData(res);
      setColumnMapping(res.column_mapping || {});
      if (res.is_ambiguous) {
        setShowMappingEditor(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to preview statement. Please verify file format.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(enteredPassword: string) {
    if (!file) return;
    setIsUnlocking(true);
    setPasswordIncorrect(false);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (bankHint) formData.append('bank_hint', bankHint);
      formData.append('password', enteredPassword);

      const res = await api.previewStatement(formData);
      setPassword(enteredPassword);
      setPreviewData(res);
      setColumnMapping(res.column_mapping || {});
      setPasswordModalOpen(false);
      setError(null);
    } catch (err: any) {
      if (err.isPasswordIncorrect || err.message?.includes('PASSWORD_INCORRECT') || err.message?.includes('PASSWORD_REQUIRED')) {
        setPasswordIncorrect(true);
      } else {
        setError(err?.message || 'Failed to unlock statement.');
        setPasswordModalOpen(false);
      }
    } finally {
      setIsUnlocking(false);
    }
  }

  async function handleCommit() {
    if (!previewData?.file_id) return;

    setCommitLoading(true);
    setError(null);

    try {
      const res = await api.commitStatement(
        previewData.file_id,
        undefined,
        columnMapping
      );
      setCommitResult(res);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to commit statement into database.');
    } finally {
      setCommitLoading(false);
    }
  }

  const availableHeaders: string[] = previewData?.headers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Import Bank Statement</h2>
              <p className="text-xs text-slate-500">
                Supports real-world CSV & PDF statements with auto-detection and reconciliation.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Step Screen */}
          {commitResult ? (
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Statement Successfully Ingested</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Transactions normalized into integer paise and reconciled against cumulative history.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[11px] text-slate-500 font-medium">Inserted Rows</p>
                  <p className="text-lg font-bold text-slate-900">{commitResult.inserted}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[11px] text-slate-500 font-medium">Duplicates Merged</p>
                  <p className="text-lg font-bold text-emerald-600">{commitResult.duplicates_skipped}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[11px] text-slate-500 font-medium">Transfers Paired</p>
                  <p className="text-lg font-bold text-blue-600">{commitResult.internal_transfers_detected}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-[11px] text-slate-500 font-medium">Recurring Updated</p>
                  <p className="text-lg font-bold text-purple-600">{commitResult.recurring_items_updated}</p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  Done & Refresh Dashboard
                </button>
              </div>
            </div>
          ) : !previewData ? (
            /* Upload / Configuration Screen */
            <div className="space-y-5">
              {/* File Dropzone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${
                  file
                    ? 'border-blue-400 bg-blue-50/30'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.pdf,.xlsx,.xls,.zip,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                {file ? (
                  <div>
                    <p className="text-sm font-bold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(file.size / 1024).toFixed(1)} KB • Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Drag & drop statement file here, or <span className="text-blue-600">browse</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports CSV, Excel (.xlsx, .xls), & digital PDF (HDFC, SBI, ICICI, Axis, Kotak)
                    </p>
                  </div>
                )}
              </div>

              {/* Bank Hint & PDF Password Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Bank Format / Profile
                  </label>
                  <div className="relative">
                    <select
                      value={bankHint}
                      onChange={(e) => setBankHint(e.target.value)}
                      className="w-full appearance-none bg-white border border-slate-200 text-xs font-medium text-slate-800 px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 shadow-sm pr-8"
                    >
                      <option value="auto">Auto-Detect Bank & Columns</option>
                      <option value="HDFC">HDFC Bank</option>
                      <option value="SBI">State Bank of India (SBI)</option>
                      <option value="ICICI">ICICI Bank</option>
                      <option value="Axis">Axis Bank</option>
                      <option value="Kotak">Kotak Mahindra Bank</option>
                      <option value="PhonePe">PhonePe / GPay</option>
                      <option value="Generic">Generic Bank / CSV</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {file?.name?.toLowerCase().endsWith('.pdf') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-slate-400" />
                      PDF Password (if protected)
                    </label>
                    <input
                      type="password"
                      placeholder="e.g. DOB or PAN if required"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-xs font-medium text-slate-800 px-3 py-2 rounded-xl focus:outline-none focus:border-blue-500 shadow-sm"
                    />
                  </div>
                )}
              </div>

              {/* Analyze Button */}
              <div className="pt-2">
                <button
                  disabled={!file || loading}
                  onClick={() => handlePreview()}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyzing statement encoding & layout...</span>
                    </>
                  ) : (
                    <>
                      <span>Inspect & Preview Statement</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Preview Screen */
            <div className="space-y-6">
              {/* Summary Metrics & Reconciliation Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200">
                      {previewData.bank_detected}
                    </span>
                    <span className="text-xs text-slate-600 font-medium">
                      A/C •••• {previewData.masked_last4}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-600 font-medium">
                      {previewData.rows_detected} rows detected
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-md">
                      Delim: {previewData.detected_delimiter === '\t' ? 'TAB' : `"${previewData.detected_delimiter}"`}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-md">
                      Enc: {previewData.detected_encoding.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* 3 KPI Blocks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                    <p className="text-[11px] text-slate-400 font-medium">Opening Balance</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {previewData.opening_balance_minor !== null
                        ? formatINR(previewData.opening_balance_minor)
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                    <p className="text-[11px] text-slate-400 font-medium">Net Cash Flow</p>
                    <p
                      className={`text-sm font-bold mt-0.5 ${
                        (previewData.net_cash_flow_minor || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {formatINR(previewData.net_cash_flow_minor || 0)}
                    </p>
                  </div>
                  <div className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-xs">
                    <p className="text-[11px] text-slate-400 font-medium">Closing Balance</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">
                      {previewData.closing_balance_minor !== null
                        ? formatINR(previewData.closing_balance_minor)
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Reconciliation Proof Banner */}
                <div
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                    previewData.reconciliation_status === 'PASSED'
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                      : previewData.reconciliation_status.startsWith('DISCREPANCY')
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {previewData.reconciliation_status === 'PASSED' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                    <span className="font-semibold">
                      Reconciliation: {previewData.reconciliation_status}
                    </span>
                  </div>

                  {previewData.running_balance_status === 'PASSED' && (
                    <span className="text-[11px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">
                      Row Running Balances Verified
                    </span>
                  )}
                </div>
              </div>

              {/* Column Mapping Review & Customization */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div
                  onClick={() => setShowMappingEditor(!showMappingEditor)}
                  className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/70 transition"
                >
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-800">
                      Column Mappings
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        previewData.is_ambiguous
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {previewData.is_ambiguous ? 'Ambiguous' : `${Math.round(previewData.mapping_confidence * 100)}% Confidence`}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      showMappingEditor ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {showMappingEditor && (
                  <div className="p-4 bg-white space-y-4">
                    {previewData.is_ambiguous && previewData.ambiguity_reasons?.length > 0 && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                        {previewData.ambiguity_reasons.map((r: string, idx: number) => (
                          <p key={idx}>• {r}</p>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {['date', 'description', 'withdrawal', 'deposit', 'amount', 'balance'].map((field) => (
                        <div key={field}>
                          <label className="block text-[11px] font-semibold text-slate-600 uppercase mb-1">
                            {field}
                          </label>
                          <select
                            value={columnMapping[field] !== undefined ? columnMapping[field] : -1}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              const updated = { ...columnMapping };
                              if (val === -1) {
                                delete updated[field];
                              } else {
                                updated[field] = val;
                              }
                              setColumnMapping(updated);
                            }}
                            className="w-full bg-white border border-slate-200 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-blue-500"
                          >
                            <option value={-1}>-- Not Mapped --</option>
                            {availableHeaders.map((hdr, idx) => (
                              <option key={idx} value={idx}>
                                Col {idx + 1}: {hdr || `[Column ${idx + 1}]`}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => handlePreview(columnMapping)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Re-Preview with Custom Mapping
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Warnings List (if any) */}
              {previewData.warnings?.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Row Parsing Warnings ({previewData.warnings.length})
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-0.5 text-[11px] text-amber-700">
                    {previewData.warnings.map((w: string, idx: number) => (
                      <p key={idx}>• {w}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Sample Rows Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Extracted Sample Transactions (First {previewData.sample_rows?.length || 0})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Normalized into canonical contract
                  </span>
                </div>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0">
                      <tr>
                        <th className="py-2 px-3 border-b border-slate-200">Date</th>
                        <th className="py-2 px-3 border-b border-slate-200">Description</th>
                        <th className="py-2 px-3 border-b border-slate-200">Channel</th>
                        <th className="py-2 px-3 border-b border-slate-200 text-right">Amount (₹)</th>
                        <th className="py-2 px-3 border-b border-slate-200 text-right">Running Bal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData.sample_rows?.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                            {row.posted_date}
                          </td>
                          <td className="py-2 px-3 text-slate-800 font-medium max-w-xs truncate" title={row.raw_description}>
                            {row.normalized_description || row.raw_description}
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold border border-slate-200">
                              {row.channel || 'OTHER'}
                            </span>
                          </td>
                          <td
                            className={`py-2 px-3 text-right font-semibold ${
                              row.amount_minor > 0 ? 'text-emerald-600' : 'text-slate-900'
                            }`}
                          >
                            {formatINR(row.amount_minor)}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500 font-mono text-[11px]">
                            {row.balance_after_minor !== null ? formatINR(row.balance_after_minor) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => setPreviewData(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
                >
                  Choose Different File
                </button>

                <button
                  disabled={commitLoading}
                  onClick={handleCommit}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition"
                >
                  {commitLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Ingesting & Deduplicating...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Ingest Statement</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

