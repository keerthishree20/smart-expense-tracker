"use client";

import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, AlertTriangle } from "lucide-react";
import type { DashboardSummary, MonthlyTrend } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/types";

ChartJS.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

interface Props {
  summary: DashboardSummary | null;
  monthlyTrend: MonthlyTrend[];
}

export default function Dashboard({ summary, monthlyTrend }: Props) {
  if (!summary) return null;

  const doughnutData = {
    labels: summary.category_breakdown.map((c) => c.category),
    datasets: [
      {
        data: summary.category_breakdown.map((c) => c.total),
        backgroundColor: summary.category_breakdown.map((c) => CATEGORY_COLORS[c.category] || "#6b7280"),
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const barData = {
    labels: monthlyTrend.map((m) => {
      const [year, month] = m.month.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }),
    datasets: [
      {
        label: "Spending",
        data: monthlyTrend.map((m) => m.total),
        backgroundColor: "#3b82f6",
        borderRadius: 8,
        barThickness: 32,
      },
    ],
  };

  const lineData = {
    labels: monthlyTrend.map((m) => {
      const [year, month] = m.month.split("-");
      return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "short" });
    }),
    datasets: [
      {
        label: "Transactions",
        data: monthlyTrend.map((m) => m.count),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#8b5cf6",
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Total Spent</p>
              <p className="text-2xl font-bold mt-1">${summary.total_spent.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-primary-100 rounded-xl">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Transactions</p>
              <p className="text-2xl font-bold mt-1">{summary.transaction_count}</p>
            </div>
            <div className="p-3 bg-accent-100 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-accent-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Avg Transaction</p>
              <p className="text-2xl font-bold mt-1">${summary.average_transaction.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-warning-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-warning-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Budget Alerts */}
      {summary.budget_alerts.length > 0 && (
        <div className="space-y-2">
          {summary.budget_alerts.map((alert) => (
            <div
              key={alert.category}
              className={`flex items-center gap-3 p-4 rounded-xl border ${
                alert.status === "exceeded"
                  ? "bg-danger-50 border-danger-200"
                  : "bg-warning-50 border-warning-200"
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 ${
                  alert.status === "exceeded" ? "text-danger-500" : "text-warning-500"
                }`}
              />
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {alert.category}: ${alert.spent.toFixed(2)} / ${alert.limit.toFixed(2)}
                </p>
                <div className="mt-1.5 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      alert.status === "exceeded" ? "bg-danger-500" : "bg-warning-500"
                    }`}
                    style={{ width: `${Math.min(alert.percentage, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-semibold">{alert.percentage}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-base font-semibold mb-4">Spending by Category</h3>
          <div className="w-64 h-64 mx-auto">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { padding: 16, usePointStyle: true } } },
                cutout: "65%",
              }}
            />
          </div>
        </div>

        {/* Monthly Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-base font-semibold mb-4">Monthly Spending</h3>
          <div className="h-64">
            <Bar
              data={barData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: { beginAtZero: true, grid: { color: "#f1f5f9" }, ticks: { callback: (v) => `$${v}` } },
                  x: { grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        {/* Transaction Count Trend */}
        {monthlyTrend.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
            <h3 className="text-base font-semibold mb-4">Transaction Trend</h3>
            <div className="h-48">
              <Line
                data={lineData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: { beginAtZero: true, grid: { color: "#f1f5f9" } },
                    x: { grid: { display: false } },
                  },
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
