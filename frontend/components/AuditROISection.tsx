"use client";
import { AuditROIResult, LeverResult } from "@/lib/types";

const fmt = (x: number) => `$${Math.round(x).toLocaleString()}`;
const fmtPct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;

interface Props {
  audit: AuditROIResult;
  unreachableRate: number;
}

export default function AuditROISection({ audit, unreachableRate }: Props) {
  return (
    <div className="space-y-6">
      {/* The Finding — single locked percentage */}
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-brand-300 mb-3">The Finding</p>
        <p className="text-6xl font-extrabold text-white">{fmtPct(unreachableRate)}</p>
        <p className="text-brand-200 mt-3 text-base">
          of contacts in this CRM cannot be reached
        </p>
      </div>

      {/* Lever 1 — the headline */}
      <LeverCard order={1} lever={audit.wasted_rep_capacity} headline />

      {/* Lever 2 — the choice framing (NOT summed with Lever 1) */}
      <Lever2ChoiceCard
        wastedCapacity={audit.wasted_rep_capacity.value}
        recoverablePipeline={audit.recoverable_pipeline}
      />

      {/* Deliverability multiplier */}
      <DeliverabilityCard audit={audit} unreachableRate={unreachableRate} />

      {/* Lever 3 — footnote */}
      <LeverCard order={3} lever={audit.wasted_data_spend} />

      {/* Headline total */}
      <div className="card border-brand-300 border-2 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">
          Total Annual Impact (Lever 1 + Lever 3)
        </p>
        <p className="text-4xl font-extrabold text-brand-900">{fmt(audit.headline_total_annual)}</p>
        <p className="text-xs text-gray-500 italic">
          Lever 2 is shown separately — same rep-hours, alternate framing. Stacking would double-count.
        </p>
      </div>

      {/* Estimates disclosure */}
      {audit.estimated_fields.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-800 mb-2">
            Inputs flagged as estimates
          </p>
          <p className="text-xs text-amber-900 leading-relaxed">
            The following inputs used methodology defaults rather than client-confirmed numbers:{" "}
            <strong>{audit.estimated_fields.join(", ")}</strong>. Refining these in the fact-finder will tighten the
            audit further.
          </p>
        </div>
      )}
    </div>
  );
}

function LeverCard({
  order,
  lever,
  headline = false,
}: {
  order: number;
  lever: LeverResult;
  headline?: boolean;
}) {
  return (
    <div className={`card space-y-3 ${headline ? "border-brand-300 border-2" : ""}`}>
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700">
          Lever {order} · {lever.label}
        </p>
        {lever.is_estimate && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
            Estimate
          </span>
        )}
      </div>
      <p className={`font-extrabold text-brand-900 ${headline ? "text-5xl" : "text-3xl"}`}>
        {fmt(lever.value)} <span className="text-sm font-medium text-gray-400">/yr</span>
      </p>
      <p className="text-xs text-gray-500 font-mono">{lever.formula}</p>
    </div>
  );
}

function Lever2ChoiceCard({
  wastedCapacity,
  recoverablePipeline,
}: {
  wastedCapacity: number;
  recoverablePipeline: LeverResult;
}) {
  return (
    <div className="card border-amber-200 border-2 space-y-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-700">
          Lever 2 · Either / Or
        </p>
        {recoverablePipeline.is_estimate && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
            Estimate
          </span>
        )}
      </div>
      <p className="text-sm text-gray-600">
        Same rep-hours as Lever 1, framed two ways. A CFO who senses these stacked walks the meeting.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div className="bg-gray-50 rounded-xl p-5 text-center">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
            Option A — paying for ghosts
          </p>
          <p className="text-3xl font-extrabold text-gray-800">{fmt(wastedCapacity)}</p>
          <p className="text-xs text-gray-500 mt-1">in wasted selling capacity</p>
        </div>
        <div className="bg-green-50 rounded-xl p-5 text-center border border-green-200">
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-1">
            Option B — redirect the hours
          </p>
          <p className="text-3xl font-extrabold text-green-700">{fmt(recoverablePipeline.value)}</p>
          <p className="text-xs text-green-700 mt-1">in recoverable pipeline</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 font-mono">{recoverablePipeline.formula}</p>
    </div>
  );
}

function DeliverabilityCard({
  audit,
  unreachableRate,
}: {
  audit: AuditROIResult;
  unreachableRate: number;
}) {
  const target = audit.deliverability_target_bounce_rate;
  const blacklist = audit.deliverability_blacklist_threshold;
  const overTarget = unreachableRate > target;

  return (
    <div
      className={`rounded-xl border-2 p-5 ${
        audit.deliverability_at_risk ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-gray-700 mb-2">
        Deliverability Risk
      </p>
      <p className="text-sm text-gray-700 mb-4 leading-relaxed">
        Google + Yahoo enforce a bulk-sender bounce rate <strong>under {fmtPct(target)}</strong> (effective Feb 2024).
        Above {fmtPct(blacklist, 0)} triggers blacklisting that throttles every rep&apos;s outbound — including the
        good contacts.
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <ThresholdTile label="Required floor" value={`< ${fmtPct(target)}`} />
        <ThresholdTile label="Blacklist above" value={fmtPct(blacklist, 0)} />
        <ThresholdTile
          label="Your rate"
          value={fmtPct(unreachableRate)}
          tone={overTarget ? "danger" : "ok"}
          emphasis
        />
      </div>
      {audit.deliverability_at_risk && (
        <p className="text-sm text-red-700 mt-4 font-medium">
          ⚠️ Unreachable rate exceeds the blacklist threshold — the team is already self-throttling.
        </p>
      )}
    </div>
  );
}

function ThresholdTile({
  label,
  value,
  tone = "neutral",
  emphasis = false,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "danger" | "ok";
  emphasis?: boolean;
}) {
  const styles =
    tone === "danger"
      ? "bg-red-100 border-red-300 text-red-800"
      : tone === "ok"
        ? "bg-green-50 border-green-300 text-green-800"
        : "bg-white border-gray-200 text-gray-700";
  return (
    <div className={`border rounded-lg p-3 ${styles} ${emphasis ? "border-2" : ""}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
