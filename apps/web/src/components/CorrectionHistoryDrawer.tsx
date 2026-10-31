'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  History, 
  Layers, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { DEFAULT_CATEGORIES } from '@fdl/shared';
import { api } from '@/lib/api';

interface CorrectionHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUndoSuccess: (result: any) => void;
}

export default function CorrectionHistoryDrawer({
  isOpen,
  onClose,
  onUndoSuccess,
}: CorrectionHistoryDrawerProps) {
  const [corrections, setCorrections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen]);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCorrectionHistory({ limit: 30 });
      setCorrections(res?.corrections || []);
    } catch (err: any) {
      console.error('Failed to load corrections history:', err);
      setError('Unable to load correction history.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUndo(logId: string) {
    setUndoingId(logId);
    setError(null);
    try {
      const res = await api.undoCategoryCorrection(logId);
      await loadHistory();
      onUndoSuccess(res);
    } catch (err: any) {
      console.error('Failed to undo correction:', err);
      setError(err?.message || 'Failed to undo correction.');
    } finally {
      setUndoingId(null);
    }
  }

  function getCategoryName(catId: string) {
    const found = DEFAULT_CATEGORIES.find((c) => c.id === catId);
    return found ? found.name : catId.replace('cat_', '').replace(/_/g, ' ');
  }

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-screen max-w-md bg-card border-l border-border shadow-2xl flex flex-col text-card-foreground"
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-foreground">Correction History</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Audit log of user-initiated category overrides and rollbacks.
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

            {/* Error Banner */}
            {error && (
              <div className="m-4 p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              {loading && (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p>Loading correction audit logs...</p>
                </div>
              )}

              {!loading && corrections.length === 0 && (
                <div className="text-center py-16 text-muted-foreground space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="font-semibold text-foreground text-sm">No Corrections Recorded</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    When you override a transaction's category, the audit trail and 1-click rollback will be preserved here.
                  </p>
                </div>
              )}

              {!loading &&
                corrections.map((c) => {
                  const isUndone = c.is_undone;
                  const beforeVal = c.before ? Object.values(c.before)[0] : 'cat_uncategorized';
                  const afterVal = c.after ? Object.values(c.after)[0] : 'cat_uncategorized';

                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl border transition ${
                        isUndone
                          ? 'bg-muted/30 border-border/60 opacity-65'
                          : 'bg-card border-border shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {c.timestamp ? new Date(c.timestamp).toLocaleString() : 'Recent'}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isUndone
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isUndone ? 'Undone' : 'Active'}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center gap-2 text-foreground font-semibold">
                        <span className="px-2 py-0.5 rounded bg-muted border border-border text-[11px] truncate">
                          {getCategoryName(String(beforeVal))}
                        </span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary text-[11px] truncate">
                          {getCategoryName(String(afterVal))}
                        </span>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                          <strong>{c.affected_count}</strong> row{c.affected_count !== 1 ? 's' : ''}{' '}
                          ({c.scope === 'same_merchant' ? 'Merchant' : 'Single'})
                        </span>

                        {!isUndone && (
                          <button
                            type="button"
                            onClick={() => handleUndo(c.id)}
                            disabled={undoingId === c.id}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-[11px] font-bold transition border border-border shadow-xs disabled:opacity-50"
                          >
                            <RotateCcw className={`w-3 h-3 ${undoingId === c.id ? 'animate-spin' : ''}`} />
                            <span>{undoingId === c.id ? 'Undoing...' : 'Undo'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
