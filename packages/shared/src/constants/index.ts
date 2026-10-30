/**
 * Default Domain Constants & Configuration
 * Sourced directly from PRD Appendix B
 */

export const DOMAIN_CONSTANTS = {
  // Data Sufficiency Gate
  MIN_HISTORY_DAYS: 90,
  MAX_TOLERATED_GAP_DAYS: 7,
  STALENESS_LIMIT_DAYS: 45,
  UNCATEGORIZED_SPEND_WARNING_PCT: 30,

  // Deduplication & Transfers
  DEDUPE_DATE_TOLERANCE_DAYS: 0,
  TRANSFER_DATE_TOLERANCE_DAYS: 2,
  TRANSFER_FEE_TOLERANCE_PAISE: 2500, // ₹25.00
  DUPLICATE_CHARGE_WINDOW_DAYS: 3,

  // Anomaly Detection
  ANOMALY_MODIFIED_Z_THRESHOLD: 3.5,
  NEW_MERCHANT_MIN_AMOUNT_PAISE: 150000, // ₹1,500.00

  // Recurring Payments
  RECURRING_MIN_MONTHLY_OCCURRENCES: 3,
  RECURRING_MIN_ANNUAL_OCCURRENCES: 2,

  // Monte Carlo Simulation
  MONTE_CARLO_RUNS: 5000,
  DEFAULT_FORECAST_HORIZON_DAYS: 90,

  // Income Volatility CV Bands
  INCOME_STABLE_CV_MAX: 0.10,
  INCOME_VARIABLE_CV_MAX: 0.30,

  // Safety Buffer Multipliers (k)
  BUFFER_K_STABLE: 1.0,
  BUFFER_K_VARIABLE: 1.5,
  BUFFER_K_IRREGULAR: 2.0,
  BUFFER_FLOOR_PAISE: 500000, // ₹5,000.00

  // Affordability Verdict Probabilities
  AFFORDABLE_MAX_BREACH_PROB: 0.10,
  NOT_AFFORDABLE_MIN_NEGATIVE_PROB: 0.25,
} as const;

export const DEFAULT_CATEGORIES = [
  { id: 'cat_income_salary', name: 'Salary', kind: 'income', color: '#10b981' },
  { id: 'cat_income_freelance', name: 'Freelance & Contract', kind: 'income', color: '#34d399' },
  { id: 'cat_income_refund', name: 'Refund & Reversal', kind: 'income', color: '#6ee7b7' },
  { id: 'cat_income_other', name: 'Other Income', kind: 'income', color: '#a7f3d0' },

  { id: 'cat_rent', name: 'Rent & Housing', kind: 'essential', color: '#6366f1' },
  { id: 'cat_utilities', name: 'Utilities & Bills', kind: 'essential', color: '#3b82f6' },
  { id: 'cat_groceries', name: 'Groceries', kind: 'essential', color: '#0ea5e9' },
  { id: 'cat_health', name: 'Health & Medical', kind: 'essential', color: '#14b8a6' },
  { id: 'cat_transport', name: 'Transport & Fuel', kind: 'essential', color: '#f59e0b' },
  
  { id: 'cat_emi', name: 'Loan & EMI', kind: 'committed', color: '#ef4444' },
  { id: 'cat_insurance', name: 'Insurance', kind: 'committed', color: '#ec4899' },
  { id: 'cat_sip', name: 'Investments & SIP', kind: 'committed', color: '#8b5cf6' },
  { id: 'cat_subscriptions', name: 'Subscriptions', kind: 'committed', color: '#a855f7' },

  { id: 'cat_food_dining', name: 'Dining & Takeout', kind: 'discretionary', color: '#f97316' },
  { id: 'cat_shopping', name: 'Shopping & Electronics', kind: 'discretionary', color: '#eab308' },
  { id: 'cat_travel', name: 'Travel & Vacations', kind: 'discretionary', color: '#06b6d4' },
  { id: 'cat_entertainment', name: 'Entertainment', kind: 'discretionary', color: '#d946ef' },

  { id: 'cat_transfer', name: 'Internal Transfer', kind: 'system', color: '#94a3b8' },
  { id: 'cat_uncategorized', name: 'Uncategorized', kind: 'discretionary', color: '#64748b' },
] as const;
