/**
 * API Client for Financial Decision Lab (FDL).
 * Connects frontend UI to FastAPI backend on http://127.0.0.1:8000
 * Integrated with IndexedDB ('transactions') and LocalStorage ('metrics') caching.
 */

import { storageCache, localCache, serializeParams } from './storage-cache';

const API_BASE =
  typeof window !== 'undefined'
    ? '/api/proxy'
    : (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000');

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
  const serverBase = (process.env.API_URL || process.env.FASTAPI_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const url = isDirectAuth
    ? endpoint
    : typeof window !== "undefined"
      ? `/api/proxy${cleanEndpoint.startsWith("/") ? cleanEndpoint : `/${cleanEndpoint}`}`
      : `${serverBase}${cleanEndpoint.startsWith("/") ? cleanEndpoint : `/${cleanEndpoint}`}`;
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

// API Endpoints with Hybrid Storage Caching
export const api = {
  // Dashboard & Liquidity (Cached in LocalStorage / IndexedDB metrics)
  getDashboardSummary: async (
    params?: { account_id?: string; months?: number; start_date?: string; end_date?: string; source_file_ids?: string },
    options?: { bypassCache?: boolean }
  ) => {
    const cacheKey = `dashboard:${serializeParams(params)}`;
    if (!options?.bypassCache) {
      const cached = await storageCache.getMetrics(cacheKey);
      if (cached) return cached;
    }
    const data = await fetchFromApi(`/api/dashboard${toQueryString(params)}`);
    await storageCache.setMetrics(cacheKey, data);
    return data;
  },

  getLiquidityAdvice: (target_paise: number, investment_label?: string) =>
    fetchFromApi("/api/dashboard/investment-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_amount_paise: target_paise,
        investment_label: investment_label || "Investment",
      }),
    }),

  // Investments & NLP Advisor
  getInvestmentSummary: async (options?: { bypassCache?: boolean }) => {
    const cacheKey = 'investments:summary';
    if (!options?.bypassCache) {
      const cached = await storageCache.getMetrics(cacheKey);
      if (cached) return cached;
    }
    const data = await fetchFromApi("/api/investments/summary");
    await storageCache.setMetrics(cacheKey, data);
    return data;
  },

  sendInvestmentChat: (message: string, history?: Array<{ role: string; content: string }>) =>
    fetchFromApi("/api/investments/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history: history || [],
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

  commitStatement: async (fileId: string, accountId?: string, columnMappingOverride?: Record<string, any>) => {
    const form = new FormData();
    form.append("file_id", fileId);
    if (accountId) form.append("account_id", accountId);
    if (columnMappingOverride) {
      form.append("column_mapping_override", JSON.stringify(columnMappingOverride));
    }
    const res = await fetchFromApi("/api/imports/commit", {
      method: "POST",
      body: form,
    });
    // Invalidate client caches upon new statement commit
    await storageCache.invalidateDataStores();
    return res;
  },

  loadDemoStatement: async (persona: 'aarav' | 'priya') => {
    const form = new FormData();
    form.append("persona", persona);
    const res = await fetchFromApi("/api/imports/demo-load", {
      method: "POST",
      body: form,
    });
    // Invalidate client caches upon demo load
    await storageCache.invalidateDataStores();
    return res;
  },

  getUploadedFiles: async (options?: { bypassCache?: boolean }) => {
    const cacheKey = 'imports:files';
    if (!options?.bypassCache) {
      const cached = await storageCache.getMetrics(cacheKey);
      if (cached) return cached;
    }
    const data = await fetchFromApi("/api/imports/files");
    await storageCache.setMetrics(cacheKey, data, 5 * 60 * 1000);
    return data;
  },

  deleteUploadedFile: async (fileId: string) => {
    const res = await fetchFromApi(`/api/imports/files/${fileId}`, {
      method: "DELETE",
    });
    await storageCache.invalidateDataStores();
    return res;
  },

  deleteAllUploadedFiles: async () => {
    const res = await fetchFromApi("/api/imports/files", {
      method: "DELETE",
    });
    await storageCache.invalidateDataStores();
    return res;
  },

  // Transactions (Cached asynchronously in IndexedDB 'transactions' store)
  getTransactions: async (
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
      sort_by?: string;
      sort_order?: 'asc' | 'desc';
    } = 100,
    offsetOrOptions: number | { bypassCache?: boolean } = 0,
    options?: { bypassCache?: boolean }
  ) => {
    let offset = 0;
    let opts = options;
    if (typeof offsetOrOptions === 'object' && offsetOrOptions !== null) {
      opts = offsetOrOptions;
    } else if (typeof offsetOrOptions === 'number') {
      offset = offsetOrOptions;
    }

    const paramsObj = typeof limitOrParams === "number"
      ? { limit: limitOrParams, offset }
      : limitOrParams;

    // Check IndexedDB first if not bypassing cache
    if (!opts?.bypassCache) {
      const cached = await storageCache.getTransactions(paramsObj);
      if (cached) return cached;
    }

    const res = await (typeof limitOrParams === "number"
      ? fetchFromApi(`/api/transactions?limit=${limitOrParams}&offset=${offset}`)
      : fetchFromApi(`/api/transactions${toQueryString(limitOrParams)}`));

    // Store in IndexedDB
    await storageCache.setTransactions(paramsObj, res);
    return res;
  },

  updateTransactionCategory: async (
    txnId: string,
    payload: {
      category_id: string;
      scope: 'this_txn' | 'same_merchant';
      dry_run?: boolean;
    }
  ) => {
    const res = await fetchFromApi(`/api/transactions/${txnId}/category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!payload.dry_run) {
      await storageCache.clearTransactions();
      localCache.clearMatching('dashboard');
      localCache.clearMatching('recurring');
    }
    return res;
  },

  undoCategoryCorrection: async (logId?: string) => {
    const res = await fetchFromApi('/api/transactions/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_id: logId }),
    });
    await storageCache.clearTransactions();
    localCache.clearMatching('dashboard');
    localCache.clearMatching('recurring');
    return res;
  },

  getCorrectionHistory: (params?: { limit?: number; offset?: number }) =>
    fetchFromApi(`/api/transactions/corrections${toQueryString(params)}`),

  // Recurring & Upcoming (Cached in client storage)
  getRecurringItems: async (
    params?: {
      type_filter?: string;
      cadence?: string;
      search?: string;
      min_amount_paise?: number;
      max_amount_paise?: number;
      status_filter?: string;
      user_status_filter?: string;
      limit?: number;
      offset?: number;
    },
    options?: { bypassCache?: boolean }
  ) => {
    const cacheKey = `recurring:items:${serializeParams(params)}`;
    if (!options?.bypassCache) {
      const cached = await storageCache.getMetrics(cacheKey);
      if (cached) return cached;
    }
    const data = await fetchFromApi(`/api/recurring${toQueryString(params)}`);
    await storageCache.setMetrics(cacheKey, data);
    return data;
  },

  updateRecurringItem: async (
    itemId: string,
    payload: {
      user_status?: 'confirmed' | 'rejected' | 'auto';
      typical_amount_minor?: number;
      next_expected_date?: string;
      merchant?: string;
      type?: string;
      cadence?: string;
    }
  ) => {
    const res = await fetchFromApi(`/api/recurring/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    localCache.clearMatching('recurring');
    localCache.clearMatching('dashboard');
    return res;
  },

  batchConfirmRecurring: async (itemIds?: string[]) => {
    const res = await fetchFromApi('/api/recurring/batch-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_ids: itemIds }),
    });
    localCache.clearMatching('recurring');
    localCache.clearMatching('dashboard');
    return res;
  },

  getUpcomingSchedule: async (
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
    } = 30,
    options?: { bypassCache?: boolean }
  ) => {
    const paramsObj = typeof daysOrParams === "number" ? { days: daysOrParams } : daysOrParams;
    const cacheKey = `recurring:upcoming:${serializeParams(paramsObj)}`;
    if (!options?.bypassCache) {
      const cached = await storageCache.getMetrics(cacheKey);
      if (cached) return cached;
    }
    const data = await (typeof daysOrParams === "number"
      ? fetchFromApi(`/api/recurring/upcoming?days=${daysOrParams}`)
      : fetchFromApi(`/api/recurring/upcoming${toQueryString(daysOrParams)}`));
    await storageCache.setMetrics(cacheKey, data);
    return data;
  },

  // Anomalies (Cached in client storage)
  getAnomalies: async (
    params?: {
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
    },
    options?: { bypassCache?: boolean }
  ) => {
    const cacheKey = `anomalies:${serializeParams(params)}`;
    if (!options?.bypassCache) {
      const cached = await storageCache.getMetrics(cacheKey);
      if (cached) return cached;
    }
    const data = await fetchFromApi(`/api/anomalies${toQueryString(params)}`);
    await storageCache.setMetrics(cacheKey, data);
    return data;
  },

  submitAnomalyFeedback: async (
    anomalyId: string,
    feedback: 'expected' | 'real_duplicate' | 'disputed' | 'dismissed' | 'none'
  ) => {
    const res = await fetchFromApi(`/api/anomalies/${anomalyId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback }),
    });
    localCache.clearMatching('anomalies');
    localCache.clearMatching('dashboard');
    return res;
  },

  batchAnomalyFeedback: async (payload: {
    feedback: 'expected' | 'real_duplicate' | 'disputed' | 'dismissed' | 'none';
    anomaly_ids?: string[];
    severity?: string;
  }) => {
    const res = await fetchFromApi('/api/anomalies/batch-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    localCache.clearMatching('anomalies');
    localCache.clearMatching('dashboard');
    return res;
  },

  // Egress Logs & Privacy Status
  getPrivacyStatus: () => fetchFromApi('/api/privacy/status'),

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

  sendPurchaseAdvisorChat: (
    message: string,
    history?: Array<{ role: string; content: string }>,
    sourceFileIds?: string[]
  ) =>
    fetchFromApi<any>("/api/affordability/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        history,
        source_file_ids: sourceFileIds,
      }),
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

  logout: async () => {
    const res = await fetchFromApi("/api/auth/logout", {
      method: "POST",
    });
    await storageCache.clearAll();
    return res;
  },

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

  getUserAccounts: async (options?: { bypassCache?: boolean }) => {
    const cacheKey = 'accounts:list';
    if (!options?.bypassCache) {
      const cached = await storageCache.getMetrics(cacheKey);
      if (cached) return cached;
    }
    const data = await fetchFromApi("/api/user/accounts");
    await storageCache.setMetrics(cacheKey, data, 30 * 60 * 1000);
    return data;
  },

  createUserAccount: async (payload: any) => {
    const res = await fetchFromApi("/api/user/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await storageCache.invalidateDataStores();
    return res;
  },

  deleteUserAccount: async (accountId: string) => {
    const res = await fetchFromApi(`/api/user/accounts/${accountId}`, {
      method: "DELETE",
    });
    await storageCache.invalidateDataStores();
    return res;
  },

  updateUserAccount: async (accountId: string, payload: any) => {
    const res = await fetchFromApi(`/api/user/accounts/${accountId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await storageCache.invalidateDataStores();
    return res;
  },

  setPrimaryUserAccount: async (accountId: string) => {
    const res = await fetchFromApi(`/api/user/accounts/${accountId}/primary`, {
      method: "POST",
    });
    await storageCache.invalidateDataStores();
    return res;
  },

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchFromApi("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),

  getEmailSyncStatus: () => fetchFromApi("/api/email-sync/status"),

  getEmailAuthorizeUrl: () => fetchFromApi("/api/email-sync/oauth/authorize"),

  syncEmails24h: async () => {
    const res = await fetchFromApi("/api/email-sync/sync-24h", {
      method: "POST",
    });
    // Invalidate caches upon newly synced bank notification emails
    await storageCache.invalidateDataStores();
    return res;
  },

  disconnectEmailSync: async () => {
    const res = await fetchFromApi("/api/email-sync/disconnect", {
      method: "DELETE",
    });
    await storageCache.invalidateDataStores();
    return res;
  },

  getEmailSyncLogs: () => fetchFromApi("/api/email-sync/logs"),

  getTaxSummary: () => fetchFromApi("/api/tax/summary"),
  getTaxPdfUrl: () => "/api/proxy/tax/pdf",

  // Financial Goals & Recurring Optimization
  getGoals: async (status?: string, options?: { bypassCache?: boolean }) => {
    const cacheKey = `goals:${status || 'all'}`;
    if (!options?.bypassCache) {
      const cached = await storageCache.getMetrics(cacheKey);
      if (cached) return cached;
    }
    const data = await fetchFromApi(`/api/goals${toQueryString({ status })}`);
    await storageCache.setMetrics(cacheKey, data);
    return data;
  },

  createGoal: async (data: {
    parse_prompt?: string;
    title?: string;
    target_amount_minor?: number;
    current_saved_minor?: number;
    target_date?: string;
    category?: string;
    priority?: number;
    notes?: string;
  }) => {
    const res = await fetchFromApi("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    localCache.clearMatching('goals');
    return res;
  },

  deleteGoal: async (goalId: string) => {
    const res = await fetchFromApi(`/api/goals/${goalId}`, {
      method: "DELETE",
    });
    localCache.clearMatching('goals');
    return res;
  },

  updateGoal: async (goalId: string, data: any) => {
    const res = await fetchFromApi(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    localCache.clearMatching('goals');
    return res;
  },

  optimizeGoals: (excludedRecurringIds: string[] = []) =>
    fetchFromApi("/api/goals/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excluded_recurring_ids: excludedRecurringIds }),
    }),
};
