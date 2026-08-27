export interface ExpenseItem {
  name: string;
  quantity: number;
  price: number;
}

export interface Expense {
  id: number;
  merchant: string;
  date: string;
  total: number;
  subtotal: number | null;
  tax: number | null;
  category: string;
  items: ExpenseItem[];
  receipt_image: string | null;
  created_at: string;
}

export interface ScanResult {
  id: number;
  merchant: string;
  date: string;
  total: number;
  subtotal: number;
  tax: number;
  category: string;
  items: ExpenseItem[];
  raw_ocr_text: string;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
}

export interface BudgetAlert {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
  status: "warning" | "exceeded";
}

export interface DashboardSummary {
  total_spent: number;
  transaction_count: number;
  average_transaction: number;
  category_breakdown: CategoryBreakdown[];
  budget_alerts: BudgetAlert[];
}

export interface MonthlyTrend {
  month: string;
  total: number;
  count: number;
}

export interface Budget {
  id: number;
  category: string;
  monthly_limit: number;
}

export const CATEGORIES = [
  "Groceries",
  "Dining",
  "Shopping",
  "Transportation",
  "Healthcare",
  "Entertainment",
  "Utilities",
  "Education",
  "Other",
] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  Groceries: "#22c55e",
  Dining: "#f59e0b",
  Shopping: "#3b82f6",
  Transportation: "#8b5cf6",
  Healthcare: "#ef4444",
  Entertainment: "#ec4899",
  Utilities: "#6366f1",
  Education: "#14b8a6",
  Other: "#6b7280",
};

export interface TopMerchant {
  merchant: string;
  total: number;
  visits: number;
}

export interface DailySpending {
  day: string;
  total: number;
}

export interface AdvancedStats {
  highest: { merchant: string; total: number; date: string } | null;
  lowest: { merchant: string; total: number; date: string } | null;
  total_merchants: number;
  categories_used: number;
  days_tracked: number;
  avg_daily: number;
}

export const CATEGORY_ICONS: Record<string, string> = {
  Groceries: "ShoppingCart",
  Dining: "UtensilsCrossed",
  Shopping: "ShoppingBag",
  Transportation: "Car",
  Healthcare: "Heart",
  Entertainment: "Gamepad2",
  Utilities: "Zap",
  Education: "GraduationCap",
  Other: "MoreHorizontal",
};
