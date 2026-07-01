"use client";
export const dynamic = "force-dynamic";
import { useState, useCallback } from "react";
import Logo from "@/components/Logo";
import UploadZone from "@/components/UploadZone";
import { fetchColumns, runScan } from "@/lib/api";
import { ROIInputs, ScanResult } from "@/lib/types";

// The backend scan still takes ROI inputs. We pass quiet defaults and never
// show them. This tool is a free reachability score, not an ROI fact-finder.
const SILENT_ROI: ROIInputs = {
  number_of_reps: 1,
  emails_per_rep_per_week: 200,
  new_contacts_per_rep_per_week: 50,
  cleanup_hours_per_rep_per_month: 2.0,
  rep_hourly_cost: 50.0,
  annual_data_cost: 0,
  loaded_ote: 0,
  selling_time_pct: 0.35,
  list_coverage_pct: 0.40,
  reply_rate: 0.015,
  mtg_to_deal_pct: 0.20,
  avg_contract_value: 0,
};

const CALENDLY = "https://calendly.com/joey-reachaudit/30min";

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
      <div className="rounded-xl bg-brand-50 border border-brand-200 px-6 py-4">
        <p className="text-sm font-medium text-brand-800">Got it. I&apos;ll be in touch soon.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-brand-600 px-6 py-5 text-white">
      <p className="font-semibold text-lg mb-1">Want your list handled every month?</p>
      <p className="text-brand-200 text-sm mb-4">Leave your email and I&apos;ll reach out to get you set up.</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          placeholder="you@agency.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg px-4 py-2 text-sm text-gray-900 outline-none"
        />
        <button
          type="submit"
          disabled={sending}
          className="bg-white text-brand-700 font-semibold text-sm px-5 py-2 rounded-lg hover:bg-brand-50 transition-colors disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" }) {
  return (
    <div className="rounded-xl p-4 bg-gray-50 border border-gray-100">
      <p className={`text-2xl font-extrabold ${tone === "good" ? "text-green-600" : "text-brand-900"}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

export default function FreeScore() {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [totalRows, setTotalRows] = useState<number | null>(null);
  const [emailCol, setEmailCol] = useState("");
  const [phoneCol, setPhoneCol] = useState("");
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scan, setScan] = useState<ScanResult | null>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setScan(null);
    setError(null);
    try {
      const data = await fetchColumns(f);
      setColumns(data.columns);
      setTotalRows(data.total_rows);
      setEmailCol(data.guesses.email ?? data.columns[0] ?? "");
      setPhoneCol(data.guesses.phone ?? "");
    } catch {
      setError("Could not read this file. Please upload a valid CSV and try again.");
    }
  }, []);

  const overCap = totalRows != null && totalRows > 50000;

  const handleScan = async () => {
    if (!file || !emailCol) return;
    setScanning(true);
    setError(null);
    try {
      const result = await runScan(
        file,
        emailCol,
        null,
        phoneCol || null,
        SILENT_ROI,
        { lastSendCol: null, lastOpenCol: null, lastReplyCol: null },
        false,
      );
      setScan(result.scan);
    } catch {
      setError("Scan failed. Please try again in a moment.");
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    setFile(null);
    setColumns([]);
    setTotalRows(null);
    setEmailCol("");
    setPhoneCol("");
    setScan(null);
    setError(null);
  };

  const total = scan?.total ?? 0;
  const reachable = scan?.contact_valid ?? 0;
  const needAttention = scan ? scan.contact_invalid + scan.contact_risky : 0;
  const invalidEmails = scan?.invalid ?? 0;
  const health = scan ? Math.max(0, Math.min(100, Math.round(100 - scan.contact_high_risk_rate * 100))) : 0;
  const healthLabel = health >= 90 ? "Healthy" : health >= 75 ? "Good shape" : health >= 50 ? "Worth a cleanup" : "Worth a cleanup";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between">
          <Logo />
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm px-4 py-2">
            Book a call
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">
        {!scan && (
          <>
            <div>
              <h1 className="text-2xl font-extrabold text-brand-900 mb-2">Score your list free</h1>
              <p className="text-gray-500">
                Drop in the list you bought and see how many of the leads you can actually reach. No signup, no data stored, takes a minute.
              </p>
            </div>

            <div className="card space-y-4">
              <UploadZone onFile={handleFile} loading={scanning} />
              {file && totalRows != null && (
                <p className="text-sm text-gray-600">
                  <strong>{file.name}</strong> · {totalRows.toLocaleString()} leads
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <span>Not sure about the format?</span>
                <a
                  href="/reachaudit-export-template.csv"
                  download
                  className="text-brand-700 font-semibold hover:text-brand-800 underline underline-offset-2"
                >
                  Download a sample CSV
                </a>
              </div>
            </div>

            {columns.length > 0 && overCap && (
              <div className="card border-2 border-brand-300 space-y-3">
                <h2 className="font-semibold text-brand-900">That&apos;s a big list</h2>
                <p className="text-sm text-gray-600">
                  Your file has {totalRows?.toLocaleString()} leads. For a list this size, let&apos;s hop on a quick call and I&apos;ll run the whole thing for you.
                </p>
                <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-primary w-full text-base py-3 inline-flex items-center justify-center">
                  Book a call
                </a>
              </div>
            )}

            {columns.length > 0 && !overCap && (
              <div className="card space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email column</label>
                    <select
                      value={emailCol}
                      onChange={(e) => setEmailCol(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    >
                      {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                      Phone column <span className="font-normal text-gray-400">(optional)</span>
                    </label>
                    <select
                      value={phoneCol}
                      onChange={(e) => setPhoneCol(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    >
                      <option value="">(none)</option>
                      {columns.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={handleScan} disabled={scanning || !emailCol} className="btn-primary w-full text-base py-3">
                  {scanning ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Scoring your list…
                    </span>
                  ) : "Get my score"}
                </button>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
                )}
              </div>
            )}

            {error && columns.length === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
            )}
          </>
        )}

        {scan && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Your reachability score</p>
                <h1 className="text-xl font-extrabold text-brand-900">{file?.name}</h1>
                <p className="text-xs text-gray-400 mt-0.5">{total.toLocaleString()} leads · no data stored</p>
              </div>
              <button onClick={reset} className="btn-secondary text-sm py-2 px-4">New score</button>
            </div>

            <div className="card">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm text-gray-500">Reachability score</span>
                <span className="text-sm text-green-600 font-medium">{healthLabel}</span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-extrabold text-brand-900">{health}</span>
                <span className="text-gray-400">/ 100</span>
              </div>
              <p className="text-brand-900">
                <strong>{reachable.toLocaleString()} of your {total.toLocaleString()} leads are reachable right now.</strong> Here&apos;s what&apos;s in the file.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Metric label="reachable right now" value={reachable.toLocaleString()} tone="good" />
              <Metric label="flagged to skip" value={needAttention.toLocaleString()} />
              <Metric label="dead emails" value={invalidEmails.toLocaleString()} />
            </div>

            <div className="card space-y-4">
              <div>
                <h2 className="font-bold text-brand-900 text-lg mb-1">Want the full list, handled?</h2>
                <p className="text-gray-500 text-sm">
                  We&apos;ll clean it, check every number against the Do Not Call list, rank it by who to call first, and keep it current every month. Book a quick call and I&apos;ll walk you through it.
                </p>
              </div>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-primary w-full text-base py-3 inline-flex items-center justify-center">
                Book a call
              </a>
            </div>

            <LeadCapture />
          </>
        )}
      </div>
    </div>
  );
}
