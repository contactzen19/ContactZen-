"use client";
import { ScanResult } from "@/lib/types";

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(","), ...rows.map(r => cols.map(c => JSON.stringify(r[c] ?? "")).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AtRiskRecords({ scan }: { scan: ScanResult }) {
  const rows = scan.high_risk_sample;

  // Breakdown by reason
  const reasonCounts: Record<string, number> = {};
  rows.forEach((r) => {
    const reason = String(r.cz_reason ?? "Unknown");
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
  });
  const topReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const preview = rows.slice(0, 20);
  const nameCols = ["first_name", "firstname", "last_name", "lastname", "name"].filter(c => c in (rows[0] ?? {}));
  const emailCol = Object.keys(rows[0] ?? {}).find(c => c === "email" || c.includes("email")) ?? "";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-brand-900">At-Risk Records</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {scan.contact_invalid.toLocaleString()} contacts flagged across your database
          </p>
        </div>
        <button
          onClick={() => downloadCSV(rows, "contactzen_at_risk.csv")}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export full list ({rows.length})
        </button>
      </div>

      {/* Reason breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {topReasons.map(([reason, count]) => (
          <div key={reason} className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-red-700 font-medium">{reason}</span>
            <span className="text-sm font-bold text-red-600">{count.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Preview table — top 20 */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Showing top 20 of {rows.length.toLocaleString()} flagged contacts
        </p>
        <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
          <table className="min-w-full text-xs">
            <thead className="bg-brand-50">
              <tr>
                {nameCols.length > 0 && <th className="px-3 py-2.5 text-left font-semibold text-brand-700 uppercase tracking-wide">Name</th>}
                {emailCol && <th className="px-3 py-2.5 text-left font-semibold text-brand-700 uppercase tracking-wide">Email</th>}
                <th className="px-3 py-2.5 text-left font-semibold text-brand-700 uppercase tracking-wide">Risk</th>
                <th className="px-3 py-2.5 text-left font-semibold text-brand-700 uppercase tracking-wide">Reason</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => {
                const name = nameCols.map(c => row[c]).filter(Boolean).join(" ") || "—";
                const email = emailCol ? String(row[emailCol] ?? "—") : "—";
                const risk = String(row.cz_risk ?? "");
                const reason = String(row.cz_reason ?? "—");
                return (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    {nameCols.length > 0 && <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{name}</td>}
                    {emailCol && <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{email}</td>}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${risk === "invalid" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {risk}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > 20 && (
          <div className="mt-3 text-center">
            <button
              onClick={() => downloadCSV(rows, "contactzen_at_risk.csv")}
              className="text-sm text-brand-600 font-medium hover:underline"
            >
              Download all {rows.length.toLocaleString()} flagged contacts →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
