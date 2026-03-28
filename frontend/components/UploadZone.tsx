"use client";
import { useCallback, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Props {
  onFile: (file: File) => void;
  loading?: boolean;
}

export default function UploadZone({ onFile, loading }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) onFile(file);
  }, [onFile]);

  const handleDemoData = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoadingDemo(true);
    try {
      const res = await fetch("/demo_contacts.csv");
      const blob = await res.blob();
      const file = new File([blob], "demo_contacts.csv", { type: "text/csv" });
      onFile(file);
    } finally {
      setLoadingDemo(false);
    }
  }, [onFile]);

  return (
    <div className="space-y-3">
      {/* Connect HubSpot */}
      <a
        href={`${API_URL}/auth/hubspot`}
        className="w-full flex items-center justify-center gap-3 rounded-xl border-2 border-[#FF7A59] bg-[#FFF4F1] px-4 py-3 text-sm font-semibold text-[#C0392B] hover:bg-[#FFE8E2] transition-colors"
      >
        <svg width="20" height="20" viewBox="0 0 512 512" fill="#FF7A59"><path d="M296.9 143.9V96.1c18.6-7.9 31.6-26.4 31.6-47.9C328.5 21.7 306.8 0 280.3 0s-48.2 21.7-48.2 48.2c0 21.5 13 40 31.6 47.9v47.8c-27.2 4.2-51.7 16.5-71 34.4L75.4 72.6c1.3-4.6 2-9.4 2-14.3C77.4 26.1 51.3 0 19.1 0S-39.2 26.1-39.2 58.3s26.1 58.3 58.3 58.3c12.6 0 24.3-4 33.9-10.8l115.7 104.2c-16.8 25-26.6 55-26.6 87.4 0 32.5 9.9 62.7 26.9 87.8L54.6 499.4c-9.5-6.5-21-10.3-33.4-10.3C-11 489.1-37 515.1-37 547.3c0 32.1 26.1 58.3 58.3 58.3s58.3-26.1 58.3-58.3c0-10-2.6-19.4-7.1-27.6l112.4-112.4c25.2 17.4 55.8 27.6 88.8 27.6 86.3 0 156.3-70 156.3-156.3 0-77.4-56.3-141.7-130.1-154.7zM280.3 384c-53.7 0-97.3-43.6-97.3-97.3s43.6-97.3 97.3-97.3 97.3 43.6 97.3 97.3-43.6 97.3-97.3 97.3z"/></svg>
        Connect HubSpot
        <span className="ml-1 text-xs font-normal text-[#E8694A]">— scan your live CRM data</span>
      </a>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or upload a CSV</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed cursor-pointer transition-colors
          ${dragging ? "border-brand-600 bg-brand-50" : "border-gray-200 bg-gray-50 hover:border-brand-400 hover:bg-brand-50"}
          ${loading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <input
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          disabled={loading}
        />
        <div className="text-4xl mb-3">📂</div>
        <p className="text-sm font-semibold text-gray-700">
          Drop your CSV here or <span className="text-brand-600">browse</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          HubSpot · Salesforce · Apollo · any CRM export
        </p>
      </label>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        onClick={handleDemoData}
        disabled={loading || loadingDemo}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        {loadingDemo ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading demo data…
          </>
        ) : (
          <>
            ✨ Try with 25,000 sample contacts
          </>
        )}
      </button>
    </div>
  );
}
