"use client";
import { ScanResult } from "@/lib/types";

const fmt = (x: number) => `${(x * 100).toFixed(1)}%`;
const fmtNum = (x: number) => x.toLocaleString();

const REASON_MAP: Record<string, string> = {
  empty: "Missing Email Address",
  malformed: "Broken Email Format",
  syntax: "Invalid Email",
  disposable_domain_hint: "Temporary / Fake Email",
  suspicious_structure: "Suspicious Email",
  missing_phone: "Missing Phone",
  invalid_phone: "Invalid Phone Number",
  shared_or_main_line_suspected: "Shared / Main Line",
};

export default function RevOpsBreakdown({ scan }: { scan: ScanResult }) {
  const issueCounts: Record<string, number> = {};
  scan.high_risk_sample.forEach((row) => {
    const reason = String(row.cz_reason ?? "").toLowerCase();
    const label = REASON_MAP[reason] ?? "Other";
    issueCounts[label] = (issueCounts[label] ?? 0) + 1;
  });
  const topIssues = Object.entries(issueCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Issue breakdown */}
      <div className="card">
        <h3 className="font-semibold text-brand-900 mb-1">Top Data Quality Issues</h3>
        <p className="text-xs text-gray-500 mb-4">From the high-risk record sample.</p>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full text-sm">
              <thead className="bg-brand-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-brand-700">Issue</th>
                  <th className="px-4 py-2 text-right font-semibold text-brand-700">Count</th>
                </tr>
              </thead>
              <tbody>
                {topIssues.map(([issue, count]) => (
                  <tr key={issue} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{issue}</td>
                    <td className="px-4 py-2 text-right text-gray-800 font-medium">{fmtNum(count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-sm text-gray-600 space-y-2 py-2">
            <p className="font-semibold text-brand-900 mb-3">Why it matters</p>
            <p>• Invalid emails create hard bounces and damage sender reputation.</p>
            <p>• Bad phones kill direct dial connect rates.</p>
            <p>• Bad records still consume rep time, CRM storage, and paid data budget.</p>
            <p>• Duplicates inflate activity metrics without generating real pipeline.</p>
          </div>
        </div>
      </div>

      {/* Field completeness */}
      <div className="card">
        <h3 className="font-semibold text-brand-900 mb-1">Field Completeness</h3>
        <p className="text-xs text-gray-500 mb-4">
          Percentage of contacts with each key field populated. Overall score: <strong className="text-brand-600">{scan.completeness_score}/100</strong>
        </p>
        <div className="space-y-3">
          {Object.entries(scan.field_fill_rates).map(([field, rate]) => (
            <div key={field}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">{field}</span>
                <span className="text-gray-500">{fmt(rate)} <span className="text-gray-400">({fmtNum(Math.round((1 - rate) * scan.total))} missing)</span></span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${rate >= 0.9 ? "bg-green-400" : rate >= 0.7 ? "bg-amber-400" : "bg-red-400"}`}
                  style={{ width: `${rate * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Duplicates */}
      <div className="card">
        <h3 className="font-semibold text-brand-900 mb-4">Duplicate Records</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-brand-50 p-4 text-center">
            <div className="text-2xl font-bold text-brand-600">{fmtNum(scan.email_dupes)}</div>
            <div className="text-sm text-gray-600 mt-1">Duplicate Emails</div>
          </div>
          <div className="rounded-lg bg-brand-50 p-4 text-center">
            <div className="text-2xl font-bold text-brand-600">{fmtNum(scan.phone_dupes)}</div>
            <div className="text-sm text-gray-600 mt-1">Duplicate Phones</div>
          </div>
        </div>
        {(scan.email_dupes > 0 || scan.phone_dupes > 0) && (
          <p className="text-xs text-gray-500 mt-3">
            Duplicates inflate CRM contact counts, split engagement history, and waste sequence budget. Deduplicate before the next outreach run.
          </p>
        )}
      </div>

      {/* Source quality */}
      <div className="card">
        <h3 className="font-semibold text-brand-900 mb-1">Source Quality Breakdown</h3>
        {scan.source_breakdown ? (
          <>
            <p className="text-xs text-gray-500 mb-4">Email risk rate by contact source.</p>
            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="min-w-full text-sm">
                <thead className="bg-brand-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-brand-700">Source</th>
                    {["invalid", "risky", "valid"].map(c => (
                      <th key={c} className="px-4 py-2 text-right font-semibold text-brand-700 capitalize">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scan.source_breakdown.map((row, i) => (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700 font-medium">{row.source}</td>
                      {["invalid", "risky", "valid"].map(c => (
                        <td key={c} className="px-4 py-2 text-right text-gray-600">
                          {row[c as keyof typeof row] != null ? `${((row[c as keyof typeof row] as number) * 100).toFixed(1)}%` : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {scan.zoominfo_high_risk_rate != null && (
              <div className="mt-3 bg-brand-50 border border-brand-200 rounded-lg px-4 py-2.5 text-sm text-brand-800">
                ZoomInfo high-risk rate (invalid + risky): <strong>{fmt(scan.zoominfo_high_risk_rate)}</strong>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-500 mt-2">No source column selected. Add one to compare vendor quality side-by-side.</p>
        )}
      </div>
    </div>
  );
}
