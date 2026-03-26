"use client";
import { useState } from "react";
import { ScanResult, ROIResult } from "@/lib/types";
import MetricCard from "@/components/MetricCard";

const fmt = (x: number) => `${(x * 100).toFixed(1)}%`;
const fmtNum = (x: number) => x.toLocaleString();
const fmtDollar = (x: number) => `$${Math.round(x).toLocaleString()}`;

interface Action { level: string; action: string; why: string; impact: number; quickWin?: boolean; }

function ActionItem({ level, action, why, rank, quickWin }: Action & { rank: number }) {
  const styles: Record<string, string> = {
    error:   "bg-red-50 border-red-200",
    warning: "bg-amber-50 border-amber-200",
    info:    "bg-brand-50 border-brand-200",
  };
  const textStyles: Record<string, string> = {
    error:   "text-red-800",
    warning: "text-amber-800",
    info:    "text-brand-800",
  };
  const rankStyles: Record<string, string> = {
    error:   "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    info:    "bg-brand-100 text-brand-700",
  };
  return (
    <div className={`rounded-lg border p-4 ${styles[level] ?? styles.info}`}>
      <div className="flex items-start gap-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${rankStyles[level] ?? rankStyles.info}`}>
          #{rank}
        </span>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 flex-wrap mb-1`}>
            <span className={`text-sm font-semibold ${textStyles[level] ?? textStyles.info}`}>{action}</span>
            {quickWin && (
              <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Quick Win</span>
            )}
          </div>
          <p className={`text-xs leading-relaxed opacity-80 ${textStyles[level] ?? textStyles.info}`}>{why}</p>
        </div>
      </div>
    </div>
  );
}

function getActions(scan: ScanResult, roi: ROIResult): Action[] {
  const actions: Action[] = [];

  // --- Contact suppression ---
  if (scan.contact_high_risk_rate > 0.30) {
    const impactShare = Math.round(roi.total_annual_impact * 0.7);
    actions.push({
      level: "error",
      action: `Suppress ${fmtNum(scan.contact_invalid)} invalid contacts before your next sequence run`,
      why: `${fmt(scan.contact_high_risk_rate)} of your database is flagged. Sending to these contacts drives bounces, harms sender reputation, and costs reps time on dead-end outreach. Estimated ${fmtDollar(impactShare)}/year in avoidable waste — the single highest-impact fix available.`,
      impact: impactShare,
    });
  } else if (scan.contact_high_risk_rate > 0.10) {
    const impactShare = Math.round(roi.total_annual_impact * 0.5);
    actions.push({
      level: "warning",
      action: `Suppress ${fmtNum(scan.contact_invalid)} at-risk contacts to protect deliverability`,
      why: `${fmt(scan.contact_high_risk_rate)} contact risk rate. Even at moderate levels, sustained bouncing triggers inbox provider penalties — your sender score is a shared asset across every rep in your org. Estimated ${fmtDollar(impactShare)}/year in recoverable waste.`,
      impact: impactShare,
    });
  }

  // --- ZoomInfo credit recapture ---
  if (scan.zoominfo_high_risk_rate && scan.zoominfo_high_risk_rate > 0.20 && scan.bad_zoominfo_contacts > 0) {
    const estimatedCredit = scan.bad_zoominfo_contacts * 3;
    actions.push({
      level: "error",
      action: `File a ZoomInfo credit claim for ${fmtNum(scan.bad_zoominfo_contacts)} provably invalid contacts`,
      why: `${fmt(scan.zoominfo_high_risk_rate)} of your ZoomInfo-sourced records are invalid or risky. Enterprise ZoomInfo contracts typically include credit SLAs for bad data — most teams never claim them because they can't document the bad records. Use the ZoomInfo Recovery table below as your proof. Estimated ~${fmtDollar(estimatedCredit)} in credits (at ~$3/contact).`,
      impact: estimatedCredit,
    });
  }

  // --- Deduplication (quick win) ---
  if (scan.email_dupes > 50) {
    actions.push({
      level: "warning",
      action: `Deduplicate ${fmtNum(scan.email_dupes)} contacts before your next sequence enrollment`,
      why: `Duplicates mean the same person receives the same email multiple times — triggering spam complaints, splitting engagement history, and inflating enrollment counts that distort your reporting. This is a one-click fix with ContactZen's export.`,
      impact: scan.email_dupes * 5,
      quickWin: true,
    });
  }

  // --- Phone quality (actual invalid/risky only — missing is a completeness issue) ---
  const actualPhoneBad = scan.phone_invalid + scan.phone_risky;
  if (actualPhoneBad > 0 && scan.phone_high_risk_rate > 0.10) {
    actions.push({
      level: "warning",
      action: `Replace or remove ${fmtNum(actualPhoneBad)} contacts with invalid or shared-line phone numbers`,
      why: `${fmt(scan.phone_high_risk_rate)} of phone records are either malformed or suspected main-line/toll-free numbers. Dialing these wastes rep time and your dialer budget — these contacts are email-only until their phone data is corrected.`,
      impact: actualPhoneBad * 4,
    });
  }

  // --- Completeness / enrichment ---
  if (scan.completeness_score < 70) {
    const gapContacts = Math.round(scan.total * (1 - scan.completeness_score / 100) * 0.4);
    const dataWasteShare = Math.round(roi.estimated_data_waste * 0.4);
    actions.push({
      level: "info",
      action: `Enrich ~${fmtNum(gapContacts)} contacts missing key fields before your next sequence launch`,
      why: `Completeness score: ${scan.completeness_score}/100. Contacts missing name, title, or company can't be personalized — and generic outreach converts at a fraction of the rate. Tools like Clay, Clearbit, or Apollo can fill gaps in bulk. Recovering this data from vendors you already pay is worth ~${fmtDollar(dataWasteShare)}.`,
      impact: dataWasteShare,
    });
  }

  // --- Leadership SLA (only when impact is meaningful) ---
  if (roi.total_annual_impact > 25000) {
    actions.push({
      level: "info",
      action: `Share this report with your VP of Sales or RevOps lead to lock in a monthly hygiene SLA`,
      why: `${fmtDollar(roi.total_annual_impact)} in estimated annual impact is a board-level number. Most teams don't act on data quality until they can quantify the cost — this report does that. Schedule a 15-minute review and use it to establish a recurring monthly scan cadence.`,
      impact: roi.total_annual_impact * 0.05,
    });
  }

  return actions.sort((a, b) => b.impact - a.impact);
}

export default function ExecutiveSummary({ scan, roi, numberOfReps }: { scan: ScanResult; roi: ROIResult; numberOfReps: number }) {
  const [avgPipeline, setAvgPipeline] = useState(250000);
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - scan.contact_high_risk_rate * 100)));
  const healthLabel = healthScore >= 90 ? "Healthy" : healthScore >= 75 ? "Moderate Risk" : healthScore >= 50 ? "High Risk" : "Critical";
  const pipelineAtRisk = Math.round(numberOfReps * avgPipeline * scan.high_risk_rate);
  const actions = getActions(scan, roi);

  return (
    <div className="space-y-6">
      {/* Alert banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-amber-900 font-medium">
        ⚠️ <strong>{fmtNum(scan.contact_invalid + scan.contact_risky)} at-risk contacts detected</strong>
        {" "}({fmt(scan.contact_high_risk_rate)} of the database)
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Database Health" value={`${healthScore}/100`} sub={healthLabel} />
        <MetricCard label="Contact Risk Rate" value={fmt(scan.contact_high_risk_rate)} danger={scan.contact_high_risk_rate > 0.2} />
        <MetricCard label="Est. Annual Impact" value={fmtDollar(roi.total_annual_impact)} />
        <MetricCard label="Wasted Emails (Est.)" value={fmtNum(roi.wasted_emails)} />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Email Risk Rate" value={fmt(scan.high_risk_rate)} />
        <MetricCard label="Phone Risk Rate" value={fmt(scan.phone_high_risk_rate)} />
        <MetricCard label="Data Completeness" value={`${scan.completeness_score}/100`} />
        <MetricCard label="Duplicate Records" value={fmtNum(scan.email_dupes)} />
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-green-800 text-sm font-medium">
        ✅ <strong>{fmtNum(scan.contact_valid)}</strong> contacts are valid and usable.
      </div>

      {/* Recommended actions */}
      {actions.length > 0 && (
        <div className="card space-y-3">
          <div>
            <h3 className="font-semibold text-brand-900">Priority Actions</h3>
            <p className="text-xs text-gray-500 mt-0.5">Ranked by estimated business impact — highest first.</p>
          </div>
          {actions.map((a, i) => <ActionItem key={i} {...a} rank={i + 1} />)}
        </div>
      )}

      {/* ZoomInfo recovery */}
      {scan.zoominfo_flagged_sample.length > 0 && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-brand-900">ZoomInfo Recovery Opportunity</h3>
          <p className="text-sm text-gray-600">
            These ZoomInfo-sourced contacts were flagged as invalid or risky and may qualify for vendor credit recapture.
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full text-xs">
              <thead className="bg-brand-50">
                <tr>{Object.keys(scan.zoominfo_flagged_sample[0] ?? {}).map(k => (
                  <th key={k} className="px-3 py-2 text-left font-semibold text-brand-700 uppercase tracking-wide">{k}</th>
                ))}</tr>
              </thead>
              <tbody>
                {scan.zoominfo_flagged_sample.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-2 text-gray-700">{String(v ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pipeline exposure */}
      <div className="card space-y-4">
        <h3 className="font-semibold text-brand-900">Org-Wide Revenue Exposure</h3>
        <p className="text-xs text-gray-500">Adjust the inputs to estimate how contact decay affects pipeline across your sales org.</p>
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 whitespace-nowrap">Avg Pipeline / Rep ($)</label>
          <input
            type="number"
            value={avgPipeline}
            onChange={(e) => setAvgPipeline(Number(e.target.value))}
            step={25000}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Sales Reps" value={fmtNum(numberOfReps)} />
          <MetricCard label="Avg Pipeline / Rep" value={fmtDollar(avgPipeline)} />
          <MetricCard label="Pipeline at Risk" value={fmtDollar(pipelineAtRisk)} danger />
        </div>
      </div>
    </div>
  );
}
