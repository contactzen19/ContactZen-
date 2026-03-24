"use client";
import { ScanResult } from "@/lib/types";

export default function AtRiskRecords({ scan }: { scan: ScanResult }) {
  const rows = scan.high_risk_sample;
  const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-brand-900">High-Risk Records</h3>
          <p className="text-xs text-gray-500 mt-0.5">Showing up to 500 flagged contacts from your scan.</p>
        </div>
        <span className="text-xs bg-red-50 text-red-600 border border-red-200 rounded-full px-3 py-1 font-medium">
          {rows.length.toLocaleString()} shown
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="min-w-full text-xs">
          <thead className="bg-brand-50 sticky top-0">
            <tr>
              {cols.map(c => (
                <th key={c} className="px-3 py-2.5 text-left font-semibold text-brand-700 uppercase tracking-wide whitespace-nowrap">
                  {c.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                {cols.map(c => {
                  const v = String(row[c] ?? "");
                  const isBad = c === "cz_risk" && (v === "invalid" || v === "risky");
                  return (
                    <td key={c} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      {isBad
                        ? <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v === "invalid" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{v}</span>
                        : v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
