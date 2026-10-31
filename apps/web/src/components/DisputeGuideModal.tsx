'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldAlert, Copy, Check, ExternalLink, AlertTriangle, Building2, Calendar, FileText } from 'lucide-react';
import { formatINR } from '@fdl/shared';

interface DisputeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  anomaly: any | null;
  mode: 'real_duplicate' | 'disputed';
  onConfirmed?: () => void;
}

export default function DisputeGuideModal({
  isOpen,
  onClose,
  anomaly,
  mode,
  onConfirmed,
}: DisputeGuideModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !anomaly) return null;

  const isDuplicate = mode === 'real_duplicate' || anomaly.type === 'duplicate_charge';
  const amountPaise = anomaly.amount_paise ?? anomaly.amount_minor ?? anomaly.amount ?? 0;
  const merchant = anomaly.merchant || anomaly.normalized_description || 'Merchant';

  const disputeText = `DISPUTE NOTICE:
Transaction Date: ${anomaly.posted_date || anomaly.detected_at?.slice(0, 10) || 'Recent'}
Merchant: ${merchant}
Amount: ${formatINR(amountPaise)}
Bank Account: ${anomaly.bank_name || 'Bank'} (••••${anomaly.masked_last4 || 'XXXX'})
Channel: ${anomaly.channel || 'OTHER'}
Transaction ID: ${anomaly.txn_id || anomaly.id}
Reason: ${isDuplicate ? 'Potential accidental duplicate charge within 3 days' : 'Unrecognized or unauthorized transaction'}
Statement Reason: ${anomaly.reason_text}`;

  function handleCopy() {
    navigator.clipboard.writeText(disputeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-10 text-card-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-destructive/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-destructive/20 text-destructive">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">
                  {isDuplicate ? 'Duplicate Charge Dispute Guide' : 'Transaction Dispute & Resolution'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Actionable steps to reverse unrecognized or accidental double debits
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Transaction Overview Card */}
            <div className="p-4 rounded-xl bg-muted border border-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground text-sm font-sans truncate max-w-xs">
                  {merchant}
                </span>
                <span className="text-sm font-mono font-bold text-destructive">
                  {formatINR(amountPaise)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-2 border-t border-border/60">
                <div className="flex items-center gap-1.5 font-mono">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  <span>{anomaly.posted_date || anomaly.detected_at?.slice(0, 10)}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span>{anomaly.bank_name} ••••{anomaly.masked_last4}</span>
                </div>
              </div>
            </div>

            {/* Explanation Notice */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-sans">
                <span className="font-semibold">Detection Reason: </span>
                <span>{anomaly.reason_text}</span>
              </div>
            </div>

            {/* Step-by-Step Remediation Checklist */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recommended Action Checklist
              </h4>

              <div className="space-y-2.5 text-xs text-foreground">
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[11px] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-semibold">Check Merchant App / Order History</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                      Check your order history on the merchant app (e.g. Swiggy, Amazon, Uber) to confirm whether this was an automatic retry or pending authorization hold.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[11px] shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="font-semibold">Raise a Ticket with Merchant Support</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                      Contact merchant customer support quoting the transaction amount and date. Most merchants initiate instant auto-refunds for duplicate charges within 24–48 hours.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-card border border-border">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/15 text-primary font-bold text-[11px] shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="font-semibold">Initiate a Bank Chargeback / Fraud Dispute</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">
                      If the merchant refuses or does not reverse the charge, log into your {anomaly.bank_name || 'bank'} netbanking portal or app and file an official dispute/chargeback within 30 days of the statement date.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Copyable Summary Box */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground">Dispute Claim Text Template</span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-primary hover:underline font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Template</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                readOnly
                value={disputeText}
                rows={4}
                className="w-full bg-input border border-border rounded-xl p-3 text-[11px] font-mono text-muted-foreground resize-none focus:outline-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition shadow-xs"
            >
              Done Reviewing
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
