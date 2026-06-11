"use client";
import { useState } from "react";
import { ROIInputs } from "@/lib/types";

interface Props {
  values: ROIInputs;
  onChange: (vals: ROIInputs) => void;
}

// Deeper methodology context lives in the tooltip. The plain-English "what is
// this and why does it matter" lives in the always-visible hint under each
// field. A prospect should never need the tooltip to fill the form.
const TOOLTIPS: Record<string, string> = {
  number_of_reps: "Headcount drives the wasted-capacity math: every rep's paid hours are partly spent on contacts that can't reply.",
  loaded_ote: "Loaded cost = base + commission + benefits + overhead. The report multiplies this by headcount, selling time, and your unreachable rate.",
  selling_time_pct: "SBI and RAIN Group field studies put real selling time near 35% of the work week. We default to that on purpose: conservative numbers survive CFO scrutiny.",
  annual_data_cost: "Used for the wasted-spend line (spend x unreachable %). Per-vendor spend gets its own treatment in the Vendor Scorecard after the scan.",
  list_coverage_pct: "Without this, the pipeline math would assume reps touch every record, which inflates the number. 40% is the methodology default.",
  reply_rate: "Cold outbound reply rates typically land between 1% and 3%. Default is a conservative 1.5%.",
  mtg_to_deal_pct: "Of the meetings your team books, the share that becomes closed-won revenue. Default 20%.",
  avg_contract_value: "Average first-year revenue from one closed deal. Without it, the recoverable-pipeline number shows $0 and is flagged.",
};

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold inline-flex items-center justify-center hover:bg-brand-100 hover:text-brand-600 transition-colors"
      >
        ?
      </button>
      {show && (
        <div className="absolute left-5 top-0 z-50 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 leading-relaxed shadow-xl">
          {text}
        </div>
      )}
    </span>
  );
}

function Field({ label, hint, tooltipKey, value, onChange, min, max, step, prefix, suffix, placeholder }: {
  label: string;
  hint: string;
  tooltipKey: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="flex items-center text-[13px] font-semibold text-gray-700 mb-1">
        {label}
        <Tooltip text={TOOLTIPS[tooltipKey]} />
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{prefix}</span>
        )}
        <input
          type="number"
          value={value === 0 && placeholder ? "" : value}
          min={min}
          max={max}
          step={step ?? 1}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className={`w-full border border-gray-200 rounded-lg py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 ${prefix ? "pl-7" : "pl-3"} ${suffix ? "pr-9" : "pr-3"}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{suffix}</span>
        )}
      </div>
      <p className="text-[11px] text-gray-400 mt-1 leading-snug">{hint}</p>
    </div>
  );
}

function GroupHeader({ title, payoff }: { title: string; payoff: string }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</p>
      <p className="text-[11px] text-brand-600 font-medium mt-0.5">{payoff}</p>
    </div>
  );
}

// Convert between decimal (stored) and percent (displayed).
const pctSet = (set: (v: number) => void) => (v: number) => set(v / 100);
const pctVal = (v: number) => Math.round(v * 1000) / 10;

export default function ROIPanel({ values, onChange }: Props) {
  const set = (key: keyof ROIInputs) => (v: number) => onChange({ ...values, [key]: v });

  return (
    <div className="space-y-6">
      <p className="text-[11px] text-gray-400 leading-relaxed">
        Fill in what you know. Anything left blank uses a conservative industry
        default, and the report marks it as an estimate.
      </p>

      <div>
        <GroupHeader
          title="What your team costs"
          payoff="Sets the headline: payroll spent on contacts that can't reply"
        />
        <div className="space-y-4">
          <Field
            label="Reps doing outbound"
            hint="Anyone who prospects: SDRs, AEs, full-cycle reps."
            tooltipKey="number_of_reps"
            value={values.number_of_reps}
            onChange={set("number_of_reps")}
            min={1} max={5000}
          />
          <Field
            label="Cost per rep, per year"
            hint="Salary + commission + benefits. Rule of thumb: base pay x 1.3. Blank = $75K default."
            tooltipKey="loaded_ote"
            value={values.loaded_ote}
            onChange={set("loaded_ote")}
            prefix="$" min={0} max={1_000_000} step={5000}
            placeholder="e.g. 150,000"
          />
          <Field
            label="Time actually spent selling"
            hint="The rest goes to admin, meetings, and CRM cleanup. Industry average: 35%."
            tooltipKey="selling_time_pct"
            value={pctVal(values.selling_time_pct)}
            onChange={pctSet(set("selling_time_pct"))}
            suffix="%" min={0} max={100} step={1}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <GroupHeader
          title="What your data costs"
          payoff="Sets the wasted-spend line and powers the Vendor Scorecard"
        />
        <div className="space-y-4">
          <Field
            label="Data & lead spend, per year"
            hint="Everything you pay for contact data: ZoomInfo, Apollo, purchased lead lists."
            tooltipKey="annual_data_cost"
            value={values.annual_data_cost}
            onChange={set("annual_data_cost")}
            prefix="$" min={0} max={5_000_000} step={500}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <GroupHeader
          title="What a deal is worth"
          payoff="Sets the upside: pipeline those wasted hours could have produced"
        />
        <div className="space-y-4">
          <Field
            label="Share of database worked per year"
            hint="The % of your contacts reps actually touch. Most teams: around 40%."
            tooltipKey="list_coverage_pct"
            value={pctVal(values.list_coverage_pct)}
            onChange={pctSet(set("list_coverage_pct"))}
            suffix="%" min={0} max={100} step={1}
          />
          <Field
            label="Cold outreach reply rate"
            hint="Replies per 100 cold emails. Typical: 1% to 3%."
            tooltipKey="reply_rate"
            value={pctVal(values.reply_rate)}
            onChange={pctSet(set("reply_rate"))}
            suffix="%" min={0} max={100} step={0.1}
          />
          <Field
            label="Meetings that become deals"
            hint="Of the meetings booked, the % that close. Typical: around 20%."
            tooltipKey="mtg_to_deal_pct"
            value={pctVal(values.mtg_to_deal_pct)}
            onChange={pctSet(set("mtg_to_deal_pct"))}
            suffix="%" min={0} max={100} step={1}
          />
          <Field
            label="Revenue per closed deal"
            hint="Average first-year contract value."
            tooltipKey="avg_contract_value"
            value={values.avg_contract_value}
            onChange={set("avg_contract_value")}
            prefix="$" min={0} max={10_000_000} step={1000}
            placeholder="e.g. 25,000"
          />
        </div>
      </div>

    </div>
  );
}
