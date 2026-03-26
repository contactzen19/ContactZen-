"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { decodeReport, summaryToScanResult, ReportSummary } from "@/lib/report";
import ExecutiveSummary from "@/components/tabs/ExecutiveSummary";
import RevOpsBreakdown from "@/components/tabs/RevOpsBreakdown";

export default function ReportPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const d = params.get("d");
    if (!d) { setInvalid(true); return; }
    const decoded = decodeReport(d);
    if (!decoded) { setInvalid(true); return; }
    setSummary(decoded);
  }, []);

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-500">This report link is invalid or has expired.</p>
          <Link href="/app" className="btn-primary text-sm px-6 py-2">Run Your Own Scan</Link>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading report…</p>
      </div>
    );
  }

  const scan = summaryToScanResult(summary);
  const roi = summary.roi;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white text-base flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7C3AED, #9F67FF)", boxShadow: "0 4px 14px rgba(124,58,237,0.25)" }}
            >
              ⚡
            </div>
            <span className="text-xl font-extrabold text-brand-900 tracking-tight">ContactZen</span>
          </div>
          <Link href="/app" className="btn-primary text-sm px-4 py-2">Run Your Own Scan</Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Report banner */}
        <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-300 mb-1">ContactZen Scan Report</p>
          <h1 className="text-2xl font-extrabold mb-1">
            {summary.total.toLocaleString()} contacts scanned
          </h1>
          <p className="text-brand-200 text-sm">
            Scanned on {summary.scanned_at} · Read-only report · No contact data stored
          </p>
        </div>

        {/* Executive Summary */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 rounded-full bg-brand-600" />
            <h2 className="font-bold text-brand-900 text-lg">Executive Summary</h2>
          </div>
          <ExecutiveSummary scan={scan} roi={roi} numberOfReps={summary.number_of_reps} />
        </div>

        {/* RevOps Breakdown */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 rounded-full bg-brand-600" />
            <h2 className="font-bold text-brand-900 text-lg">RevOps Breakdown</h2>
          </div>
          <RevOpsBreakdown scan={scan} />
        </div>

        {/* CTA */}
        <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 p-8 text-center space-y-4">
          <p className="text-brand-900 font-bold text-lg">Want to run this on your real CRM data?</p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Upload a CSV export from HubSpot, Salesforce, or any CRM and get your own scan in under 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/app" className="btn-primary px-8 py-3">Run Your Own Scan →</Link>
            <a
              href="https://calendly.com/contactzen-joey/new-meeting"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-8 py-3"
            >
              Book a Call
            </a>
          </div>
          <p className="text-xs text-gray-400">No credit card required · No data stored · Read-only access</p>
        </div>
      </div>
    </div>
  );
}
