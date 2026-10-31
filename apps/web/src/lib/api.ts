/**
 * API Client for Financial Decision Lab (FDL).
 * Connects frontend UI to FastAPI backend on http://127.0.0.1:8000
 */

const API_BASE =
  typeof window !== 'undefined'
    ? '/api/proxy'
    : (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

function toQueryString(params?: Record<string, any>): string {
  if (!params) return "";
  const filtered = Object.entries(params).filter(
    ([_, v]) => v !== undefined && v !== null && v !== ""
  );
  if (filtered.length === 0) return "";
  const query = new URLSearchParams();
  for (const [k, v] of filtered) {
    query.append(k, String(v));
  }
  return `?${query.toString()}`;
}

export async function fetchFromApi<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const isDirectAuth = endpoint.startsWith("/api/auth/") || endpoint.startsWith("/api/user/");
  const cleanEndpoint = endpoint.replace(/^\/api\/proxy/, "");
  const url = isDirectAuth
    ? endpoint
    : typeof window !== "undefined"
      ? `/api/proxy${cleanEndpoint.startsWith("/") ? cleanEndpoint : `/${cleanEndpoint}`}`
      : `${process.env.FASTAPI_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}${cleanEndpoint.startsWith("/") ? cleanEndpoint : `/${cleanEndpoint}`}`;
  try {
    const res = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errDetail: any = res.statusText;
      let errJson: any = null;
      try {
        errJson = await res.json();
        errDetail = errJson.detail || errJson;
      } catch {}

      const message = typeof errDetail === "object" && errDetail !== null
        ? errDetail.message || JSON.stringify(errDetail)
        : String(errDetail);

      const error: any = new Error(message);
      error.status = res.status;
      error.detail = errDetail;
      error.isPasswordRequired = errDetail?.error === "PASSWORD_REQUIRED" || message.includes("PASSWORD_REQUIRED");
      error.isPasswordIncorrect = errDetail?.error === "PASSWORD_INCORRECT" || message.includes("PASSWORD_INCORRECT");
      error.fileName = errDetail?.file_name;
      error.fileType = errDetail?.file_type;
      throw error;
    }

    return await res.json();
  } catch (err: any) {
    console.error(`Fetch error at ${endpoint}:`, err);
    throw err;
  }
}

// API Endpoints
export const api = {
  // Dashboard & Liquidity
  getDashboardSummary: (params?: { account_id?: string; months?: number; start_date?: string; end_date?: string }) =>
    fetchFromApi(`/api/dashboard${toQueryString(params)}`),

  getLiquidityAdvice: (target_paise: number, investment_label?: string) =>
    fetchFromApi("/api/dashboard/investment-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_amount_paise: target_paise,
        investment_label: investment_label || "Investment",
      }),
    }),

  // Statement Ingestion
  previewStatement: (formData: FormData) =>
    fetchFromApi("/api/imports/preview", {
      method: "POST",
      body: formData,
    }),

  previewStatementAsync: (formData: FormData) =>
    fetchFromApi("/api/imports/preview/async", {
      method: "POST",
      body: formData,
    }),

  getParsingJobStatus: (jobId: string) =>
    fetchFromApi(`/api/imports/jobs/${jobId}`),

  commitStatement: (fileId: string, accountId?: string, columnMappingOverride?: Record<string, any>) => {
    const form = new FormData();
    form.append("file_id", fileId);
    if (accountId) form.append("account_id", accountId);
    if (columnMappingOverride) {
      form.append("column_mapping_override", JSON.stringify(columnMappingOverride));
    }
    return fetchFromApi("/api/imports/commit", {
      method: "POST",
      body: form,
    });
  },

  loadDemoStatement: (persona: 'aarav' | 'priya') => {
    const form = new FormData();
    form.append("persona", persona);
    return fetchFromApi("/api/imports/demo-load", {
      method: "POST",
      body: form,
    });
  },

  getUploadedFiles: () => fetchFromApi("/api/imports/files"),

  deleteUploadedFile: (fileId: string) =>
    fetchFromApi(`/api/imports/files/${fileId}`, {
      method: "DELETE",
    }),

  deleteAllUploadedFiles: () =>
    fetchFromApi("/api/imports/files", {
      method: "DELETE",
    }),

  // Transactions
  getTransactions: (
    limitOrParams: number | {
      limit?: number;
      offset?: number;
      account_id?: string;
      category_id?: string;
      channel?: string;
      search?: string;
      is_transfer?: boolean;
      type?: string;
      months?: number;
      start_date?: string;
      end_date?: string;
      min_amount_paise?: number;
      max_amount_paise?: number;
    } = 100,
    offset = 0
  ) => {
    if (typeof limitOrParams === "number") {
      return fetchFromApi(`/api/transactions?limit=${limitOrParams}&offset=${offset}`);
    }
    return fetchFromApi(`/api/transactions${toQueryString(limitOrParams)}`);
  },

  updateTransactionCategory: (
    txnId: string,
    payload: {
      category_id: string;
      scope: 'this_txn' | 'same_merchant';
      dry_run?: boolean;
    }
  ) =>
    fetchFromApi(`/api/transactions/${txnId}/category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  undoCategoryCorrection: (logId?: string) =>
    fetchFromApi('/api/transactions/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: logId }),
    }),

  getCorrectionHistory: (params?: { limit?: number; offset?: number }) =>
    fetchFromApi(`/api/transactions/corrections${toQueryString(params)}`),

  // Recurring & Upcoming
  getRecurringItems: (params?: {
    type_filter?: string;
    cadence?: string;
    search?: string;
    min_amount_paise?: number;
    max_amount_paise?: number;
    status_filter?: string;
    user_status_filter?: string;
    limit?: number;
    offset?: number;
  }) => fetchFromApi(`/api/recurring${toQueryString(params)}`),

  updateRecurringItem: (
    itemId: string,
    payload: {
      user_status?: 'confirmed' | 'rejected' | 'auto';
      typical_amount_minor?: number;
      next_expected_date?: string;
      merchant?: string;
      type?: string;
      cadence?: string;
    }
  ) =>
    fetchFromApi(`/api/recurring/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  batchConfirmRecurring: (itemIds?: string[]) =>
    fetchFromApi('/api/recurring/batch-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: itemIds }),
    }),

  getUpcomingSchedule: (
    daysOrParams: number | {
      days?: number;
      months?: number;
      as_of_date?: string;
      account_id?: string;
      type_filter?: string;
      is_income?: boolean;
      search?: string;
      limit?: number;
      offset?: number;
    } = 30
  ) => {
    if (typeof daysOrParams === "number") {
      return fetchFromApi(`/api/recurring/upcoming?days=${daysOrParams}`);
    }
    return fetchFromApi(`/api/recurring/upcoming${toQueryString(daysOrParams)}`);
  },

  // Anomalies
  getAnomalies: (params?: {
    feedback_filter?: string;
    type_filter?: string;
    severity_filter?: string;
    months?: number;
    start_date?: string;
    end_date?: string;
    account_id?: string;
    search?: string;
    min_amount_paise?: number;
    limit?: number;
    offset?: number;
  }) => fetchFromApi(`/api/anomalies${toQueryString(params)}`),

  submitAnomalyFeedback: (
    anomalyId: string,
    feedback: 'expected' | 'real_duplicate' | 'disputed' | 'dismissed' | 'none'
  ) =>
    fetchFromApi(`/api/anomalies/${anomalyId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    }),

  batchAnomalyFeedback: (payload: {
    feedback: 'expected' | 'real_duplicate' | 'disputed' | 'dismissed' | 'none';
    anomaly_ids?: string[];
    severity?: string;
  }) =>
    fetchFromApi('/api/anomalies/batch-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  // Egress Logs
  getEgressLogs: (params?: {
    mode_filter?: string;
    destination?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => fetchFromApi(`/api/privacy/egress-log${toQueryString(params)}`),

  // Affordability & Decision
  evaluateAffordability: (query: {
    purchase_amount_minor: number;
    label?: string;
    timing?: string;
    payment_type?: string;
    emi_months?: number;
    emi_interest_rate_pct?: number;
    buffer_multiplier_override?: number;
    source_file_ids?: string[];
  }) =>
    fetchFromApi("/api/affordability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
    }),

  askAffordability: (question: string) =>
    fetchFromApi("/api/affordability/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),

  parseAffordabilityQuery: (question: string) =>
    fetchFromApi<{
      query: string;
      parsed: {
        purchase_amount_minor: number;
        label: string;
        timing: string;
        payment_type: string;
        emi_months: number | null;
        emi_interest_rate_pct: number | null;
        parsed_by?: string;
        model_used?: string;
      };
      parsed_by: string;
      model_used?: string;
    }>("/api/affordability/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    }),

  // What-If Scenarios
  getScenarioRecurringOptions: () =>
    fetchFromApi("/api/scenarios/recurring-options"),

  compareScenarios: (purchaseAmountMinor: number, scenarios: any[]) =>
    fetchFromApi("/api/scenarios/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purchase_amount_minor: purchaseAmountMinor,
        scenarios,
      }),
    }),

  // Authentication & Onboarding
  login: (email: string, password: string) =>
    fetchFromApi("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    mobile_number?: string;
    country?: string;
    preferred_currency?: string;
  }) =>
    fetchFromApi("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  logout: () =>
    fetchFromApi("/api/auth/logout", {
      method: "POST",
    }),

  getCurrentUser: () => fetchFromApi("/api/auth/me"),

  completeOnboarding: (payload: {
    full_name: string;
    mobile_number?: string;
    country?: string;
    preferred_currency?: string;
    bank_accounts: any[];
  }) =>
    fetchFromApi("/api/user/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getUserProfile: () => fetchFromApi("/api/user/profile"),

  updateUserProfile: (payload: any) =>
    fetchFromApi("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getUserAccounts: () => fetchFromApi("/api/user/accounts"),

  createUserAccount: (payload: any) =>
    fetchFromApi("/api/user/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  deleteUserAccount: (accountId: string) =>
    fetchFromApi(`/api/user/accounts/${accountId}`, {
      method: "DELETE",
    }),

  updateUserAccount: (accountId: string, payload: any) =>
    fetchFromApi(`/api/user/accounts/${accountId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  setPrimaryUserAccount: (accountId: string) =>
    fetchFromApi(`/api/user/accounts/${accountId}/primary`, {
      method: "POST",
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchFromApi("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
};
