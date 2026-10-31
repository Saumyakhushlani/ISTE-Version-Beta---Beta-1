'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, 
  X, 
  Save, 
  AlertCircle, 
  Sparkles, 
  CreditCard,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatINR } from '@fdl/shared';

export interface AccountRecord {
  id: string;
  user_id: string;
  bank: string;
  nickname: string;
  type: string;
  masked_last4: string;
  opening_balance_minor: number;
  current_balance_minor?: number;
  transaction_count?: number;
  currency: string;
  is_primary: boolean;
  status: string;
  account_holder_name?: string;
  ifsc?: string;
  created_at?: string;
}

interface EditAccountModalProps {
  account: AccountRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}

export default function EditAccountModal({
  account,
  isOpen,
  onClose,
  onSuccess,
}: EditAccountModalProps) {
  const [bank, setBank] = useState('');
  const [nickname, setNickname] = useState('');
  const [type, setType] = useState('savings');
  const [last4, setLast4] = useState('');
  const [balanceRupees, setBalanceRupees] = useState('');
  const [holderName, setHolderName] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (account) {
      setBank(account.bank || 'HDFC Bank');
      setNickname(account.nickname || '');
      setType(account.type || 'savings');
      setLast4(account.masked_last4 || '');
      setBalanceRupees(((account.opening_balance_minor || 0) / 100).toString());
      setHolderName(account.account_holder_name || '');
      setIfsc(account.ifsc || '');
      setIsPrimary(!!account.is_primary);
      setErrorMessage(null);
    }
  }, [account, isOpen]);

  if (!isOpen || !account) return null;

  const currentEnteredPaise = Math.round((parseFloat(balanceRupees) || 0) * 100);
  
  // Calculate existing transaction movements
  const originalOpeningPaise = account.opening_balance_minor || 0;
  const originalCurrentPaise = account.current_balance_minor !== undefined 
    ? account.current_balance_minor 
    : originalOpeningPaise;
  const netTransactionMovements = originalCurrentPaise - originalOpeningPaise;
  const projectedCurrentBalance = currentEnteredPaise + netTransactionMovements;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const cleanLast4 = last4.replace(/\D/g, '').slice(-4).padStart(4, '0');
    const openingMinor = Math.round(parseFloat(balanceRupees || '0') * 100);

    try {
      await api.updateUserAccount(account.id, {
        bank: bank.trim(),
        nickname: nickname.trim() || `${bank.trim()} Account`,
        type,
        masked_last4: cleanLast4,
        opening_balance_minor: openingMinor,
        currency: account.currency || 'INR',
        is_primary: isPrimary,
        account_holder_name: holderName.trim() || undefined,
        ifsc: ifsc.trim().toUpperCase() || undefined,
      });

      await onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.detail || err.message || 'Failed to update account details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
        {/* Backdrop click */}
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Edit Bank Account</h2>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {account.bank} · •••• {account.masked_last4}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition hover:bg-muted/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Opening Balance Highlight Card */}
            <div className="bg-primary/5 border border-primary/25 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  <span>Opening Balance (Starting Amount)</span>
                </label>
                <span className="text-[11px] font-mono font-bold text-primary">
                  {formatINR(currentEnteredPaise)}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  required
                  value={balanceRupees}
                  onChange={(e) => setBalanceRupees(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-input border border-primary/30 rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This opening amount anchors all statement reconciliations. Any imported transaction inflows and outflows for this account will be summed onto this starting figure.
              </p>

              {/* Dynamic Balance Projection */}
              <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono">
                <span className="text-muted-foreground">Projected Reconciled Liquidity:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatINR(projectedCurrentBalance)}
                </span>
              </div>
            </div>

            {/* Bank & Nickname */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Bank Name
                </label>
                <select
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="State Bank of India">State Bank of India (SBI)</option>
                  <option value="ICICI Bank">ICICI Bank</option>
                  <option value="Axis Bank">Axis Bank</option>
                  <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                  <option value="PhonePe">PhonePe Wallet</option>
                  <option value="Paytm Payments Bank">Paytm</option>
                  <option value="Other Bank">Other Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Account Nickname
                </label>
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="e.g. Salary Account"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Type & Last 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Account Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="savings">Savings Account</option>
                  <option value="current">Current Account</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="wallet">Digital Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Last 4 Digits
                </label>
                <input
                  type="text"
                  maxLength={4}
                  required
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1180"
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
              </div>
            </div>

            {/* IFSC Code */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                IFSC Code (Optional)
              </label>
              <input
                type="text"
                maxLength={11}
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                placeholder="e.g. HDFC0001234"
                className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase"
              />
            </div>

            {/* Primary Account Checkbox */}
            <div className="pt-2 border-t border-border">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">Set as Primary Account</p>
                  <p className="text-[11px] text-muted-foreground">
                    Primary account receives default income credits and anchors the primary safety buffer floor.
                  </p>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
