"use client";

import { useState } from "react";
import { Trash2, ChevronDown, ChevronUp, Search, Download, Filter } from "lucide-react";
import { deleteExpense, getExportCsvUrl } from "@/lib/api";
import type { Expense } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORIES } from "@/lib/types";

interface Props {
  expenses: Expense[];
  onRefresh: () => void;
}

export default function ExpenseList({ expenses, onRefresh }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "total">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function handleDelete(id: number) {
    await deleteExpense(id);
    onRefresh();
  }

  let filtered = expenses;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (e) =>
        e.merchant.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.items.some((i) => i.name.toLowerCase().includes(q))
    );
  }
  if (filterCat) {
    filtered = filtered.filter((e) => e.category === filterCat);
  }

  filtered = [...filtered].sort((a, b) => {
    const mul = sortDir === "desc" ? -1 : 1;
    if (sortBy === "date") return mul * a.date.localeCompare(b.date);
    return mul * (a.total - b.total);
  });

  const totalFiltered = filtered.reduce((sum, e) => sum + e.total, 0);

  return (
    <div className="space-y-4">
      {/* Search, Filter & Export Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search merchants, items..."
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={`${sortBy}-${sortDir}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split("-") as ["date" | "total", "asc" | "desc"];
              setSortBy(field);
              setSortDir(dir);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="total-desc">Highest Amount</option>
            <option value="total-asc">Lowest Amount</option>
          </select>
          <a
            href={getExportCsvUrl()}
            download
            className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg text-sm font-medium hover:bg-accent-600 transition whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </a>
        </div>
        {filtered.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-sm text-slate-500">
            <span>{filtered.length} expense{filtered.length !== 1 ? "s" : ""}</span>
            <span className="font-semibold text-slate-700">Total: ${totalFiltered.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Expense List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-slate-400">
            {search || filterCat ? "No expenses match your filters." : "No expenses yet. Scan a receipt or add one manually!"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map((expense) => (
              <div key={expense.id} className="hover:bg-slate-50 transition">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpanded(expanded === expense.id ? null : expense.id)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: CATEGORY_COLORS[expense.category] || "#6b7280" }}
                    />
                    <div>
                      <p className="font-medium">{expense.merchant}</p>
                      <p className="text-sm text-slate-400">{expense.date} &middot; {expense.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">${expense.total.toFixed(2)}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(expense.id); }}
                      className="p-1.5 text-slate-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expanded === expense.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>
                {expanded === expense.id && expense.items.length > 0 && (
                  <div className="px-4 pb-4 pl-10">
                    <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                      {expense.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-slate-600">
                            {item.name} {item.quantity > 1 ? `x${item.quantity}` : ""}
                          </span>
                          <span className="font-medium">${item.price.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
