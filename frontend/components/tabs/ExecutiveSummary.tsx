"use client";
import { useState } from "react";
import { ScanResult, ROIResult } from "@/lib/types";
import MetricCard from "@/components/MetricCard";

const fmt = (x: number) => `${(x * 100).toFixed(1)}%`;
const fmtNum = (x: number) => x.toLocaleString();
const fmtDollar = (x: number) => `$${Math.round(x).toLocaleString()}`;

function ActionItem({ level, action, why }: { level: string; action: string; why: string }) {
  const styles: Record<string, string> = {
    error:   "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info:    "bg-brand-50 border-brand-200 text-brand-800",
  };
  const icons: Record<string, string> = { error: "🔴", warning: "🟡", info: "💡" };
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[level] ?? styles.info}`}>
      <span className="mr-2">{icons[level] ?? "💡"}</span>
      <strong>{action}</strong>
      <span className="opacity-75"> — {why}</span>
    </div>
  );
}

function getActions(scan: ScanResult, roi: ROIResult): { level: string; action: string; why: string }[] {
  const actions = [];
  if (scan.contact_high_risk_rate > 0.30) {
    actions.push({ level: "error", action: `Suppress ${fmtNum(scan.contact_invalid)} at-risk contacts before the next sequence run`, why: `${fmt(scan.contact_high_risk_rate)} of your database is invalid or risky — actively degrading deliverability and burning rep time.` });
  } else if (scan.contact_high_risk_rate > 0.10) {
    actions.push({ level: "warning", action: `Review and suppress ${fmtNum(scan.contact_invalid)} at-risk contacts`, why: `${fmt(scan.contact_high_risk_rate)} contact risk rate detected. Suppression improves sequence efficiency and sender reputation.` });
  }
  if (scan.zoominfo_high_risk_rate && scan.zoominfo_high_risk_rate > 0.20) {
    actions.push({ level: "error", action: `Request ZoomInfo credit recapture for ${fmtNum(scan.bad_zoominfo_contacts)} flagged contacts`, why: `${fmt(scan.zoominfo_high_risk_rate)} of ZoomInfo-sourced contacts are invalid or risky. Most vendors offer credits for provably bad records.` });
  }
  if (scan.phone_high_risk_rate > 0.25) {
    actions.push({ level: "warning", action: `Enrich or remove ${fmtNum(scan.phone_invalid + scan.phone_risky)} contacts with unusable phone data`, why: `${fmt(scan.phone_high_risk_rate)} of phone records are missing, invalid, or suspected shared lines.` });
  }
  if (scan.email_dupes > 50) {
    actions.push({ level: "warning", action: `Deduplicate ${fmtNum(scan.email_dupes)} records sharing a duplicate email`, why: "Duplicates inflate enrollment counts, split engagement history, and waste sequence budget." });
  }
  if (scan.completeness_score < 70) {
    actions.push({ level: "warning", action: "Enrich contact records to improve field completeness", why: `Overall completeness is ${scan.completeness_score}/100. Gaps in name, company, and title reduce personalization effectiveness.` });
  }
  if (roi.total_annual_impact > 25000) {
    actions.push({ level: "info", action: "Share this report with sales leadership to establish a data hygiene SLA", why: `Estimated ${fmtDollar(roi.total_annual_impact)} annual impact from data decay.` });
  }
  return actions;
}

export default function ExecutiveSummary({ scan, roi }: { scan: ScanResult; roi: ROIResult }) {
  const [avgPipeline, setAvgPipeline] = useState(250000);
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - scan.contact_high_risk_rate * 100)));
  const healthLabel = healthScore >= 90 ? "Healthy" : healthScore >= 75 ? "Moderate Risk" : healthScore >= 50 ? "High Risk" : "Critical";
  const pipelineAtRisk = Math.round(roi.annual_cleanup_hours > 0 ? scan.high_risk_rate * avgPipeline * (roi.annual_cleanup_hours / roi.rep_productivity_loss * roi.rep_productivity_loss / roi.annual_cleanup_hours) : scan.high_risk_rate * avgPipeline);
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
          <h3 className="font-semibold text-brand-900">Recommended Actions</h3>
          <p className="text-xs text-gray-500">Priority actions based on your scan results.</p>
          {actions.map((a, i) => <ActionItem key={i} {...a} />)}
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
          <MetricCard label="Sales Reps" value={fmtNum(roi.annual_cleanup_hours > 0 ? Math.round(roi.annual_cleanup_hours / 24) : 25)} />
          <MetricCard label="Avg Pipeline / Rep" value={fmtDollar(avgPipeline)} />
          <MetricCard label="Pipeline at Risk" value={fmtDollar(Math.round(avgPipeline * scan.high_risk_rate * 25))} danger />
        </div>
      </div>
    </div>
  );
}
