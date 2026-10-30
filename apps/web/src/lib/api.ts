/**
 * API Client for Financial Decision Lab (FDL).
 * Connects frontend UI to FastAPI backend on http://localhost:8000
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  const url = `${API_BASE}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      let errDetail = res.statusText;
      try {
        const errJson = await res.json();
        errDetail = errJson.detail || JSON.stringify(errJson);
      } catch {}
      throw new Error(`API Error [${res.status}]: ${errDetail}`);
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

  getLiquidityAdvice: (target_paise: number) =>
    fetchFromApi("/api/dashboard/investment-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_amount_paise: target_paise }),
    }),

  // Statement Ingestion
  previewStatement: (formData: FormData) =>
    fetchFromApi("/api/imports/preview", {
      method: "POST",
      body: formData,
    }),
  commitStatement: (fileId: string, accountId?: string) => {
    const form = new FormData();
    form.append("file_id", fileId);
    if (accountId) form.append("account_id", accountId);
    return fetchFromApi("/api/imports/commit", {
      method: "POST",
      body: form,
    });
  },

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

  // Recurring & Upcoming
  getRecurringItems: (params?: {
    type_filter?: string;
    cadence?: string;
    search?: string;
    min_amount_paise?: number;
    max_amount_paise?: number;
    limit?: number;
    offset?: number;
  }) => fetchFromApi(`/api/recurring${toQueryString(params)}`),

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

  // What-If Scenarios
  compareScenarios: (purchaseAmountMinor: number, scenarios: any[]) =>
    fetchFromApi("/api/scenarios/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purchase_amount_minor: purchaseAmountMinor,
        scenarios,
      }),
    }),
};
