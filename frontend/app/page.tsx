"use client";
import { useState, useCallback, useEffect } from "react";
import Logo from "@/components/Logo";
import UploadZone from "@/components/UploadZone";
import ColumnSelector from "@/components/ColumnSelector";
import ROIPanel from "@/components/ROIPanel";
import ExecutiveSummary from "@/components/tabs/ExecutiveSummary";
import RevOpsBreakdown from "@/components/tabs/RevOpsBreakdown";
import AtRiskRecords from "@/components/tabs/AtRiskRecords";
import FixExport from "@/components/tabs/FixExport";
import { fetchColumns, runScan, runHubSpotScan } from "@/lib/api";
import { ROIInputs, ScanResult, ROIResult } from "@/lib/types";
import clsx from "clsx";

function LeadCapture() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await fetch("https://formspree.io/f/xykbydze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setSubmitted(true);
    setSending(false);
  };

  if (submitted) {
    return (
      <div className="rounded-xl bg-brand-50 border border-brand-200 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🎉</span>
        <p className="text-sm font-medium text-brand-800">You're on the list — I'll be in touch soon.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-brand-600 px-6 py-5 text-white">
      <p className="font-semibold text-lg mb-1">Want this for your actual CRM?</p>
      <p className="text-brand-200 text-sm mb-4">Enter your email and I'll reach out to get you set up.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg px-4 py-2 text-sm text-gray-900 outline-none"
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-white text-brand-700 font-semibold text-sm px-5 py-2 rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-50"
        >
          {sending ? "Sending…" : "Get Started"}
        </button>
      </form>
    </div>
  );
}

const DEFAULT_ROI: ROIInputs = {
  number_of_reps: 25,
  emails_per_rep_per_week: 200,
  new_contacts_per_rep_per_week: 50,
  cleanup_hours_per_rep_per_month: 2.0,
  rep_hourly_cost: 50.0,
  annual_data_cost: 18000.0,
  confidence_factor: 0.5,
};

const TABS = ["Executive Summary", "RevOps Breakdown", "At-Risk Records", "Fix & Export"] as const;
type Tab = typeof TABS[number];

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [emailCol, setEmailCol] = useState("");
  const [sourceCol, setSourceCol] = useState("");
  const [phoneCol, setPhoneCol] = useState("");
  const [roi, setRoi] = useState<ROIInputs>(DEFAULT_ROI);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [roiResult, setRoiResult] = useState<ROIResult | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Executive Summary");

  // Handle HubSpot OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("hubspot") === "connected") {
      const token = sessionStorage.getItem("hubspot_token");
      if (token) {
        sessionStorage.removeItem("hubspot_token");
        window.history.replaceState({}, "", "/");
        setScanning(true);
        setError(null);
        runHubSpotScan(token, roi)
          .then((result) => {
            setScanResult(result.scan);
            setRoiResult(result.roi);
            setActiveTab("Executive Summary");
            setColumns(["email", "phone", "first_name", "last_name", "company", "title", "source"]);
            setEmailCol("email");
            setPhoneCol("phone");
            setSourceCol("source");
          })
          .catch((e) => setError("HubSpot scan failed: " + e))
          .finally(() => setScanning(false));
      }
    }
    if (params.get("hubspot") === "error") {
      window.history.replaceState({}, "", "/");
      setError("HubSpot connection failed. Please try again.");
    }
  }, []);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setScanResult(null);
    setRoiResult(null);
    setError(null);
    try {
      const data = await fetchColumns(f);
      setColumns(data.columns);
      setTotalRows(data.total_rows);
      setEmailCol(data.guesses.email ?? data.columns[0] ?? "");
      setSourceCol(data.guesses.source ?? "");
      setPhoneCol(data.guesses.phone ?? "");
    } catch (e) {
      setError("Could not read file: " + e);
    }
  }, []);

  const handleScan = async () => {
    if (!file || !emailCol) return;
    setScanning(true);
    setError(null);
    try {
      const result = await runScan(file, emailCol, sourceCol || null, phoneCol || null, roi);
      setScanResult(result.scan);
      setRoiResult(result.roi);
      setActiveTab("Executive Summary");
    } catch (e) {
      setError("Scan failed: " + e);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <Logo />
          <a
            href="https://calendly.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm px-4 py-2"
          >
            Book a Call
          </a>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-8 flex gap-6">
        {/* Sidebar: ROI inputs */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <div className="card sticky top-24">
            <ROIPanel values={roi} onChange={setRoi} />
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 space-y-6">
          <p className="text-sm text-gray-500">
            Upload a CRM export to scan for bad data, quantify business impact, and surface what to do next.
          </p>

          {/* Step 1 */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <h2 className="font-semibold text-brand-900">Upload Contacts CSV</h2>
            </div>
            <UploadZone onFile={handleFile} loading={scanning} />
            {file && totalRows != null && (
              <p className="text-sm text-gray-600">
                ✅ <strong>{file.name}</strong> — {totalRows.toLocaleString()} contacts · {columns.length} columns
              </p>
            )}
          </div>

          {/* Step 2 */}
          {columns.length > 0 && (
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <h2 className="font-semibold text-brand-900">Map Columns</h2>
              </div>
              <ColumnSelector
                columns={columns}
                emailCol={emailCol}
                sourceCol={sourceCol}
                phoneCol={phoneCol}
                onChange={(key, val) => {
                  if (key === "emailCol") setEmailCol(val);
                  if (key === "sourceCol") setSourceCol(val);
                  if (key === "phoneCol") setPhoneCol(val);
                }}
              />
            </div>
          )}

          {/* Step 3 */}
          {columns.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                <h2 className="font-semibold text-brand-900">Run Scan</h2>
              </div>
              <button onClick={handleScan} disabled={scanning || !emailCol} className="btn-primary w-full text-base py-3">
                {scanning ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Scanning contacts…
                  </span>
                ) : "Run ContactZen Scan"}
              </button>
              {error && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
              )}
            </div>
          )}

          {/* Lead capture */}
          {scanResult && <LeadCapture />}

          {/* Results */}
          {scanResult && roiResult && file && (
            <div className="card p-0 overflow-hidden">
              <div className="border-b border-gray-100 px-6 flex gap-1 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={clsx("py-4 px-3 text-sm font-medium whitespace-nowrap transition-colors", activeTab === tab ? "tab-active" : "tab-inactive")}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="p-6">
                {activeTab === "Executive Summary" && <ExecutiveSummary scan={scanResult} roi={roiResult} numberOfReps={roi.number_of_reps} />}
                {activeTab === "RevOps Breakdown" && <RevOpsBreakdown scan={scanResult} />}
                {activeTab === "At-Risk Records" && <AtRiskRecords scan={scanResult} />}
                {activeTab === "Fix & Export" && <FixExport scan={scanResult} file={file} emailCol={emailCol} phoneCol={phoneCol || null} />}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
