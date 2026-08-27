"use client";

import { useState, useRef } from "react";
import { Upload, Camera, Loader2, CheckCircle2, Receipt } from "lucide-react";
import { scanReceipt } from "@/lib/api";
import type { ScanResult } from "@/lib/types";

interface Props {
  onScanComplete: (result: ScanResult) => void;
}

export default function ReceiptUpload({ onScanComplete }: Props) {
  const [scanning, setScanning] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setPreview(URL.createObjectURL(file));
    setScanning(true);
    try {
      const data = await scanReceipt(file);
      setResult(data);
      onScanComplete(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function reset() {
    setPreview(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-primary-100 rounded-xl">
          <Receipt className="w-5 h-5 text-primary-600" />
        </div>
        <h2 className="text-lg font-semibold">Scan Receipt</h2>
      </div>

      {!preview ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            dragOver ? "border-primary-500 bg-primary-50" : "border-slate-300 hover:border-primary-400 hover:bg-slate-50"
          }`}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
          <p className="text-slate-600 font-medium">Drop receipt image here or click to upload</p>
          <p className="text-sm text-slate-400 mt-1">Supports JPG, PNG, WEBP</p>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition"
            >
              <Camera className="w-4 h-4 inline mr-1.5" />
              Upload Photo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-slate-100">
            <img src={preview} alt="Receipt" className="w-full max-h-64 object-contain" />
            {scanning && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="bg-white rounded-xl px-6 py-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
                  <span className="font-medium">Scanning with AI...</span>
                </div>
              </div>
            )}
          </div>

          {result && (
            <div className="bg-accent-50 border border-accent-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-accent-600" />
                <span className="font-semibold text-accent-700">Receipt Scanned</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">Merchant</span>
                  <p className="font-medium">{result.merchant}</p>
                </div>
                <div>
                  <span className="text-slate-500">Date</span>
                  <p className="font-medium">{result.date}</p>
                </div>
                <div>
                  <span className="text-slate-500">Total</span>
                  <p className="font-semibold text-lg">${result.total.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Category</span>
                  <p className="font-medium">{result.category}</p>
                </div>
              </div>
              {result.items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-accent-200">
                  <span className="text-sm text-slate-500">Items ({result.items.length})</span>
                  <div className="mt-1 space-y-1">
                    {result.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.name} {item.quantity > 1 ? `x${item.quantity}` : ""}</span>
                        <span className="font-medium">${item.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-danger-50 border border-danger-200 rounded-xl p-4 text-danger-600 text-sm">
              {error}
            </div>
          )}

          <button onClick={reset} className="text-sm text-primary-600 hover:underline">
            Scan another receipt
          </button>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
