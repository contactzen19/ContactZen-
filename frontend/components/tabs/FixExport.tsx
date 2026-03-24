"use client";
import { useState } from "react";
import { ScanResult } from "@/lib/types";
import { downloadFixed } from "@/lib/api";

const fmtNum = (x: number) => x.toLocaleString();

interface Props {
  scan: ScanResult;
  file: File;
  emailCol: string;
  phoneCol: string | null;
}

export default function FixExport({ scan, file, emailCol, phoneCol }: Props) {
  const [fixes, setFixes] = useState<Record<string, boolean>>({
    suppress_invalid_email: true,
    suppress_risky_email: false,
    suppress_invalid_phone: false,
    deduplicate_email: scan.email_dupes > 0,
    flag_enrichment: false,
  });
  const [loading, setLoading] = useState<"clean" | "suppression" | null>(null);

  const toggle = (key: string) => setFixes(prev => ({ ...prev, [key]: !prev[key] }));
  const activeFixes = Object.entries(fixes).filter(([, v]) => v).map(([k]) => k);

  const download = async (type: "clean" | "suppression") => {
    setLoading(type);
    try {
      const blob = await downloadFixed(file, emailCol, phoneCol, activeFixes, type);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = type === "clean" ? "contactzen_clean.csv" : "contactzen_suppression.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed: " + e);
    } finally {
      setLoading(null);
    }
  };

  const fixOptions = [
    { key: "suppress_invalid_email", label: "Remove invalid emails", count: scan.invalid, help: "Removes contacts with empty, malformed, or syntactically invalid email addresses." },
    { key: "suppress_risky_email", label: "Also remove risky emails", count: scan.risky, help: "More aggressive — removes disposable domains and suspicious structures too." },
    { key: "suppress_invalid_phone", label: "Remove invalid phone numbers", count: scan.phone_invalid, help: "Removes contacts with clearly malformed phone numbers.", disabled: !phoneCol },
    { key: "deduplicate_email", label: "Deduplicate by email", count: scan.email_dupes, help: "Keeps the first occurrence of each email, removes the rest." },
    { key: "flag_enrichment", label: "Flag contacts needing enrichment", count: null, help: "Adds a cz_needs_enrichment column — does not remove contacts." },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-brand-900">Apply Data Fixes</h3>
        <p className="text-sm text-gray-500 mt-1">
          Select the fixes to apply. ContactZen will generate a clean contact list and a suppression list you can import directly into your CRM.
        </p>
      </div>

      <div className="card space-y-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Choose what to fix</p>
        {fixOptions.map(({ key, label, count, help, disabled }) => (
          <label key={key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
            ${disabled ? "opacity-40 cursor-not-allowed" : fixes[key] ? "border-brand-300 bg-brand-50" : "border-gray-100 hover:border-brand-200"}`}>
            <input
              type="checkbox"
              checked={fixes[key]}
              onChange={() => !disabled && toggle(key)}
              disabled={disabled}
              className="mt-0.5 accent-brand-600"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                {label}
                {count != null && (
                  <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{fmtNum(count)} contacts</span>
                )}
                {disabled && <span className="text-xs text-gray-400">(no phone column selected)</span>}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{help}</div>
            </div>
          </label>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => download("clean")}
          disabled={!!loading}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {loading === "clean" ? "Generating…" : "⬇ Download Clean Contact List"}
        </button>
        <button
          onClick={() => download("suppression")}
          disabled={!!loading}
          className="btn-secondary flex-1 flex items-center justify-center gap-2"
        >
          {loading === "suppression" ? "Generating…" : "⬇ Download Suppression List"}
        </button>
      </div>

      <div className="card border-brand-100 bg-brand-50 space-y-3">
        <h3 className="font-semibold text-brand-900">Making This Ongoing</h3>
        <p className="text-sm text-gray-700">
          A one-time fix is a start. The real value is continuous protection — catching bad data before it reaches reps.
        </p>
        <ul className="text-sm text-gray-700 space-y-1.5">
          <li>• <strong>Automated scans</strong> — run weekly against your live HubSpot or Salesforce data, no CSV required</li>
          <li>• <strong>Pre-sequence protection</strong> — flag or suppress risky contacts before enrollment</li>
          <li>• <strong>Vendor accountability</strong> — track data quality by source over time, build a paper trail for credit recapture</li>
          <li>• <strong>Push suppressions to HubSpot</strong> — apply risk scores as contact properties, directly in HubSpot</li>
        </ul>
        <div className="bg-white border border-brand-200 rounded-lg px-4 py-3 text-sm text-brand-800">
          💡 HubSpot API integration is coming next. You&apos;ll pull live contacts, push risk scores, and schedule scans — all without a CSV export.
        </div>
      </div>
    </div>
  );
}
