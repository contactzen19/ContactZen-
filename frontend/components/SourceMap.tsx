"use client";
import { SourceRow } from "@/lib/types";

// Known data-vendor source names. Membership = paid vendor: the row gets a
// badge here and the vendor appears in the Vendor Scorecard with spend input.
// Match is substring-on-lowercased-source, so "ZoomInfo - Enterprise" still hits.
const KNOWN_VENDORS: { match: string; label: string }[] = [
  { match: "zoominfo", label: "ZoomInfo" },
  { match: "apollo", label: "Apollo" },
  { match: "clay", label: "Clay" },
  { match: "lusha", label: "Lusha" },
  { match: "cognism", label: "Cognism" },
  { match: "seamless", label: "Seamless.AI" },
  { match: "uplead", label: "UpLead" },
  { match: "rocketreach", label: "RocketReach" },
  { match: "6sense", label: "6sense" },
];

function classifyVendor(source: string): { isVendor: boolean; label: string } {
  const s = source.toLowerCase();
  const hit = KNOWN_VENDORS.find(v => s.includes(v.match));
  if (hit) return { isVendor: true, label: hit.label };
  return { isVendor: false, label: source };
}

const fmtNum = (x: number) => x.toLocaleString();
const fmtPct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
const fmtDollar = (x: number) => `$${Math.round(x).toLocaleString()}`;

interface Props {
  rows: SourceRow[];
  annualDataSpend?: number;
}

export default function SourceMap({ rows, annualDataSpend }: Props) {
  if (!rows || rows.length === 0) return null;

  // Backwards compatibility: older payloads may not have `unreachable_rate` —
  // derive from invalid + risky so the ranking still works.
  const normalized = rows.map(r => ({
    ...r,
    unreachable_rate: r.unreachable_rate ?? ((r.invalid ?? 0) + (r.risky ?? 0)),
    count_bad: r.count_bad ?? ((r.count_invalid ?? 0) + (r.count_risky ?? 0)),
    total: r.total ?? 0,
  }));

  const totalBadAcrossVendors = normalized
    .filter(r => classifyVendor(r.source).isVendor)
    .reduce((sum, r) => sum + (r.count_bad ?? 0), 0);

  const totalBad = normalized.reduce((sum, r) => sum + (r.count_bad ?? 0), 0);

  // Dollar attribution per paid vendor row: their share of total bad data ×
  // annual spend. Coarse but it's the methodology's negotiation lever.
  const attribute = (row: typeof normalized[number]): number | null => {
    const { isVendor } = classifyVendor(row.source);
    if (!isVendor || !annualDataSpend || annualDataSpend <= 0 || totalBad === 0) return null;
    const share = (row.count_bad ?? 0) / totalBad;
    return annualDataSpend * share;
  };

  const worst = normalized[0];
  const worstVendor = classifyVendor(worst.source);

  return (
    <div className="space-y-5">
      {/* Headline */}
      <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-300 mb-2">Worst-performing source</p>
        <p className="text-3xl font-extrabold mb-1">{worstVendor.label}</p>
        <p className="text-brand-200 text-sm">
          {fmtPct(worst.unreachable_rate ?? 0)} unreachable
          {worst.total ? ` · ${fmtNum(worst.count_bad ?? 0)} bad contacts of ${fmtNum(worst.total)}` : ""}
        </p>
      </div>

      {/* Ranked table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-brand-700">Rank</th>
              <th className="px-4 py-2 text-left font-semibold text-brand-700">Source</th>
              <th className="px-4 py-2 text-right font-semibold text-brand-700">Contacts</th>
              <th className="px-4 py-2 text-right font-semibold text-brand-700">Bad</th>
              <th className="px-4 py-2 text-right font-semibold text-brand-700">Unreachable %</th>
              {annualDataSpend && annualDataSpend > 0 && (
                <th className="px-4 py-2 text-right font-semibold text-brand-700">Attributed Spend</th>
              )}
            </tr>
          </thead>
          <tbody>
            {normalized.map((row, i) => {
              const { isVendor, label } = classifyVendor(row.source);
              const attributed = attribute(row);
              const isWorst = i === 0;
              return (
                <tr
                  key={row.source}
                  className={`border-t border-gray-100 ${isWorst ? "bg-red-50" : "hover:bg-gray-50"}`}
                >
                  <td className="px-4 py-2 text-gray-500 font-mono">#{i + 1}</td>
                  <td className="px-4 py-2 text-gray-800 font-medium">
                    <span className="capitalize">{label}</span>
                    {isVendor && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                        Paid vendor
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {row.total ? fmtNum(row.total) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    {row.count_bad != null ? fmtNum(row.count_bad) : "—"}
                  </td>
                  <td className={`px-4 py-2 text-right font-semibold ${(row.unreachable_rate ?? 0) > 0.05 ? "text-red-700" : "text-gray-700"}`}>
                    {fmtPct(row.unreachable_rate ?? 0)}
                  </td>
                  {annualDataSpend && annualDataSpend > 0 && (
                    <td className="px-4 py-2 text-right text-gray-700">
                      {attributed != null ? fmtDollar(attributed) : "—"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recapture, demoted to one line. The renewal conversation lives in the
          Vendor Scorecard (cost per reachable contact), not here. */}
      {totalBadAcrossVendors > 0 && (
        <p className="text-xs text-gray-500">
          {fmtNum(totalBadAcrossVendors)} bad contacts trace back to paid data vendors.
          Where your contract includes data quality terms, this table is the evidence file.
        </p>
      )}

      {/* Attribution disclaimer */}
      {annualDataSpend && annualDataSpend > 0 && (
        <p className="text-xs text-gray-400 italic">
          Attributed spend = annual data spend × (this source&apos;s bad contacts ÷ total bad contacts).
          Coarse allocation. For per-vendor cost, see the Vendor Scorecard below.
        </p>
      )}
    </div>
  );
}
