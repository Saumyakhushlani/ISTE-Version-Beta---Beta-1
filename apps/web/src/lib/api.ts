/**
 * API Client for Financial Decision Lab (FDL).
 * Connects frontend UI to FastAPI backend on http://localhost:8000
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  getDashboardSummary: () => fetchFromApi("/api/dashboard"),
  getLiquidityAdvice: (target_paise: number, label = "Investment / FD") =>
    fetchFromApi("/api/dashboard/investment-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        target_amount_paise: target_paise,
        investment_label: label 
      }),
    }),

  // Data Sufficiency Gate
  getSufficiencyReport: () => fetchFromApi("/api/sufficiency"),

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
  previewStatementAsync: (formData: FormData) =>
    fetchFromApi("/api/imports/preview/async", {
      method: "POST",
      body: formData,
    }),
  getImportJobStatus: (jobId: string) => fetchFromApi(`/api/imports/jobs/${jobId}`),

  // Transactions
  getTransactions: (limit = 100, offset = 0) =>
    fetchFromApi(`/api/transactions?limit=${limit}&offset=${offset}`),
  updateTransactionCategory: (txnId: string, categoryId: string, applyToMerchant = false) =>
    fetchFromApi(`/api/transactions/${txnId}/category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        new_category: categoryId,
        apply_to_merchant: applyToMerchant,
      }),
    }),
  undoTransactionCorrection: (correctionId: string) =>
    fetchFromApi("/api/transactions/undo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correction_id: correctionId }),
    }),
  getTransactionCorrections: (limit = 20) =>
    fetchFromApi(`/api/transactions/corrections?limit=${limit}`),

  // Recurring & Upcoming
  getRecurringItems: () => fetchFromApi("/api/recurring"),
  getUpcomingSchedule: (days = 30) => fetchFromApi(`/api/recurring/upcoming?days=${days}`),

  // Anomalies
  getAnomalies: () => fetchFromApi("/api/anomalies"),

  // Affordability & Decision Lab
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

  // Privacy & Egress
  getPrivacyStatus: () => fetchFromApi("/api/privacy/status"),
  getEgressLogs: (limit = 50) => fetchFromApi(`/api/privacy/egress-log?limit=${limit}`),
  togglePrivacyMode: (mode: "local" | "cloud_sanitized") =>
    fetchFromApi("/api/privacy/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    }),
};
