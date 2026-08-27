"use client";

import { useEffect, useState } from "react";
import { Store, TrendingUp } from "lucide-react";
import { getTopMerchants } from "@/lib/api";
import type { TopMerchant } from "@/lib/types";

export default function TopMerchants() {
  const [merchants, setMerchants] = useState<TopMerchant[]>([]);

  useEffect(() => {
    getTopMerchants().then(setMerchants).catch(() => {});
  }, []);

  if (merchants.length === 0) return null;

  const maxTotal = Math.max(...merchants.map((m) => m.total));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-orange-100 rounded-xl">
          <Store className="w-5 h-5 text-orange-600" />
        </div>
        <h3 className="font-semibold">Top Merchants</h3>
      </div>
      <div className="space-y-3">
        {merchants.map((m, i) => (
          <div key={m.merchant} className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-400 w-5">#{i + 1}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{m.merchant}</span>
                <span className="text-sm font-semibold">${m.total.toFixed(2)}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all"
                  style={{ width: `${(m.total / maxTotal) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 mt-0.5">{m.visits} visit{m.visits !== 1 ? "s" : ""}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
