'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, DollarSign, Tag, Clock, AlertCircle, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface EditRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
  onSuccess: () => void;
}

export default function EditRecurringModal({
  isOpen,
  onClose,
  item,
  onSuccess,
}: EditRecurringModalProps) {
  const [rupees, setRupees] = useState<string>('');
  const [nextDate, setNextDate] = useState<string>('');
  const [type, setType] = useState<string>('subscription');
  const [cadence, setCadence] = useState<string>('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      const paise = item.typical_amount_minor ?? item.typical_amount_paise ?? 0;
      setRupees((paise / 100).toString());
      setNextDate(item.next_expected_date || '');
      setType(item.type || 'subscription');
      setCadence(item.cadence || 'monthly');
      setError(null);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numRupees = parseFloat(rupees);
    if (isNaN(numRupees) || numRupees <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (!nextDate) {
      setError('Please select a valid next expected payment date.');
      return;
    }

    setSubmitting(true);
    try {
      const paise = Math.round(numRupees * 100);
      await api.updateRecurringItem(item.id, {
        typical_amount_minor: paise,
        next_expected_date: nextDate,
        type,
        cadence,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update recurring commitment:', err);
      setError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
          className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-10 text-card-foreground"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
            <div>
              <h2 className="text-base font-bold text-foreground">Edit Commitment</h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs font-mono">
                {item.merchant}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Expected Amount in Rupees */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-primary" />
                Typical Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs font-mono text-muted-foreground">₹</span>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={rupees}
                  onChange={(e) => setRupees(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full bg-input border border-border rounded-xl pl-8 pr-4 py-2 text-xs font-mono text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                  required
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Converted strictly to integer paise for deterministic headroom math.
              </p>
            </div>

            {/* Next Expected Date */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Next Expected Payment Date
              </label>
              <input
                type="date"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
                required
              />
            </div>

            {/* Cadence and Type Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Cadence
                </label>
                <select
                  value={cadence}
                  onChange={(e) => setCadence(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs capitalize"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annual">Annual</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  Category Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-input border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs capitalize"
                >
                  <option value="subscription">Subscription</option>
                  <option value="emi">Loan EMI</option>
                  <option value="rent">Rent</option>
                  <option value="utility">Utility</option>
                  <option value="insurance">Insurance</option>
                  <option value="sip">SIP / Investment</option>
                  <option value="salary">Salary (Inflow)</option>
                </select>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition shadow-xs disabled:opacity-50"
              >
                {submitting ? (
                  <span className="animate-spin text-xs">⏳</span>
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Save Commitment</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
