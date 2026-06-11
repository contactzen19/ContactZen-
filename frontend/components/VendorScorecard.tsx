"use client";
import { useState } from "react";
import { SourceRow, VendorRollupRow, VendorScorecardResponse } from "@/lib/types";
import { fetchVendorScorecard } from "@/lib/api";

// Display labels for canonical vendor keys from the backend rollup.
const VENDOR_LABELS: Record<string, string> = {
  zoominfo: "ZoomInfo",
  apollo: "Apollo",
  clay: "Clay",
  linkedin: "LinkedIn Sales Nav",
  lusha: "Lusha",
  cognism: "Cognism",
  leadiq: "LeadIQ",
  seamless: "Seamless.AI",
  clearbit: "Clearbit",
  rocketreach: "RocketReach",
  hunter: "Hunter",
  uplead: "UpLead",
  "6sense": "6sense",
};

// Known vendors get their brand label; unknown sources (niche lead vendors,
// custom CRM values) display their raw name from the backend rollup.
const label = (vendor: string, display?: string) =>
  VENDOR_LABELS[vendor] ?? display ?? vendor.charAt(0).toUpperCase() + vendor.slice(1);

const fmtNum = (x: number) => x.toLocaleString();
const fmtPct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
const fmtDollar = (x: number) => `$${Math.round(x).toLocaleString()}`;
const fmtUnit = (x: number) => `$${x.toFixed(2)}`;

interface Props {
  rollup: VendorRollupRow[];
  sourceBreakdown: SourceRow[];
}

export default function VendorScorecard({ rollup, sourceBreakdown }: Props) {
  const paidVendors = rollup.filter(v => v.is_paid_vendor);
  const [spendInputs, setSpendInputs] = useState<Record<string, string>>({});
  const [card, setCard] = useState<VendorScorecardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (paidVendors.length === 0) return null;

  const hasSpend = Object.values(spendInputs).some(v => parseFloat(v) > 0);

  const runNumbers = async () => {
    const spend: Record<string, number> = {};
    for (const [vendor, raw] of Object.entries(spendInputs)) {
      const n = parseFloat(raw.replace(/[$,]/g, ""));
      if (!isNaN(n) && n > 0) spend[vendor] = n;
    }
    if (Object.keys(spend).length === 0) return;
    setLoading(true);
    setError(null);
    try {
      setCard(await fetchVendorScorecard(sourceBreakdown, spend));
    } catch {
      setError("Could not compute the scorecard. Check the connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const rows = card ? card.vendors.filter(v => v.is_paid_vendor) : paidVendors;
  const priced = rows.some(v => v.cost_per_reachable != null);

  return (
    <div className="space-y-5">
      {/* Spend inputs, one per detected paid vendor */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
        <p className="text-sm font-semibold text-brand-900 mb-1">
          What do you pay each vendor per year?
        </p>
        <p className="text-xs text-gray-500 mb-4">
          Contract total, regardless of pricing model. Seats, credits, or usage all work.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          {paidVendors.map(v => (
            <label key={v.vendor} className="block">
              <span className="block text-xs font-semibold text-gray-600 mb-1">
                {label(v.vendor, v.display)}
                <span className="font-normal text-gray-400"> · {fmtNum(v.total)} contacts</span>
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="$ / year"
                value={spendInputs[v.vendor] ?? ""}
                onChange={e =>
                  setSpendInputs(s => ({ ...s, [v.vendor]: e.target.value }))
                }
                className="w-36 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </label>
          ))}
          <button
            onClick={runNumbers}
            disabled={!hasSpend || loading}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {loading ? "Computing…" : "Run the numbers"}
          </button>
        </div>
        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
      </div>

      {/* Headline: the renewal number */}
      {card?.headline && (
        <div
          className="rounded-2xl p-6 text-white"
          style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-brand-300 mb-2">
            Cost per reachable contact
          </p>
          <p className="text-3xl font-extrabold mb-1">
            {label(card.headline.vendor, card.headline.display)}: {fmtUnit(card.headline.cost_per_contact)} per contact,{" "}
            {fmtUnit(card.headline.cost_per_reachable)} per reachable contact
          </p>
          {card.headline.overpay_dollars != null && card.headline.overpay_dollars > 0 && (
            <p className="text-brand-200 text-sm">
              {fmtDollar(card.headline.overpay_dollars)} of this contract pays for contacts
              you cannot reach. That is the renewal conversation.
            </p>
          )}
        </div>
      )}

      {/* Scorecard table */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="min-w-full text-sm">
          <thead className="bg-brand-50">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-brand-700">Vendor</th>
              <th className="px-4 py-2 text-right font-semibold text-brand-700">Contacts</th>
              <th className="px-4 py-2 text-right font-semibold text-brand-700">Reachable</th>
              <th className="px-4 py-2 text-right font-semibold text-brand-700">Reachable %</th>
              {priced && (
                <>
                  <th className="px-4 py-2 text-right font-semibold text-brand-700">$ / contact</th>
                  <th className="px-4 py-2 text-right font-semibold text-brand-700">$ / reachable</th>
                  <th className="px-4 py-2 text-right font-semibold text-brand-700">Right-sized renewal</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map(v => (
              <tr key={v.vendor} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-800">{label(v.vendor, v.display)}</td>
                <td className="px-4 py-2 text-right text-gray-600">{fmtNum(v.total)}</td>
                <td className="px-4 py-2 text-right text-gray-600">{fmtNum(v.count_reachable)}</td>
                <td
                  className={`px-4 py-2 text-right font-semibold ${
                    v.reachable_rate < 0.8 ? "text-red-700" : "text-gray-700"
                  }`}
                >
                  {fmtPct(v.reachable_rate)}
                </td>
                {priced && (
                  <>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {v.cost_per_contact != null ? fmtUnit(v.cost_per_contact) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-brand-900">
                      {v.cost_per_reachable != null ? fmtUnit(v.cost_per_reachable) : "—"}
                      {v.reachability_premium_pct != null && (
                        <span className="ml-1 text-xs font-semibold text-red-600">
                          +{fmtPct(v.reachability_premium_pct, 0)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {v.right_sized_spend != null ? fmtDollar(v.right_sized_spend) : "—"}
                      {v.overpay_dollars != null && v.overpay_dollars > 0 && v.annual_spend != null && (
                        <span className="block text-xs text-gray-400">
                          vs {fmtDollar(v.annual_spend)} today
                        </span>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Locked definition travels with the metric */}
      {card?.reachable_definition && (
        <p className="text-xs text-gray-400 italic">{card.reachable_definition}</p>
      )}

      {/* Recapture, demoted to one line */}
      {priced && (
        <p className="text-xs text-gray-500">
          Where your vendor contract includes data quality terms, this table doubles as the
          evidence file for that conversation.
        </p>
      )}
    </div>
  );
}
