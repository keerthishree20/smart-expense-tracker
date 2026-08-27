"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { getAiSummary } from "@/lib/api";

export default function AiInsights() {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const data = await getAiSummary();
      setSummary(data.summary);
    } catch {
      setSummary("Could not generate insights. Make sure you have expenses and GROQ_API_KEY is set.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl border border-violet-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-violet-100 rounded-xl">
            <Sparkles className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-violet-900">AI Spending Insights</h3>
            <p className="text-xs text-violet-500">Powered by Llama 3.3</p>
          </div>
        </div>
        {summary && (
          <button
            onClick={generate}
            disabled={loading}
            className="p-2 text-violet-500 hover:bg-violet-100 rounded-lg transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>

      {!summary && !loading && (
        <button
          onClick={generate}
          className="w-full py-3 bg-violet-600 text-white rounded-xl font-medium hover:bg-violet-700 transition flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Generate AI Insights
        </button>
      )}

      {loading && (
        <div className="flex items-center justify-center py-6 gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
          <span className="text-violet-600 font-medium">Analyzing your spending...</span>
        </div>
      )}

      {summary && !loading && (
        <div className="text-sm text-violet-800 leading-relaxed whitespace-pre-line">
          {summary}
        </div>
      )}
    </div>
  );
}
