'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Tag, 
  Check, 
  ArrowRight, 
  Sparkles, 
  Layers, 
  AlertCircle,
  Building,
  Calendar,
  HelpCircle
} from 'lucide-react';
import { DEFAULT_CATEGORIES, formatINR } from '@fdl/shared';
import { api } from '@/lib/api';

interface RecategorizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: any | null;
  onSuccess: (result: {
    log_id: string;
    affected_count: number;
    new_category_id: string;
    previous_category_id: string;
    merchant: string;
  }) => void;
}

const CATEGORY_GROUPS = [
  { id: 'essential', label: 'Essential Living', color: 'text-indigo-600 dark:text-indigo-400' },
  { id: 'committed', label: 'Committed & Debt', color: 'text-rose-600 dark:text-rose-400' },
  { id: 'discretionary', label: 'Discretionary & Lifestyle', color: 'text-amber-600 dark:text-amber-400' },
  { id: 'income', label: 'Income & Inflows', color: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'system', label: 'Transfers & System', color: 'text-slate-600 dark:text-slate-400' },
];

export default function RecategorizeModal({
  isOpen,
  onClose,
  transaction,
  onSuccess,
}: RecategorizeModalProps) {
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [scope, setScope] = useState<'same_merchant' | 'this_txn'>('same_merchant');
  const [dryRunLoading, setDryRunLoading] = useState(false);
  const [affectedCount, setAffectedCount] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const merchantName =
    transaction?.normalized_description ||
    transaction?.merchant_id ||
    transaction?.raw_description ||
    'This Transaction';

  const hasMerchant = Boolean(transaction?.normalized_description || transaction?.merchant_id);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (transaction && isOpen) {
      setSelectedCatId(transaction.category_id || 'cat_uncategorized');
      setScope(hasMerchant ? 'same_merchant' : 'this_txn');
      setAffectedCount(1);
      setError(null);
    }
  }, [transaction, isOpen, hasMerchant]);

  // Run dry-run calculation whenever category or scope changes
  useEffect(() => {
    if (!isOpen || !transaction?.id || !selectedCatId) return;

    let isMounted = true;
    setDryRunLoading(true);

    api
      .updateTransactionCategory(transaction.id, {
        category_id: selectedCatId,
        scope,
        dry_run: true,
      })
      .then((res) => {
        if (isMounted) {
          setAffectedCount(res?.affected_count || 1);
        }
      })
      .catch((err) => {
        console.warn('Dry-run preview failed:', err);
        if (isMounted) {
          setAffectedCount(scope === 'this_txn' ? 1 : 1);
        }
      })
      .finally(() => {
        if (isMounted) setDryRunLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, transaction?.id, selectedCatId, scope]);

  if (!isOpen || !transaction) return null;

  const currentCategory = DEFAULT_CATEGORIES.find((c) => c.id === transaction.category_id);
  const targetCategory = DEFAULT_CATEGORIES.find((c) => c.id === selectedCatId);

  const handleApply = async () => {
    if (!selectedCatId) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.updateTransactionCategory(transaction.id, {
        category_id: selectedCatId,
        scope,
        dry_run: false,
      });

      onSuccess({
        log_id: res.log_id || res.correction_log_id,
        affected_count: res.affected_count || affectedCount,
        new_category_id: selectedCatId,
        previous_category_id: transaction.category_id || 'cat_uncategorized',
        merchant: merchantName,
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to update category:', err);
      setError(err?.message || 'Failed to update category. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10 text-card-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-foreground">Re-categorize Transaction</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update category assignment with automatic merchant propagation and instant undo.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Content Scrollable Area */}
          <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
            {/* Transaction Context Card */}
            <div className="bg-muted/50 border border-border rounded-xl p-3.5 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                    <Building className="w-3 h-3" /> Merchant / Payee
                  </span>
                  <p className="text-sm font-bold text-foreground mt-0.5">{merchantName}</p>
                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate max-w-xs sm:max-w-md">
                    {transaction.raw_description}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center justify-end gap-1">
                    <Calendar className="w-3 h-3" /> {transaction.posted_date}
                  </span>
                  <p
                    className={`text-sm font-extrabold font-mono mt-0.5 ${
                      transaction.amount_minor > 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-foreground'
                    }`}
                  >
                    {transaction.amount_minor > 0 ? '+' : ''}
                    {formatINR(transaction.amount_minor)}
                  </p>
                </div>
              </div>
            </div>

            {/* Scope Selection */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-2">
                Propagation Scope
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={!hasMerchant}
                  onClick={() => setScope('same_merchant')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    scope === 'same_merchant'
                      ? 'bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                  } ${!hasMerchant ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      All "{merchantName}"
                    </span>
                    {scope === 'same_merchant' && (
                      <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                    Updates this row and all historical/future transactions matching this merchant name.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setScope('this_txn')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    scope === 'this_txn'
                      ? 'bg-primary/10 border-primary text-foreground shadow-xs ring-1 ring-primary'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-border/80'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                      This Transaction Only
                    </span>
                    {scope === 'this_txn' && (
                      <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                    Only updates this single record. Other transactions with the same merchant are untouched.
                  </p>
                </button>
              </div>
            </div>

            {/* Target Category Picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-foreground">Select New Category</label>
                {currentCategory && (
                  <span className="text-[11px] text-muted-foreground">
                    Current:{' '}
                    <span className="font-semibold text-foreground">{currentCategory.name}</span>
                  </span>
                )}
              </div>

              <div className="space-y-3.5 max-h-56 overflow-y-auto pr-1">
                {CATEGORY_GROUPS.map((group) => {
                  const categoriesInGroup = DEFAULT_CATEGORIES.filter((c) => c.kind === group.id);
                  if (categoriesInGroup.length === 0) return null;

                  return (
                    <div key={group.id} className="space-y-1.5">
                      <p className={`text-[11px] font-bold uppercase tracking-wider ${group.color}`}>
                        {group.label}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {categoriesInGroup.map((cat) => {
                          const isSelected = selectedCatId === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setSelectedCatId(cat.id)}
                              className={`px-2.5 py-1.5 rounded-lg border text-left transition flex items-center justify-between text-xs ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                  : 'bg-card border-border text-foreground hover:bg-muted/70 hover:border-border/90'
                              }`}
                            >
                              <span className="truncate">{cat.name}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Impact Diff Preview Banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span className="text-foreground">
                  {dryRunLoading ? (
                    <span className="text-muted-foreground">Calculating affected rows...</span>
                  ) : (
                    <span>
                      Impact:{' '}
                      <strong className="text-primary font-bold">
                        {affectedCount} transaction{affectedCount !== 1 ? 's' : ''}
                      </strong>{' '}
                      will be assigned to{' '}
                      <strong className="text-foreground">
                        {targetCategory?.name || 'Selected Category'}
                      </strong>
                    </span>
                  )}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono uppercase px-2 py-0.5 rounded bg-muted border border-border shrink-0">
                {scope === 'same_merchant' ? 'Cascade' : 'Single'}
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={submitting || !selectedCatId}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <span>Applying Changes...</span>
              ) : (
                <>
                  <span>
                    Apply to {affectedCount} Transaction{affectedCount !== 1 ? 's' : ''}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
