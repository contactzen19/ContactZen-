"use client";
import { useCallback, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  loading?: boolean;
}

export default function UploadZone({ onFile, loading }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState<"quick" | "volume" | null>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) onFile(file);
  }, [onFile]);

  const loadDemo = useCallback(async (e: React.MouseEvent, which: "quick" | "volume") => {
    e.preventDefault();
    e.stopPropagation();
    setLoadingDemo(which);
    try {
      const name = which === "volume" ? "demo_contacts_500k.csv" : "demo_contacts.csv";
      const res = await fetch(`/${name}`);
      const blob = await res.blob();
      const file = new File([blob], name, { type: "text/csv" });
      onFile(file);
    } finally {
      setLoadingDemo(null);
    }
  }, [onFile]);

  const spinner = (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );

  return (
    <div className="space-y-3">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={(e) => loadDemo(e, "quick")}
          disabled={loading || loadingDemo !== null}
          className="flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {loadingDemo === "quick" ? (
            <>{spinner} Loading demo…</>
          ) : (
            <>✨ Quick demo · 25,000 contacts</>
          )}
        </button>
        <button
          onClick={(e) => loadDemo(e, "volume")}
          disabled={loading || loadingDemo !== null}
          className="flex flex-col items-center justify-center rounded-xl border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
        >
          {loadingDemo === "volume" ? (
            <span className="flex items-center gap-2">{spinner} Loading 500K rows…</span>
          ) : (
            <>
              <span>💪 Run it at volume · 500,000</span>
              <span className="text-[10px] font-normal text-gray-400">enterprise-scale scan, ~30 seconds</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
