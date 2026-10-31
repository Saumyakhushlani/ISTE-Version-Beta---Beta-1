'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sliders, 
  X, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles, 
  DollarSign, 
  Clock, 
  Calendar,
  AlertCircle,
  Percent,
  Layers
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatINR } from '@fdl/shared';

interface CustomScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddScenario: (scenario: any) => void;
  purchaseAmountMinor: number;
}

export default function CustomScenarioModal({
  isOpen,
  onClose,
  onAddScenario,
  purchaseAmountMinor,
}: CustomScenarioModalProps) {
  const [scenarioName, setScenarioName] = useState('');
  const [adjustments, setAdjustments] = useState<any[]>([]);

  // Adjustment form states
  const [selectedType, setSelectedType] = useState<string>('purchase_emi');
  const [recurringOptions, setRecurringOptions] = useState<any[]>([]);
  const [selectedRecurringMerchant, setSelectedRecurringMerchant] = useState<string>('');

  // EMI adjustment parameters
  const [emiMonths, setEmiMonths] = useState<number>(6);
  const [emiRate, setEmiRate] = useState<number>(0.0);

  // Delay parameters
  const [delayMonths, setDelayMonths] = useState<number>(2);

  // Income / Expense shock parameters
  const [shockPercent, setShockPercent] = useState<number>(15);

  useEffect(() => {
    if (isOpen) {
      // Load recurring obligations
      api.getScenarioRecurringOptions()
        .then((items: any[]) => {
          if (Array.isArray(items)) {
            setRecurringOptions(items);
            if (items.length > 0) {
              setSelectedRecurringMerchant(items[0].merchant);
            }
          }
        })
        .catch((err) => console.error('Failed to load recurring options:', err));

      setScenarioName('Custom Strategy');
      setAdjustments([
        { type: 'purchase_emi', params: { months: 6, interest_rate_pct: 0.0 } }
      ]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddAdjustment = () => {
    let newAdj: any = null;

    if (selectedType === 'purchase_emi') {
      newAdj = {
        type: 'purchase_emi',
        params: { months: emiMonths, interest_rate_pct: emiRate },
      };
    } else if (selectedType === 'cancel_recurring') {
      newAdj = {
        type: 'cancel_recurring',
        params: { merchant: selectedRecurringMerchant },
      };
    } else if (selectedType === 'delay_purchase') {
      newAdj = {
        type: 'delay_purchase',
        params: { months: delayMonths },
      };
    } else if (selectedType === 'income_shock') {
      newAdj = {
        type: 'income_shock',
        params: { reduction_pct: shockPercent },
      };
    } else if (selectedType === 'expense_shock') {
      newAdj = {
        type: 'expense_shock',
        params: { cut_pct: shockPercent },
      };
    }

    if (newAdj) {
      setAdjustments([...adjustments, newAdj]);
    }
  };

  const handleRemoveAdjustment = (idx: number) => {
    setAdjustments(adjustments.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (adjustments.length === 0) return;
    onAddScenario({
      name: scenarioName.trim() || 'Custom Scenario',
      adjustments,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
        <div className="fixed inset-0" onClick={onClose} />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Compose Custom What-If Scenario</h2>
                <p className="text-[11px] text-muted-foreground">
                  Simulate adjustments side-by-side without changing your active financial ledger.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Scenario Name */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Scenario Name
              </label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g. Cancel Netflix + 6m No-Cost EMI"
                className="w-full bg-input border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              />
            </div>

            {/* Adjustments Chain List */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground">
                Active Adjustments in this Scenario ({adjustments.length})
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {adjustments.map((adj, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-muted/50 border border-border rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <span className="font-semibold text-foreground">
                        {adj.type === 'purchase_emi' && `${adj.params.months}-Month EMI (${adj.params.interest_rate_pct || 0}% p.a.)`}
                        {adj.type === 'cancel_recurring' && `Cancel ${adj.params.merchant}`}
                        {adj.type === 'delay_purchase' && `Delay Purchase by ${adj.params.months} Months`}
                        {adj.type === 'income_shock' && `Income Shock (-${adj.params.reduction_pct}%)`}
                        {adj.type === 'expense_shock' && `Cut Discretionary Spend (-${adj.params.cut_pct}%)`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAdjustment(idx)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {adjustments.length === 0 && (
                  <p className="text-xs text-muted-foreground p-3 border border-dashed border-border rounded-xl text-center">
                    No adjustments added yet. Choose an adjustment below and click &quot;Add Adjustment&quot;.
                  </p>
                )}
              </div>
            </div>

            {/* Add Adjustment Form */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Add Adjustment to Scenario</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Adjustment Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="purchase_emi">EMI Financing</option>
                    <option value="cancel_recurring">Cancel Active Subscription</option>
                    <option value="delay_purchase">Delay Purchase</option>
                    <option value="expense_shock">Cut Discretionary Spend</option>
                    <option value="income_shock">Income Shock</option>
                  </select>
                </div>

                {/* Sub-parameters depending on type */}
                {selectedType === 'purchase_emi' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Tenure</label>
                      <select
                        value={emiMonths}
                        onChange={(e) => setEmiMonths(Number(e.target.value))}
                        className="w-full bg-input border border-border rounded-lg px-2 py-1.5 text-xs text-foreground cursor-pointer"
                      >
                        <option value={3}>3 Mo</option>
                        <option value={6}>6 Mo</option>
                        <option value={9}>9 Mo</option>
                        <option value={12}>12 Mo</option>
                        <option value={24}>24 Mo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Interest %</label>
                      <input
                        type="number"
                        step="0.5"
                        value={emiRate}
                        onChange={(e) => setEmiRate(Number(e.target.value))}
                        placeholder="0.0"
                        className="w-full bg-input border border-border rounded-lg px-2 py-1.5 text-xs text-foreground"
                      />
                    </div>
                  </div>
                )}

                {selectedType === 'cancel_recurring' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Select Subscription</label>
                    <select
                      value={selectedRecurringMerchant}
                      onChange={(e) => setSelectedRecurringMerchant(e.target.value)}
                      className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground cursor-pointer"
                    >
                      {recurringOptions.map((item, i) => (
                        <option key={i} value={item.merchant}>
                          {item.merchant} ({formatINR(item.typical_amount_minor)}/mo)
                        </option>
                      ))}
                      {recurringOptions.length === 0 && <option value="Netflix">Netflix (₹649/mo)</option>}
                    </select>
                  </div>
                )}

                {selectedType === 'delay_purchase' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Delay Duration</label>
                    <select
                      value={delayMonths}
                      onChange={(e) => setDelayMonths(Number(e.target.value))}
                      className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground cursor-pointer"
                    >
                      <option value={1}>1 Month</option>
                      <option value={2}>2 Months</option>
                      <option value={3}>3 Months</option>
                      <option value={6}>6 Months</option>
                    </select>
                  </div>
                )}

                {(selectedType === 'income_shock' || selectedType === 'expense_shock') && (
                  <div>
                    <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Percentage (%)</label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={shockPercent}
                      onChange={(e) => setShockPercent(Number(e.target.value))}
                      className="w-full bg-input border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddAdjustment}
                  className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Adjustment</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={adjustments.length === 0}
                className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-semibold flex items-center gap-2 transition shadow-xs disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Add to Comparison Matrix</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
