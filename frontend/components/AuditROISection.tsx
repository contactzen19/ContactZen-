"use client";
import { AuditROIResult, LeverResult, UnreachableBreakdown } from "@/lib/types";

const fmt = (x: number) => `$${Math.round(x).toLocaleString()}`;
const fmtPct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
const fmtNum = (x: number) => x.toLocaleString();

const BUCKET_LABELS: Record<keyof UnreachableBreakdown, string> = {
  hard_bounce: "Hard bounces",
  catch_all_or_disposable: "Catch-all / disposable",
  role_change: "Role changes",
  abandoned_inbox: "Abandoned inboxes",
};

const VALIDATION_BUCKETS: (keyof UnreachableBreakdown)[] = [
  "hard_bounce",
  "catch_all_or_disposable",
];

const ENGAGEMENT_BUCKETS: (keyof UnreachableBreakdown)[] = [
  "role_change",
  "abandoned_inbox",
];

interface Props {
  audit: AuditROIResult;
  unreachableRate: number;
  unreachableBreakdown?: UnreachableBreakdown;
}

export default function AuditROISection({ audit, unreachableRate, unreachableBreakdown }: Props) {
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
        <a
          href="#fix-export"
          className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 rounded-full bg-white text-brand-900 text-sm font-bold hover:bg-brand-50 transition-colors shadow-lg"
        >
          Get the clean list <span aria-hidden>→</span>
        </a>
      </div>

      {/* Methodology bucket breakdown — what's detected vs. what needs CRM */}
      {unreachableBreakdown && <MethodologyBreakdownCard breakdown={unreachableBreakdown} />}

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
          Lever 2 is shown separately. Same rep-hours, alternate framing. Stacking would double-count.
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
            Option A · paying for ghosts
          </p>
          <p className="text-3xl font-extrabold text-gray-800">{fmt(wastedCapacity)}</p>
          <p className="text-xs text-gray-500 mt-1">in wasted selling capacity</p>
        </div>
        <div className="bg-green-50 rounded-xl p-5 text-center border border-green-200">
          <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-1">
            Option B · redirect the hours
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
        Above {fmtPct(blacklist, 0)} triggers blacklisting that throttles every rep&apos;s outbound. Including the
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
          ⚠️ Unreachable rate exceeds the blacklist threshold. The team is already self-throttling.
        </p>
      )}
    </div>
  );
}

function MethodologyBreakdownCard({ breakdown }: { breakdown: UnreachableBreakdown }) {
  const subtotal = (keys: (keyof UnreachableBreakdown)[]) =>
    keys.reduce((sum, k) => sum + (breakdown[k].detected ? breakdown[k].rate : 0), 0);
  const validationRate = subtotal(VALIDATION_BUCKETS);
  const engagementRate = subtotal(ENGAGEMENT_BUCKETS);

  return (
    <div className="card space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-brand-700 mb-1">
          Where the unreachable comes from
        </p>
        <p className="text-xs text-gray-500 leading-relaxed">
          Two distinct failure modes. <strong>Validation decay</strong> = the mailbox is dead. <strong>Engagement decay</strong> = the mailbox is alive but the person stopped showing up. Even valid mailboxes go dark. Engagement decay catches what validation alone misses.
        </p>
      </div>

      <DecaySection
        title="Validation decay"
        subtitle="Detectable from a CSV alone. Addresses that won't deliver."
        rate={validationRate}
        keys={VALIDATION_BUCKETS}
        breakdown={breakdown}
      />

      <DecaySection
        title="Engagement decay"
        subtitle="Requires CRM activity history. Addresses that deliver but no longer reach anyone."
        rate={engagementRate}
        keys={ENGAGEMENT_BUCKETS}
        breakdown={breakdown}
      />
    </div>
  );
}

function DecaySection({
  title,
  subtitle,
  rate,
  keys,
  breakdown,
}: {
  title: string;
  subtitle: string;
  rate: number;
  keys: (keyof UnreachableBreakdown)[];
  breakdown: UnreachableBreakdown;
}) {
  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-sm font-bold text-brand-900">{title}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <p className="text-lg font-extrabold text-brand-900 whitespace-nowrap">
          {fmtPct(rate)} <span className="text-xs font-medium text-gray-400">subtotal</span>
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {keys.map((key) => {
          const bucket = breakdown[key];
          const label = BUCKET_LABELS[key];
          const isClean = bucket.detected && bucket.count === 0;
          const tileClass = !bucket.detected
            ? "border-dashed border-gray-300 bg-gray-50"
            : isClean
              ? "border-green-200 bg-green-50"
              : "border-brand-200 bg-brand-50";
          return (
            <div
              key={key}
              className={`rounded-xl border p-4 space-y-1 ${tileClass}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-900">{label}</p>
                {!bucket.detected ? (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                    Needs CRM
                  </span>
                ) : isClean ? (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Clean
                  </span>
                ) : (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                    Detected
                  </span>
                )}
              </div>
              {bucket.detected ? (
                <p className={`text-2xl font-extrabold ${isClean ? "text-green-700" : "text-brand-900"}`}>
                  {fmtNum(bucket.count)}
                  <span className="text-sm font-medium text-gray-400 ml-1">
                    · {fmtPct(bucket.rate)}
                  </span>
                </p>
              ) : (
                <p className="text-2xl font-extrabold text-gray-400">—</p>
              )}
              <p className="text-xs text-gray-500 leading-relaxed">{bucket.note}</p>
            </div>
          );
        })}
      </div>
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
