"use client";
import { useCallback, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  loading?: boolean;
}

export default function UploadZone({ onFile, loading }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) onFile(file);
  }, [onFile]);

  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center w-full h-44 rounded-xl border-2 border-dashed cursor-pointer transition-colors
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
  );
}
