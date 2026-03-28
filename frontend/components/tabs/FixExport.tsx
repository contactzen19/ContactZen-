"use client";
import { useState } from "react";
import { ScanResult } from "@/lib/types";
import { downloadFixed, writebackToHubSpot } from "@/lib/api";

const fmtNum = (x: number) => x.toLocaleString();

interface Props {
  scan: ScanResult;
  file: File;
  emailCol: string;
  phoneCol: string | null;
  hubspotToken?: string | null;
}

export default function FixExport({ scan, file, emailCol, phoneCol, hubspotToken }: Props) {
  const [fixes, setFixes] = useState<Record<string, boolean>>({
    suppress_invalid_email: true,
    tag_risky_email: false,
    suppress_invalid_phone: false,
    deduplicate_email: scan.email_dupes > 0,
    flag_enrichment: false,
  });
  const [loading, setLoading] = useState<"clean" | "suppression" | null>(null);
  const [writeback, setWriteback] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [writebackResult, setWritebackResult] = useState<{ updated: number; errors: number; total: number } | null>(null);

  const handleWriteback = async () => {
    if (!hubspotToken) return;
    setWriteback("loading");
    try {
      const result = await writebackToHubSpot(hubspotToken);
      setWritebackResult(result);
      setWriteback("done");
    } catch {
      setWriteback("error");
    }
  };

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
    { key: "tag_risky_email", label: "Tag risky emails", count: scan.risky, help: "Adds a cz_risky_email column to your export — keeps the contact, flags it for review or suppression in your CRM." },
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

      {/* HubSpot Writeback */}
      {hubspotToken && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">HS</div>
            <div>
              <p className="font-semibold text-gray-900 text-sm">Write Scores to HubSpot</p>
              <p className="text-xs text-gray-500">Pushes <code className="bg-orange-100 px-1 rounded">cz_risk</code>, <code className="bg-orange-100 px-1 rounded">cz_reason</code>, and <code className="bg-orange-100 px-1 rounded">cz_risky_email</code> directly to each contact as custom properties. Creates the properties automatically if they don&apos;t exist.</p>
            </div>
          </div>

          {writeback === "done" && writebackResult && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              ✅ <strong>{writebackResult.updated.toLocaleString()} contacts updated</strong> in HubSpot.
              {writebackResult.errors > 0 && <span className="text-yellow-700 ml-2">({writebackResult.errors} errors)</span>}
              {" "}Filter by <code className="bg-green-100 px-1 rounded">cz_risk = invalid</code> or <code className="bg-green-100 px-1 rounded">cz_risky_email = true</code> to build suppression lists.
            </div>
          )}

          {writeback === "error" && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              Writeback failed. Your HubSpot session may have expired — reconnect and try again.
            </div>
          )}

          {writeback !== "done" && (
            <button
              onClick={handleWriteback}
              disabled={writeback === "loading"}
              className="btn-primary text-sm w-full flex items-center justify-center gap-2"
            >
              {writeback === "loading" ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Writing to HubSpot…
                </>
              ) : "Write Risk Scores to HubSpot"}
            </button>
          )}
        </div>
      )}

      {/* Coming Soon: Contact Recovery */}
      <div className="rounded-2xl border-2 border-dashed border-brand-300 bg-gradient-to-br from-brand-50 to-white p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #9F67FF)" }}>
            🔮
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-brand-900">Contact Recovery Engine</h3>
              <span className="text-xs font-bold bg-brand-600 text-white px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
            <p className="text-xs text-brand-600 font-medium">The future of ContactZen</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed">
          Every contact we suppress today goes into a <strong>recovery pool</strong> — not the trash. When ContactZen&apos;s recovery engine launches, we&apos;ll automatically find replacement emails and phone numbers for your suppressed contacts, validate them, and put the good ones back in your pipeline.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: "🏷️", title: "Suppress today", desc: "Bad contacts are quarantined, not deleted. They stay in HubSpot — just out of your active sequences." },
            { icon: "🔍", title: "Recover tomorrow", desc: "ContactZen finds verified replacement contact info from trusted enrichment sources." },
            { icon: "✅", title: "Flip to active", desc: "Recovered contacts are validated and pushed back to HubSpot — clean, verified, ready to work." },
          ].map((s) => (
            <div key={s.title} className="bg-white border border-brand-100 rounded-xl p-4">
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-sm font-bold text-brand-900 mb-1">{s.title}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>

        <div className="bg-brand-600 rounded-xl px-5 py-4 text-white">
          <p className="text-sm font-semibold mb-0.5">What this means for your team</p>
          <p className="text-xs text-brand-200 leading-relaxed">
            If even 10% of your suppressed contacts are recoverable, that&apos;s pipeline you already paid for — coming back to life automatically. No new data spend. No manual research. Just recovered revenue.
          </p>
        </div>

        <div className="border-t border-brand-200 pt-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Also on the roadmap</p>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-center gap-2"><span className="text-brand-400">→</span> <strong>Continuous monitoring</strong> — weekly scans against your live HubSpot data, no CSV required</li>
            <li className="flex items-center gap-2"><span className="text-brand-400">→</span> <strong>Pre-sequence protection</strong> — flag risky contacts before they enter a sequence</li>
            <li className="flex items-center gap-2"><span className="text-brand-400">→</span> <strong>Vendor scorecards</strong> — hold ZoomInfo, Apollo, and Lusha accountable with monthly quality reports</li>
            <li className="flex items-center gap-2"><span className="text-brand-400">→</span> <strong>HubSpot writeback</strong> — push risk scores and dispositions directly as contact properties</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
