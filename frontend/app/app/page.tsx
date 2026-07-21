"use client";
export const dynamic = "force-dynamic";
import { useState, useCallback } from "react";
import Logo from "@/components/Logo";
import UploadZone from "@/components/UploadZone";
import { fetchColumns, runScan, quickPhoneCheck, PhoneQuickResult, quickEmailCheck, EmailQuickResult } from "@/lib/api";
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

function logQuickEmailEvent(results: EmailQuickResult[]) {
  try {
    const sb = getSupabase();
    if (!sb) return;
    const reachable = results.filter((r) => r.verdict === "valid").length;
    void sb.from("scan_events").insert({
      mode: "paste",
      leads: results.length,
      score: null,
      reachable,
      flagged: results.length - reachable,
      dead_emails: results.filter((r) => r.verdict === "invalid").length,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      is_mobile: typeof window !== "undefined" ? window.matchMedia("(max-width: 640px)").matches : null,
    }).then(() => {});
  } catch {
    // Logging must never break the check.
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
const FREE_UPLOAD_CAP = 50;

// Canned sample result so a cold visitor can see the payoff before doing any
// work. Never sent to the backend, never logged to scan_events.
const SAMPLE_SCAN: ScanResult = {
  total: 10,
  invalid: 3,
  risky: 1,
  valid: 6,
  invalid_rate: 0.3,
  high_risk_rate: 0.4,
  phone_invalid: 1,
  phone_risky: 0,
  phone_valid: 2,
  phone_high_risk_rate: 0.33,
  contact_invalid: 3,
  contact_risky: 1,
  contact_valid: 6,
  contact_high_risk_rate: 0.4,
  completeness_score: 100,
  field_fill_rates: {},
  email_dupes: 0,
  phone_dupes: 0,
  source_breakdown: null,
  zoominfo_high_risk_rate: null,
  bad_zoominfo_contacts: 0,
  zoominfo_flagged_sample: [],
  high_risk_sample: [],
  col_guesses: { email: "email", source: null, phone: null },
};

const SAMPLE_PHONES: PhoneQuickResult[] = [
  { phone: "(612) 555-0148", verdict: "live", phone_type: "Mobile" },
  { phone: "(952) 555-0134", verdict: "dead", phone_type: "Landline" },
  { phone: "(763) 555-0119", verdict: "live", phone_type: "Landline" },
];

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

// Plain-English labels for /api/email-quick reason codes.
const EMAIL_REASON_LABELS: Record<string, string> = {
  empty: "No address given.",
  malformed: "Not a valid email address.",
  syntax: "Not a valid email address.",
  domain_typo: "Domain looks like a typo.",
  no_mx_record: "This domain can't receive email at all.",
  disposable_domain_hint: "Burner / throwaway email domain.",
  suspicious_structure: "Looks machine-generated.",
  no_reply_address: "A no-reply address — nobody reads this inbox.",
  mx_ok: "Domain is live and accepting mail.",
  syntax_ok: "Format looks good.",
};

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
  const [emailResults, setEmailResults] = useState<EmailQuickResult[]>([]);
  const [phoneResults, setPhoneResults] = useState<PhoneQuickResult[]>([]);
  const [phoneNote, setPhoneNote] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [gateEmail, setGateEmail] = useState("");
  const [gateSending, setGateSending] = useState(false);
  const [resultSent, setResultSent] = useState(false);
  const [demo, setDemo] = useState(false);

  // Renders the results view with canned data. No backend call, no scan_events
  // row, no email gate — it's a preview of the payoff, not a real check.
  const showSample = () => {
    setDemo(true);
    setScan(SAMPLE_SCAN);
    setPhoneResults(SAMPLE_PHONES);
    setScanLabel("Sample: 10 purchased leads");
    setUnlocked(true);
    setError(null);
  };

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

    let newEmails: EmailQuickResult[] = [];
    let newPhones: PhoneQuickResult[] = [];

    if (emails.length) {
      try {
        const er = await quickEmailCheck(emails);
        newEmails = er.results;
        logQuickEmailEvent(newEmails);
      } catch (e) {
        setError(
          e instanceof Error && e.message === "429"
            ? "Daily free email-check limit reached. Book a call for a full audit."
            : "Check failed. Please try again in a moment."
        );
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
            ? "Phone checking isn't available right now, so this result covers the emails only."
            : null
        );
        if (!emails.length) {
          setError("Phone checking isn't available right now. Try emails, or book a call for a full audit.");
          setScanning(false);
          return;
        }
      }
    }

    setScan(null);
    setEmailResults(newEmails);
    setPhoneResults(newPhones);
    // Quick checks are the hook — never gate them. The email gate applies
    // only to whole-list uploads (collected up front in handleScan).
    setUnlocked(true);
    setScanning(false);
  };

  const overCap = totalRows != null && totalRows > FREE_UPLOAD_CAP;

  // Whole-list scores are email-gated (quick checks stay open). This is the
  // free tool's lead capture and its friction against drive-by list dumping.
  const gateEmailOk = /^\S+@\S+\.\S+$/.test(gateEmail.trim());

  const handleScan = async () => {
    if (!file || !emailCol || !gateEmailOk) return;
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
      // Email was collected up front, so the breakdown is already unlocked.
      setUnlocked(true);
      // Best-effort lead capture; never blocks the score.
      fetch("https://formspree.io/f/xykbydze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: gateEmail.trim(),
          source: "upload_gate",
          their_score: Math.max(0, Math.min(100, Math.round(100 - result.scan.contact_high_risk_rate * 100))),
          leads_scanned: result.scan.total,
          scan_type: file.name,
        }),
      }).catch(() => {});
    } catch (e) {
      // Surface the backend's own message (rate limits, row caps) when it
      // sends one; fall back to the generic line otherwise.
      let msg = "Scan failed. Please try again in a moment.";
      if (e instanceof Error) {
        try {
          const detail = JSON.parse(e.message)?.detail;
          if (typeof detail === "string" && detail) msg = detail;
        } catch {
          // Not a structured backend error; keep the generic message.
        }
      }
      setError(msg);
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
    setEmailResults([]);
    setPhoneResults([]);
    setPhoneNote(null);
    setUnlocked(false);
    setGateEmail("");
    setResultSent(false);
    setDemo(false);
  };

  // Optional, never blocking: visitor asks for a copy of their quick-check
  // result. Posts the result to Formspree so Joey can reply with it — there
  // is no automated outbound email.
  const handleEmailResult = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateSending(true);
    try {
      await fetch("https://formspree.io/f/xykbydze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: gateEmail.trim(),
          source: "quick_check_email_me",
          their_score: scan ? Math.max(0, Math.min(100, Math.round(100 - scan.contact_high_risk_rate * 100))) : null,
          leads_scanned: emailResults.length + phoneResults.length,
          scan_type: scanLabel,
          email_verdicts: emailResults
            .map((r) => `${r.email}: ${r.verdict} (${r.reason}${r.suggestion ? `, did you mean ${r.suggestion}` : ""})`)
            .join(", "),
          phone_verdicts: phoneResults
            .map((r) => `${r.phone}: ${r.verdict}${r.phone_type ? ` (${r.phone_type})` : ""}`)
            .join(", "),
        }),
      });
    } catch {
      // Capture is best-effort; don't surface an error for an optional ask.
    }
    setResultSent(true);
    setGateSending(false);
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setGateSending(true);
    try {
      await fetch("https://formspree.io/f/xykbydze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: gateEmail,
          source: "score_unlock",
          their_score: scan ? Math.max(0, Math.min(100, Math.round(100 - scan.contact_high_risk_rate * 100))) : null,
          leads_scanned: scan ? scan.total : phoneResults.length,
          scan_type: scanLabel || file?.name || "",
        }),
      });
    } catch {
      // Never hold the breakdown hostage to a network hiccup.
    }
    setUnlocked(true);
    setGateSending(false);
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
                Real email and phone reachability, checked live. Type in a few contacts or drop in the whole list you bought. Quick checks need no signup. Whole-list scores just take an email. Either way your list is never stored.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Same engine we run monthly audits on for our first agency customers.
              </p>
              <button
                type="button"
                onClick={showSample}
                className="mt-3 text-sm font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2"
              >
                Not sure what you&apos;ll get? See a sample score first
              </button>
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
                  Your file has {totalRows?.toLocaleString()} leads. The free score covers up to {`${FREE_UPLOAD_CAP} contacts`}. For the whole list, the one-time audit covers up to 5,000 contacts for $199, or book a call and we&apos;ll figure out the right fit.
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
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Your email</label>
                  <input
                    type="email"
                    value={gateEmail}
                    onChange={(e) => setGateEmail(e.target.value)}
                    placeholder="you@yourcompany.com"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    Whole-list scores take an email so the free tool stays free. Your list itself is never stored.
                  </p>
                </div>
                <button onClick={handleScan} disabled={scanning || !emailCol || !gateEmailOk} className="btn-primary w-full text-base py-3">
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

        {(scan || emailResults.length > 0 || phoneResults.length > 0) && (
          <>
            {demo && (
              <div className="bg-brand-50 border border-brand-200 rounded-lg px-4 py-3 text-sm text-brand-900">
                <strong>This is a sample</strong> showing what a real check looks like: 10 purchased leads, scored live. Your own check takes about 30 seconds and no signup.
              </div>
            )}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{demo ? "Sample reachability score" : "Your reachability score"}</p>
                <h1 className="text-xl font-extrabold text-brand-900">{scanLabel || file?.name}</h1>
                <p className="text-xs text-gray-400 mt-0.5">no data stored</p>
              </div>
              <button onClick={reset} className="btn-secondary text-sm py-2 px-4">{demo ? "Check my own free" : "New score"}</button>
            </div>

            {scan && (
              <div className="card">
                {/* A /100 score against 1-3 contacts is noise (it can only be
                    0/50/100), so quick checks skip it and lead with the verdict. */}
                {!scanLabel.startsWith("Quick check") && (
                  <>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm text-gray-500">Reachability score</span>
                      <span className={`text-sm font-medium ${healthColor}`}>{healthLabel}</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-4xl font-extrabold text-brand-900">{health}</span>
                      <span className="text-gray-400">/ 100</span>
                    </div>
                  </>
                )}
                <p className="text-brand-900">
                  <strong>{reachable.toLocaleString()} of {demo ? "the" : "your"} {total.toLocaleString()} leads {demo ? "in this sample" : ""} are reachable right now.</strong> The breakdown shows which checks passed and failed.
                </p>
              </div>
            )}

            {phoneNote && unlocked && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">{phoneNote}</div>
            )}

            <div className={unlocked ? "space-y-6" : "relative"}>
              <div className={unlocked ? "space-y-6" : "space-y-6 blur-sm pointer-events-none select-none"} aria-hidden={!unlocked}>
                {scan && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Metric label="reachable right now" value={reachable.toLocaleString()} tone="good" />
                    <Metric label="flagged to skip" value={needAttention.toLocaleString()} />
                    <Metric label="dead emails" value={invalidEmails.toLocaleString()} />
                  </div>
                )}

                {emailResults.length > 0 && (
                  <div className="card">
                    <h2 className="font-bold text-brand-900 text-lg mb-3">Email check</h2>
                    <div className="space-y-2">
                      {emailResults.map((r) => (
                        <div key={r.email} className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-sm text-brand-900 break-all">{r.email}</span>
                            <span
                              className={`font-semibold px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${
                                r.verdict === "valid"
                                  ? "bg-green-100 text-green-700"
                                  : r.verdict === "invalid"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {r.verdict === "valid" ? "Good" : r.verdict === "invalid" ? "Dead" : "Risky"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {r.suggestion
                              ? <>Looks like a typo. Did you mean <span className="font-mono text-brand-900">{r.suggestion}</span>?</>
                              : EMAIL_REASON_LABELS[r.reason] ?? r.reason}
                            {r.role_account && " · Shared inbox (info@, sales@) — a person rarely replies."}
                            {r.free_mail && !r.suggestion && " · Personal inbox, not a company address."}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      Free check: format, typo screen, and whether the domain accepts mail. Mailbox-level verification is part of the full audit.
                    </p>
                  </div>
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
              </div>

              {!unlocked && (
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <form onSubmit={handleUnlock} className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 w-full max-w-sm space-y-3">
                    <p className="font-bold text-brand-900 text-lg">See the full breakdown</p>
                    <p className="text-sm text-gray-500">
                      Which checks passed, which failed, and the phone verdicts. Drop your email and it unlocks.
                    </p>
                    <input
                      type="email"
                      required
                      placeholder="you@agency.com"
                      value={gateEmail}
                      onChange={(e) => setGateEmail(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    />
                    <button type="submit" disabled={gateSending} className="btn-primary w-full py-2.5 disabled:opacity-50">
                      {gateSending ? "Unlocking…" : "Unlock the breakdown"}
                    </button>
                    <p className="text-xs text-gray-400">No spam. It lets me follow up if something in your list looks off.</p>
                  </form>
                </div>
              )}
            </div>

            {!demo && scanLabel.startsWith("Quick check") && (
              <div className="card">
                {resultSent ? (
                  <p className="text-sm text-gray-600">Got it. I&apos;ll send this over shortly.</p>
                ) : (
                  <form onSubmit={handleEmailResult} className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <p className="text-sm text-gray-600 sm:flex-1">Want a copy of this result in your inbox?</p>
                    <input
                      type="email"
                      required
                      placeholder="you@agency.com"
                      value={gateEmail}
                      onChange={(e) => setGateEmail(e.target.value)}
                      className="sm:w-56 border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    />
                    <button type="submit" disabled={gateSending} className="btn-secondary text-sm py-2 px-4 disabled:opacity-50">
                      {gateSending ? "Sending…" : "Email me this result"}
                    </button>
                  </form>
                )}
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

          </>
        )}
      </div>
    </div>
  );
}
