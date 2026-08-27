"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { listBudgets, setBudget, deleteBudget } from "@/lib/api";
import { CATEGORIES, CATEGORY_COLORS } from "@/lib/types";
import type { Budget } from "@/lib/types";

interface Props {
  onUpdate: () => void;
}

export default function BudgetManager({ onUpdate }: Props) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [newCategory, setNewCategory] = useState("Groceries");
  const [newLimit, setNewLimit] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const data = await listBudgets();
    setBudgets(data);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newLimit) return;
    setLoading(true);
    await setBudget(newCategory, parseFloat(newLimit));
    setNewLimit("");
    await load();
    onUpdate();
    setLoading(false);
  }

  async function handleDelete(category: string) {
    await deleteBudget(category);
    await load();
    onUpdate();
  }

  const usedCategories = new Set(budgets.map((b) => b.category));
  const availableCategories = CATEGORIES.filter((c) => !usedCategories.has(c));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-warning-100 rounded-xl">
          <Wallet className="w-5 h-5 text-warning-500" />
        </div>
        <h2 className="text-lg font-semibold">Budget Limits</h2>
      </div>

      {budgets.length > 0 && (
        <div className="space-y-3 mb-5">
          {budgets.map((b) => (
            <div key={b.category} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[b.category] || "#6b7280" }}
                />
                <span className="font-medium">{b.category}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">${b.monthly_limit.toFixed(2)}/mo</span>
                <button
                  onClick={() => handleDelete(b.category)}
                  className="p-1 text-slate-400 hover:text-danger-500 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {availableCategories.length > 0 && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          >
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="Limit"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
            className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={loading || !newLimit}
            className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}
