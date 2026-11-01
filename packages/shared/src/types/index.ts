/**
 * Financial Decision Lab (FDL) - Core Type Definitions
 * All currency amounts are represented in integer paise (1 INR = 100 paise) to prevent floating-point inaccuracies.
 */

export type MinorAmount = number; // Integer paise, e.g. 8000000 = ₹80,000.00

export type AccountType = 'savings' | 'current' | 'credit_card' | 'wallet' | 'loan';

export interface Account {
  id: string;
  user_id?: string;
  nickname: string;
  bank: string;
  type: AccountType;
  masked_last4: string;
  opening_balance_minor: MinorAmount;
  currency: string;
  is_primary?: boolean;
  status?: 'active' | 'archived';
  account_holder_name?: string | null;
  ifsc?: string | null;
  created_at: string;
}

export type Channel = 'UPI' | 'NEFT' | 'IMPS' | 'ATM' | 'POS' | 'NACH' | 'ACH' | 'CHQ' | 'BILLDESK' | 'CRED' | 'OTHER';

export type CategoryKind = 'income' | 'essential' | 'committed' | 'discretionary' | 'system';

export interface Category {
  id: string;
  name: string;
  parent_id?: string | null;
  kind: CategoryKind;
  color?: string;
}

export type CategorySource = 'rule' | 'ml' | 'llm' | 'user';

export interface Transaction {
  id: string;
  user_id?: string;
  account_id: string;
  source_file_id: string;
  source_row: number;
  posted_date: string; // ISO date YYYY-MM-DD
  value_date?: string;
  amount_minor: MinorAmount; // signed: debit < 0, credit > 0
  currency: string;
  raw_description: string;
  normalized_description: string;
  channel: Channel;
  merchant_id?: string;
  category_id: string;
  category_source: CategorySource;
  category_confidence: number;
  balance_after_minor?: MinorAmount;
  fingerprint: string;
  occurrence_index: number;
  is_transfer: boolean;
  transfer_pair_id?: string;
  dup_group_id?: string;
  status: 'active' | 'merged' | 'excluded';
  created_at: string;
}

export type RecurringCadence = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
export type RecurringType = 'subscription' | 'emi' | 'rent' | 'utility' | 'insurance' | 'sip' | 'salary' | 'other_recurring';
export type RecurringStatus = 'active' | 'possibly_ended' | 'paused';
export type RecurringUserStatus = 'auto' | 'confirmed' | 'rejected';

export interface RecurringItem {
  id: string;
  user_id?: string;
  account_id?: string | null;
  merchant: string;
  type: RecurringType;
  cadence: RecurringCadence;
  typical_amount_minor: MinorAmount;
  amount_min_minor: MinorAmount;
  amount_max_minor: MinorAmount;
  last_paid_date: string;
  next_expected_date: string;
  occurrences: number;
  confidence: number;
  status: RecurringStatus;
  user_status: RecurringUserStatus;
  is_manual?: boolean;
}

export type AnomalyType = 
  | 'large_amount' 
  | 'duplicate_charge' 
  | 'new_merchant' 
  | 'recurring_change' 
  | 'missed_recurring' 
  | 'unusual_volume' 
  | 'fee_penalty' 
  | 'income_anomaly';

export interface Anomaly {
  id: string;
  txn_id: string;
  type: AnomalyType;
  rule_id: string;
  amount_minor: MinorAmount;
  reason_text: string;
  severity: 'low' | 'medium' | 'high';
  user_feedback?: 'expected' | 'real_duplicate' | 'disputed' | 'none';
  created_at: string;
}

export type GateStatus = 'OK' | 'LOW_CONFIDENCE' | 'INSUFFICIENT';

export interface SufficiencyCheck {
  id: string;
  title: string;
  passed: boolean;
  detail: string;
  severity: 'error' | 'warning' | 'info';
}

export interface SufficiencyReport {
  status: GateStatus;
  checks: SufficiencyCheck[];
  missing_items: string[];
  fix_actions: Array<{ action: string; label: string; detail?: string }>;
  as_of_date: string;
}

export interface PercentileRange {
  p10_minor: MinorAmount;
  p25_minor?: MinorAmount;
  p50_minor: MinorAmount;
  p75_minor?: MinorAmount;
  p90_minor: MinorAmount;
}

export interface LedgerStep {
  step_no: number;
  label: string;
  value_minor?: MinorAmount;
  range_minor?: PercentileRange;
  formula_id?: string;
  formula_text?: string;
  inputs?: Array<{ name: string; value_minor: MinorAmount }>;
  source_refs?: string[];
  assumptions?: string[];
  status: 'ok' | 'warning';
}

export type AffordabilityVerdictCode = 'AFFORDABLE' | 'TIGHT' | 'NOT_ADVISABLE' | 'NOT_AFFORDABLE' | 'INSUFFICIENT_DATA';

export interface AffordabilityVerdict {
  code: AffordabilityVerdictCode;
  headline: string;
  breach_probability: number;
  prob_negative_balance: number;
  confidence: {
    score: number; // 0 - 100
    label: 'High' | 'Medium' | 'Low';
    factors: string[];
  };
}

export interface SafetyBufferRationale {
  value_minor: MinorAmount;
  binding_term: 'floor' | 'k_x_essentials' | 'variability_reserve';
  k: number;
  essentials_monthly_minor: MinorAmount;
  variability_reserve_minor: MinorAmount;
  floor_minor: MinorAmount;
  reason: string;
}

export interface AffordabilityResponse {
  snapshot_id: string;
  as_of_date: string;
  gate: SufficiencyReport;
  verdict?: AffordabilityVerdict;
  ledger: LedgerStep[];
  buffer?: SafetyBufferRationale;
  headroom?: PercentileRange;
  lowest_balance?: {
    date: string;
    p50_minor: MinorAmount;
    p10_minor: MinorAmount;
  };
  helpers?: {
    max_affordable_now_minor: MinorAmount;
    min_delay_months: number;
    recommended_savings_cut_minor?: MinorAmount;
  };
  narration?: string | {
    text: string;
    guard_status: 'passed' | 'fallback_template';
  };
}

// -------------------------------------------------------------
// Authentication & User Management Types
// -------------------------------------------------------------

export interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  mobile_number?: string | null;
  country: string;
  preferred_currency: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_onboarded: boolean;
  created_at: string;
  profile?: UserProfile | null;
  accounts?: Account[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  mobile_number?: string;
  country?: string;
  preferred_currency?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token?: string; // Optional if session is in HttpOnly cookie
}

export interface OnboardingBankInput {
  bank: string;
  nickname: string;
  type: AccountType;
  masked_last4: string;
  opening_balance_minor?: MinorAmount;
  currency?: string;
  is_primary?: boolean;
  account_holder_name?: string;
  ifsc?: string;
}

export interface OnboardingRequest {
  full_name: string;
  mobile_number?: string;
  country?: string;
  preferred_currency?: string;
  bank_accounts: OnboardingBankInput[];
}

// -------------------------------------------------------------
// Financial Goals & Recurring Optimization Types
// -------------------------------------------------------------

export type GoalCategory = 'vehicle' | 'gadget' | 'travel' | 'emergency_fund' | 'house' | 'education' | 'lifestyle' | 'other';

export interface Goal {
  id: string;
  user_id?: string;
  title: string;
  target_amount_minor: MinorAmount;
  current_saved_minor: MinorAmount;
  target_date?: string | null;
  category: GoalCategory | string;
  priority: number;
  status: 'active' | 'completed' | 'archived';
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface GoalOptimizationRecurringItem {
  id: string;
  merchant: string;
  type: string;
  cadence: string;
  amount_minor: MinorAmount;
  is_selected: boolean;
  can_cancel: boolean;
}

export interface GoalMilestone {
  goal_id: string;
  title: string;
  target_amount_minor: MinorAmount;
  current_saved_minor: MinorAmount;
  category: string;
  priority: number;
  baseline_months: number;
  baseline_date: string;
  optimized_months: number;
  optimized_date: string;
  months_saved: number;
  is_achieved_immediately: boolean;
}

export interface GoalProjectionPoint {
  month_index: number;
  month_label: string;
  baseline_saved_minor: MinorAmount;
  optimized_saved_minor: MinorAmount;
}

export interface GoalOptimizationResult {
  has_goals: boolean;
  liquid_funds_minor: MinorAmount;
  baseline_monthly_savings_minor: MinorAmount;
  freed_monthly_savings_minor: MinorAmount;
  optimized_monthly_savings_minor: MinorAmount;
  savings_rate_pct: number;
  total_target_minor: MinorAmount;
  milestones: GoalMilestone[];
  projection_graph: GoalProjectionPoint[];
  recurring_items: GoalOptimizationRecurringItem[];
  ai_advisory: {
    headline: string;
    summary: string;
    recommended_savings_minor: MinorAmount;
    actionable_cuts: Array<{
      recurring_id: string;
      merchant: string;
      amount_minor: MinorAmount;
      impact: string;
    }>;
  };
}
