"use client";
export const dynamic = "force-dynamic";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import UploadZone from "@/components/UploadZone";
import ColumnSelector from "@/components/ColumnSelector";
import ROIPanel from "@/components/ROIPanel";
import ExecutiveSummary from "@/components/tabs/ExecutiveSummary";
import RevOpsBreakdown from "@/components/tabs/RevOpsBreakdown";
import AtRiskRecords from "@/components/tabs/AtRiskRecords";
import FixExport from "@/components/tabs/FixExport";
import AuthModal from "@/components/AuthModal";
import { fetchColumns, runScan, runHubSpotScan } from "@/lib/api";
import { ROIInputs, ScanResult, ROIResult } from "@/lib/types";
import { encodeReport, buildSummary } from "@/lib/report";
import { saveScan } from "@/lib/scans";
import { getSupabase } from "@/lib/supabase";

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
        <p className="text-sm font-medium text-brand-800">You&apos;re on the list — I&apos;ll be in touch soon.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-brand-600 px-6 py-5 text-white">
      <p className="font-semibold text-lg mb-1">Want this for your actual CRM?</p>
      <p className="text-brand-200 text-sm mb-4">Enter your email and I&apos;ll reach out to get you set up.</p>
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
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [hubspotToken, setHubspotToken] = useState<string | null>(null);

  // Track auth state
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    sb.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Auto-load demo if ?demo=true
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") {
      window.history.replaceState({}, "", "/app");
      fetch("/demo_contacts.csv")
        .then((r) => r.blob())
        .then((blob) => {
          const file = new File([blob], "demo_contacts.csv", { type: "text/csv" });
          handleFile(file);
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle HubSpot OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("hubspot") === "connected") {
      const token = sessionStorage.getItem("hubspot_token");
      if (token) {
        sessionStorage.removeItem("hubspot_token");
        window.history.replaceState({}, "", "/app");
        setHubspotToken(token);
        setScanning(true);
        setError(null);
        runHubSpotScan(token, roi)
          .then((result) => {
            setScanResult(result.scan);
            setRoiResult(result.roi);
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
  }, [roi]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setScanResult(null);
    setRoiResult(null);
    setError(null);
    setSaved(false);
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
    setSaved(false);
    try {
      const result = await runScan(file, emailCol, sourceCol || null, phoneCol || null, roi);
      setScanResult(result.scan);
      setRoiResult(result.roi);
    } catch (e) {
      setError("Scan failed: " + e);
    } finally {
      setScanning(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setColumns([]);
    setTotalRows(null);
    setEmailCol("");
    setSourceCol("");
    setPhoneCol("");
    setScanResult(null);
    setRoiResult(null);
    setError(null);
    setCopied(false);
    setSaved(false);
    setHubspotToken(null);
  };

  const handleCopyLink = () => {
    if (!scanResult || !roiResult) return;
    const encoded = encodeReport(scanResult, roiResult, roi.number_of_reps);
    const url = `${window.location.origin}/report?d=${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleSave = async () => {
    if (!scanResult || !roiResult) return;
    if (!user) { setShowAuth(true); return; }
    const summary = buildSummary(scanResult, roiResult, roi.number_of_reps);
    await saveScan(summary);
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            {user ? (
              <Link href="/scans" className="text-sm text-gray-600 hover:text-brand-600 transition-colors font-medium">
                My Scans
              </Link>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="text-sm text-gray-600 hover:text-brand-600 transition-colors font-medium"
              >
                Sign In
              </button>
            )}
            <a
              href="https://calendly.com/contactzen-joey/new-meeting"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm px-4 py-2"
            >
              Book a Call
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-8 flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 hidden lg:block">
          <div className="sticky top-24 space-y-4">
            {scanResult && roiResult ? (
              <>
                {/* Post-scan: big number + actions */}
                <div className="rounded-xl p-5 text-white space-y-4" style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-brand-300 mb-1">GTM Waste Detected</p>
                    <p className="text-4xl font-extrabold">${Math.round(roiResult.total_annual_impact).toLocaleString()}</p>
                    <p className="text-brand-200 text-xs mt-1">estimated annual impact</p>
                  </div>
                  <div className="border-t border-white/20 pt-4 space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-200">Rep time waste</span>
                      <span className="font-semibold">${Math.round(roiResult.rep_productivity_loss).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-200">Data vendor waste</span>
                      <span className="font-semibold">${Math.round(roiResult.estimated_data_waste).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-brand-200">Wasted emails / yr</span>
                      <span className="font-semibold">{roiResult.wasted_emails.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {/* Actions */}
                <div className="card space-y-2">
                  <button onClick={handleCopyLink} className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5">
                    {copied ? "✅ Link Copied!" : "🔗 Share Report"}
                  </button>
                  <button onClick={handleSave} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm py-2.5">
                    {saved ? "✅ Saved" : "💾 Save Scan"}
                  </button>
                  <button onClick={handleReset} className="btn-secondary w-full flex items-center justify-center gap-2 text-sm py-2.5">
                    ↩ New Scan
                  </button>
                </div>
              </>
            ) : (
              <div className="card">
                <ROIPanel values={roi} onChange={setRoi} />
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Pre-scan: upload + column mapping + run */}
          {!scanResult && (
            <>
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
            </>
          )}

          {/* Share / Save / Reset — mobile only (sidebar handles desktop) */}
          {scanResult && roiResult && (
            <div className="flex flex-col sm:flex-row gap-3 lg:hidden">
              <button onClick={handleCopyLink} className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                {copied ? "✅ Link Copied!" : "🔗 Copy Shareable Report Link"}
              </button>
              <button onClick={handleSave} className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                {saved ? "✅ Scan Saved" : "💾 Save Scan"}
              </button>
              <button onClick={handleReset} className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5 px-5">
                ↩ New Scan
              </button>
            </div>
          )}

          {/* Lead capture */}
          {scanResult && <LeadCapture />}

          {/* Results — vertical sections */}
          {scanResult && roiResult && (
            <>
              <div className="card">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 rounded-full bg-brand-600" />
                  <h2 className="font-bold text-brand-900 text-lg">Executive Summary</h2>
                </div>
                <ExecutiveSummary scan={scanResult} roi={roiResult} numberOfReps={roi.number_of_reps} />
              </div>

              <div className="card">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 rounded-full bg-brand-600" />
                  <h2 className="font-bold text-brand-900 text-lg">RevOps Breakdown</h2>
                </div>
                <RevOpsBreakdown scan={scanResult} />
              </div>

              <div className="card">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 rounded-full bg-red-500" />
                  <h2 className="font-bold text-brand-900 text-lg">At-Risk Records</h2>
                </div>
                <AtRiskRecords scan={scanResult} />
              </div>

              <div className="card">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1 h-6 rounded-full bg-brand-600" />
                  <h2 className="font-bold text-brand-900 text-lg">Fix &amp; Export</h2>
                </div>
                <FixExport scan={scanResult} file={file} emailCol={emailCol} phoneCol={phoneCol || null} hubspotToken={hubspotToken} annualDataCost={roi.annual_data_cost} numberOfReps={roi.number_of_reps} />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
