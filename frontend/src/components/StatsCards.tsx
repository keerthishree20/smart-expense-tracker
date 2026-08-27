"use client";

import { useEffect, useState } from "react";
import { Award, ArrowDown, MapPin, Calendar, BarChart3 } from "lucide-react";
import { getAdvancedStats } from "@/lib/api";
import type { AdvancedStats } from "@/lib/types";

export default function StatsCards() {
  const [stats, setStats] = useState<AdvancedStats | null>(null);

  useEffect(() => {
    getAdvancedStats().then(setStats).catch(() => {});
  }, []);

  if (!stats) return null;

  const cards = [
    {
      label: "Biggest Purchase",
      value: stats.highest ? `$${stats.highest.total.toFixed(2)}` : "—",
      sub: stats.highest?.merchant || "",
      icon: Award,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      label: "Smallest Purchase",
      value: stats.lowest ? `$${stats.lowest.total.toFixed(2)}` : "—",
      sub: stats.lowest?.merchant || "",
      icon: ArrowDown,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Stores Visited",
      value: stats.total_merchants.toString(),
      sub: `${stats.categories_used} categories`,
      icon: MapPin,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Avg Daily Spend",
      value: `$${stats.avg_daily.toFixed(2)}`,
      sub: `${stats.days_tracked} days tracked`,
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-slate-500">{card.label}</span>
            <div className={`p-1.5 ${card.bg} rounded-lg`}>
              <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
          </div>
          <p className="text-lg font-bold">{card.value}</p>
          <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
        </div>
      ))}
    </div>
  );
}
