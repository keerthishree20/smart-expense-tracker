const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export async function scanReceipt(file: File) {
  const form = new FormData();
  form.append("file", file);
  return request<import("./types").ScanResult>("/api/receipts/scan", {
    method: "POST",
    body: form,
  });
}

export async function listExpenses(params?: { category?: string; month?: string }) {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.month) query.set("month", params.month);
  const qs = query.toString();
  return request<import("./types").Expense[]>(`/api/expenses${qs ? `?${qs}` : ""}`);
}

export async function createExpense(data: {
  merchant: string;
  date: string;
  total: number;
  category: string;
  items?: { name: string; quantity: number; price: number }[];
}) {
  return request<import("./types").Expense>("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateExpense(id: number, data: Record<string, unknown>) {
  return request<import("./types").Expense>(`/api/expenses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function deleteExpense(id: number) {
  return request<{ message: string }>(`/api/expenses/${id}`, { method: "DELETE" });
}

export async function getDashboardSummary(month?: string) {
  const qs = month ? `?month=${month}` : "";
  return request<import("./types").DashboardSummary>(`/api/dashboard/summary${qs}`);
}

export async function getMonthlyTrend(months = 6) {
  return request<import("./types").MonthlyTrend[]>(`/api/dashboard/monthly-trend?months=${months}`);
}

export async function getCategoryTrend(months = 6) {
  return request<Record<string, unknown>[]>(`/api/dashboard/category-trend?months=${months}`);
}

export async function listBudgets() {
  return request<import("./types").Budget[]>("/api/budgets");
}

export async function setBudget(category: string, monthlyLimit: number) {
  return request<import("./types").Budget>(
    `/api/budgets?category=${encodeURIComponent(category)}&monthly_limit=${monthlyLimit}`,
    { method: "POST" }
  );
}

export async function deleteBudget(category: string) {
  return request<{ message: string }>(`/api/budgets/${encodeURIComponent(category)}`, {
    method: "DELETE",
  });
}

export async function getTopMerchants(limit = 5) {
  return request<import("./types").TopMerchant[]>(`/api/insights/top-merchants?limit=${limit}`);
}

export async function getDailySpending(days = 30) {
  return request<import("./types").DailySpending[]>(`/api/insights/daily-spending?days=${days}`);
}

export async function getAiSummary() {
  return request<{ summary: string }>("/api/insights/ai-summary");
}

export async function getAdvancedStats() {
  return request<import("./types").AdvancedStats>("/api/insights/stats");
}

export function getExportCsvUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";
  return `${base}/api/export/csv`;
}

export async function searchExpenses(query: string) {
  const all = await listExpenses();
  const q = query.toLowerCase();
  return all.filter(
    (e) =>
      e.merchant.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.items.some((i) => i.name.toLowerCase().includes(q))
  );
}
