"use client";
export const dynamic = "force-dynamic";
import { useState, useCallback } from "react";
import Logo from "@/components/Logo";
import UploadZone from "@/components/UploadZone";
import { fetchColumns, runScan, quickPhoneCheck, PhoneQuickResult } from "@/lib/api";
import { ROIInputs, ScanResult } from "@/lib/types";
import { getSupabase } from "@/lib/supabase";

// Anonymous usage ping: summary numbers only, never contacts. The site
// promises "no data stored" about the user's list — keep it that way.
function logScanEvent(mode: "upload" | "paste", scan: ScanResult) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    void sb.from("scan_events").insert({
      mode,
      leads: scan.total,
      score: Math.max(0, Math.min(100, Math.round(100 - scan.contact_high_risk_rate * 100))),
      reachable: scan.contact_valid,
      flagged: scan.contact_invalid + scan.contact_risky,
      dead_emails: scan.invalid,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      is_mobile: typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : null,
    }).then(() => {});
  } catch {
    // Logging must never break the score.
  }
}

function logPhoneEvent(results: PhoneQuickResult[]) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    void sb.from("scan_events").insert({
      mode: "phone",
      leads: results.length,
      score: null,
      reachable: results.filter((r) => r.verdict === "live").length,
      flagged: results.filter((r) => r.verdict === "dead").length,
      dead_emails: null,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      is_mobile: typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : null,
    }).then(() => {});
  } catch {
    // Logging must never break the check.
  }
}

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
const STRIPE_AUDIT = "https://buy.stripe.com/3cIfZi98L1XW8tsfazb7y01";
const FREE_UPLOAD_CAP = 500;

function LeadCapture({ context }: { context?: { score: number; leads: number; label: string } }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await fetch("https://formspree.io/f/xykbydze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        ...(context ? { their_score: context.score, leads_scanned: context.leads, scan_type: context.label } : {}),
      }),
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

const QUICK_CHECK_CAP = 10;
const QUICK_PHONE_CAP = 5;
const QUICK_MAX_CONTACTS = 5;

type QuickRow = { email: string; phone: string };

function isPhoneish(p: string): boolean {
  const d = p.replace(/\D/g, "");
  return d.length === 10 || (d.length === 11 && d.startsWith("1"));
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
  const [mode, setMode] = useState<"upload" | "paste">("paste");
  const [rows, setRows] = useState<QuickRow[]>([
    { email: "", phone: "" },
    { email: "", phone: "" },
    { email: "", phone: "" },
  ]);
  const [scanLabel, setScanLabel] = useState("");
  const [phoneResults, setPhoneResults] = useState<PhoneQuickResult[]>([]);
  const [phoneNote, setPhoneNote] = useState<string | null>(null);

  const setRow = (i: number, field: keyof QuickRow, value: string) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setScanLabel(f.name);
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

  const quickEmails = Array.from(
    new Set(rows.map((r) => r.email.trim()).filter((e) => e.includes("@")))
  ).slice(0, QUICK_CHECK_CAP);
  const quickPhones = Array.from(
    new Set(rows.map((r) => r.phone.trim()).filter(isPhoneish))
  ).slice(0, QUICK_PHONE_CAP);
  const quickCount = quickEmails.length + quickPhones.length;

  const handleQuickCheck = async () => {
    const emails = quickEmails;
    const phones = quickPhones;
    if (emails.length === 0 && phones.length === 0) return;
    setScanning(true);
    setError(null);
    setPhoneNote(null);

    const parts: string[] = [];
    if (emails.length) parts.push(`${emails.length} ${emails.length === 1 ? "email" : "emails"}`);
    if (phones.length) parts.push(`${phones.length} ${phones.length === 1 ? "phone" : "phones"}`);
    setScanLabel(`Quick check · ${parts.join(" · ")}`);

    let newScan: ScanResult | null = null;
    let newPhones: PhoneQuickResult[] = [];

    if (emails.length) {
      const csv = "email\n" + emails.join("\n");
      const f = new File([csv], "quick-check.csv", { type: "text/csv" });
      setFile(f);
      try {
        const result = await runScan(
          f,
          "email",
          null,
          null,
          SILENT_ROI,
          { lastSendCol: null, lastOpenCol: null, lastReplyCol: null },
          false,
        );
        newScan = result.scan;
        logScanEvent("paste", result.scan);
      } catch {
        setError("Check failed. Please try again in a moment.");
        setScanning(false);
        return;
      }
    }

    if (phones.length) {
      try {
        const pr = await quickPhoneCheck(phones);
        newPhones = pr.results;
        logPhoneEvent(newPhones);
      } catch {
        // Phone checking may be off (not configured) or rate limited.
        setPhoneNote(
          emails.length
            ? "Phone checking isn't available right now, so this score covers the emails only."
            : null
        );
        if (!emails.length) {
          setError("Phone checking isn't available right now. Try emails, or book a call for a full audit.");
          setScanning(false);
          return;
        }
      }
    }

    setScan(newScan);
    setPhoneResults(newPhones);
    setScanning(false);
  };

  const overCap = totalRows != null && totalRows > FREE_UPLOAD_CAP;

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
      logScanEvent("upload", result.scan);
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
    setRows([
      { email: "", phone: "" },
      { email: "", phone: "" },
      { email: "", phone: "" },
    ]);
    setScanLabel("");
    setPhoneResults([]);
    setPhoneNote(null);
  };

  const total = scan?.total ?? 0;
  const reachable = scan?.contact_valid ?? 0;
  const needAttention = scan ? scan.contact_invalid + scan.contact_risky : 0;
  const invalidEmails = scan?.invalid ?? 0;
  const health = scan ? Math.max(0, Math.min(100, Math.round(100 - scan.contact_high_risk_rate * 100))) : 0;
  const healthLabel = health >= 90 ? "Healthy" : health >= 75 ? "Good shape" : health >= 50 ? "Worth a cleanup" : "Needs attention";
  const healthColor = health >= 75 ? "text-green-600" : health >= 50 ? "text-amber-600" : "text-red-600";

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
        {!scan && phoneResults.length === 0 && (
          <>
            <div>
              <h1 className="text-2xl font-extrabold text-brand-900 mb-2">Score your list free</h1>
              <p className="text-gray-500">
                Real email and phone reachability, checked live. Type in a few contacts or drop in the whole list you bought. No signup, no data stored, takes a minute.
              </p>
            </div>

            <div className="card space-y-4">
              <div className="flex rounded-xl bg-gray-100 p-1 text-sm font-semibold" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "paste"}
                  onClick={() => { setMode("paste"); setError(null); }}
                  className={`flex-1 rounded-lg px-3 py-2 transition-colors ${mode === "paste" ? "bg-white text-brand-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Check emails + phones
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "upload"}
                  onClick={() => { setMode("upload"); setError(null); }}
                  className={`flex-1 rounded-lg px-3 py-2 transition-colors ${mode === "upload" ? "bg-white text-brand-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                >
                  Score a whole list
                </button>
              </div>

              {mode === "paste" ? (
                <>
                  <p className="text-sm text-gray-600">
                    Live email and phone reachability, per contact. Fill in either field or both.
                  </p>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</label>
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Phone</label>
                    </div>
                    {rows.map((row, i) => (
                      <div key={i} className="grid grid-cols-2 gap-2">
                        <input
                          type="email"
                          inputMode="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          value={row.email}
                          onChange={(e) => setRow(i, "email", e.target.value)}
                          placeholder="name@agency.com"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                        />
                        <input
                          type="tel"
                          inputMode="tel"
                          value={row.phone}
                          onChange={(e) => setRow(i, "phone", e.target.value)}
                          placeholder="(612) 555-0148"
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                        />
                      </div>
                    ))}
                    {rows.length < QUICK_MAX_CONTACTS && (
                      <button
                        type="button"
                        onClick={() => setRows((prev) => [...prev, { email: "", phone: "" }])}
                        className="text-sm font-semibold text-brand-700 hover:text-brand-800"
                      >
                        + Add another contact
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleQuickCheck}
                    disabled={scanning || quickCount === 0}
                    className="btn-primary w-full text-base py-3 disabled:opacity-50"
                  >
                    {scanning ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Checking…
                      </span>
                    ) : quickCount === 0 ? "Check reachability" : `Check ${[
                        quickEmails.length ? `${quickEmails.length} ${quickEmails.length === 1 ? "email" : "emails"}` : "",
                        quickPhones.length ? `${quickPhones.length} ${quickPhones.length === 1 ? "phone" : "phones"}` : "",
                      ].filter(Boolean).join(" + ")}`}
                  </button>
                  <p className="text-xs text-gray-500">
                    Live checks, real answers: does the email land, does the phone ring, cell or landline. Got a whole list? Switch tabs and upload the CSV.
                  </p>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>

            {mode === "upload" && columns.length > 0 && overCap && (
              <div className="card border-2 border-brand-300 space-y-3">
                <h2 className="font-semibold text-brand-900">That&apos;s a big list</h2>
                <p className="text-sm text-gray-600">
                  Your file has {totalRows?.toLocaleString()} leads. The free score covers up to {FREE_UPLOAD_CAP} contacts. For the whole list, the one-time audit covers up to 5,000 contacts for $199, or book a call and we&apos;ll figure out the right fit.
                </p>
                <a href={STRIPE_AUDIT} target="_blank" rel="noopener noreferrer" className="btn-primary w-full text-base py-3 inline-flex items-center justify-center">
                  Buy the $199 audit
                </a>
                <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full text-base py-3 inline-flex items-center justify-center">
                  Book a call
                </a>
              </div>
            )}

            {mode === "upload" && columns.length > 0 && !overCap && (
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

        {(scan || phoneResults.length > 0) && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Your reachability score</p>
                <h1 className="text-xl font-extrabold text-brand-900">{scanLabel || file?.name}</h1>
                <p className="text-xs text-gray-400 mt-0.5">no data stored</p>
              </div>
              <button onClick={reset} className="btn-secondary text-sm py-2 px-4">New score</button>
            </div>

            {scan && (
              <>
                <div className="card">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-sm text-gray-500">Reachability score</span>
                    <span className={`text-sm font-medium ${healthColor}`}>{healthLabel}</span>
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
              </>
            )}

            {phoneNote && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">{phoneNote}</div>
            )}

            {phoneResults.length > 0 && (
              <div className="card">
                <h2 className="font-bold text-brand-900 text-lg mb-3">Phone check</h2>
                <div className="space-y-2">
                  {phoneResults.map((r) => (
                    <div key={r.phone} className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                      <span className="font-mono text-sm text-brand-900">{r.phone}</span>
                      <span className="flex items-center gap-2 text-sm">
                        {r.phone_type && (
                          <span className="text-gray-500">{r.phone_type === "Mobile" ? "Cell" : r.phone_type}</span>
                        )}
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                            r.verdict === "live"
                              ? "bg-green-100 text-green-700"
                              : r.verdict === "dead"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {r.verdict === "live" ? "Rings" : r.verdict === "dead" ? "Dead line" : "Unknown"}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Live line check: connected status and line type. Do Not Call status is part of the full audit.
                </p>
              </div>
            )}

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

            <LeadCapture context={{ score: health, leads: scan ? total : phoneResults.length, label: scanLabel || file?.name || "" }} />
          </>
        )}
      </div>
    </div>
  );
}
