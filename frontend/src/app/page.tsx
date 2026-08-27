"use client";

import { useState, useEffect, useCallback } from "react";
import { Receipt, LayoutDashboard, List, Plus, Wallet, Sparkles } from "lucide-react";
import ReceiptUpload from "@/components/ReceiptUpload";
import ExpenseList from "@/components/ExpenseList";
import Dashboard from "@/components/Dashboard";
import AddExpenseModal from "@/components/AddExpenseModal";
import BudgetManager from "@/components/BudgetManager";
import AiInsights from "@/components/AiInsights";
import TopMerchants from "@/components/TopMerchants";
import StatsCards from "@/components/StatsCards";
import { listExpenses, getDashboardSummary, getMonthlyTrend } from "@/lib/api";
import type { Expense, DashboardSummary, MonthlyTrend } from "@/lib/types";

type Tab = "dashboard" | "scan" | "expenses" | "insights" | "budgets";

export default function Home() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<MonthlyTrend[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [expData, sumData, trendData] = await Promise.all([
        listExpenses(),
        getDashboardSummary(),
        getMonthlyTrend(),
      ]);
      setExpenses(expData);
      setSummary(sumData);
      setTrend(trendData);
    } catch {
      // API not available yet
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabs = [
    { id: "dashboard" as Tab, label: "Dashboard", icon: LayoutDashboard },
    { id: "scan" as Tab, label: "Scan", icon: Receipt },
    { id: "expenses" as Tab, label: "Expenses", icon: List },
    { id: "insights" as Tab, label: "Insights", icon: Sparkles },
    { id: "budgets" as Tab, label: "Budgets", icon: Wallet },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl shadow-md shadow-primary-200">
              <Receipt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                SpendLens
              </h1>
              <p className="text-xs text-slate-400">AI-Powered Expense Tracker</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition shadow-sm shadow-primary-200"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Expense</span>
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-slate-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
                tab === t.id
                  ? "bg-primary-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {tab === "dashboard" && (
          <Dashboard summary={summary} monthlyTrend={trend} />
        )}

        {tab === "scan" && (
          <ReceiptUpload
            onScanComplete={() => {
              loadData();
            }}
          />
        )}

        {tab === "expenses" && (
          <ExpenseList expenses={expenses} onRefresh={loadData} />
        )}

        {tab === "insights" && (
          <div className="space-y-6">
            <StatsCards />
            <AiInsights />
            <TopMerchants />
          </div>
        )}

        {tab === "budgets" && (
          <BudgetManager onUpdate={loadData} />
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40">
        <div className="flex">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex flex-col items-center py-2 text-xs ${
                tab === t.id ? "text-primary-600" : "text-slate-400"
              }`}
            >
              <t.icon className="w-5 h-5" />
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <AddExpenseModal open={showAdd} onClose={() => setShowAdd(false)} onAdded={loadData} />
    </div>
  );
}
