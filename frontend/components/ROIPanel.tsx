"use client";
import { useState } from "react";
import { ROIInputs } from "@/lib/types";

interface Props {
  values: ROIInputs;
  onChange: (vals: ROIInputs) => void;
}

const TOOLTIPS: Record<string, string> = {
  // Sales org
  number_of_reps: "Total number of quota-carrying sales reps in your org.",
  loaded_ote: "Annual loaded OTE per rep — fully burdened base + variable + benefits + overhead. Leave 0 to fall back to the hourly-cost estimate (the report will flag it).",
  selling_time_pct: "Share of working hours your reps actually spend selling vs. admin, hunting, data hygiene, internal meetings. Industry actual is ~35% (SBI / RAIN). Leave 0 for that default.",
  annual_data_cost: "What you spend annually on data providers like ZoomInfo, Apollo, or Lusha.",
  // Pipeline funnel (audit fact-finder)
  list_coverage_pct: "% of the contact list reps actually work in a given year. Leave 0 to use the 40% methodology default.",
  reply_rate: "Reply rate to outbound cadences. Leave 0 to use the 1.5% methodology default.",
  mtg_to_deal_pct: "Meeting-to-closed-won conversion. Leave 0 to use the 20% methodology default.",
  avg_contract_value: "Average closed-won contract value. Leave 0 if unknown — the recoverable-pipeline lever will show $0 and be flagged as an estimate.",
  // Legacy (kept for the existing summary widgets)
  rep_hourly_cost: "Fallback if Loaded OTE is blank: hourly cost × 2,080 hrs is used to estimate annual loaded OTE.",
  cleanup_hours_per_rep_per_month: "How many hours each rep spends per month manually cleaning or verifying contact data.",
  emails_per_rep_per_week: "Average outbound emails sent per rep per week.",
  new_contacts_per_rep_per_week: "How many new contacts each rep adds to the CRM per week from all sources.",
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
        <div className="absolute left-5 top-0 z-50 w-52 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 leading-relaxed shadow-xl">
          {text}
        </div>
      )}
    </span>
  );
}

function Field({ label, tooltipKey, value, onChange, min, max, step, prefix, suffix, placeholder }: {
  label: string;
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
      <label className="flex items-center text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
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
    </div>
  );
}

// Convert between decimal (stored) and percent (displayed).
const pctSet = (set: (v: number) => void) => (v: number) => set(v / 100);
const pctVal = (v: number) => Math.round(v * 1000) / 10;

export default function ROIPanel({ values, onChange }: Props) {
  const set = (key: keyof ROIInputs) => (v: number) => onChange({ ...values, [key]: v });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Sales Org</p>
        <div className="space-y-3">
          <Field
            label="Number of Reps"
            tooltipKey="number_of_reps"
            value={values.number_of_reps}
            onChange={set("number_of_reps")}
            min={1} max={5000}
          />
          <Field
            label="Loaded OTE / Rep (Annual)"
            tooltipKey="loaded_ote"
            value={values.loaded_ote}
            onChange={set("loaded_ote")}
            prefix="$" min={0} max={1_000_000} step={5000}
            placeholder="e.g. 150,000"
          />
          <Field
            label="Annual Data Provider Cost"
            tooltipKey="annual_data_cost"
            value={values.annual_data_cost}
            onChange={set("annual_data_cost")}
            prefix="$" min={0} max={5_000_000} step={500}
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">
          Audit Fact-Finder
        </p>
        <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
          Confirmed values tighten the report. Blank fields fall back to methodology defaults and get
          flagged on-page.
        </p>
        <div className="space-y-3">
          <Field
            label="Selling Time"
            tooltipKey="selling_time_pct"
            value={pctVal(values.selling_time_pct)}
            onChange={pctSet(set("selling_time_pct"))}
            suffix="%" min={0} max={100} step={1}
          />
          <Field
            label="List Coverage / Year"
            tooltipKey="list_coverage_pct"
            value={pctVal(values.list_coverage_pct)}
            onChange={pctSet(set("list_coverage_pct"))}
            suffix="%" min={0} max={100} step={1}
          />
          <Field
            label="Reply Rate"
            tooltipKey="reply_rate"
            value={pctVal(values.reply_rate)}
            onChange={pctSet(set("reply_rate"))}
            suffix="%" min={0} max={100} step={0.1}
          />
          <Field
            label="Meeting → Closed Won"
            tooltipKey="mtg_to_deal_pct"
            value={pctVal(values.mtg_to_deal_pct)}
            onChange={pctSet(set("mtg_to_deal_pct"))}
            suffix="%" min={0} max={100} step={1}
          />
          <Field
            label="Avg Contract Value"
            tooltipKey="avg_contract_value"
            value={values.avg_contract_value}
            onChange={set("avg_contract_value")}
            prefix="$" min={0} max={10_000_000} step={1000}
            placeholder="e.g. 25,000"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
          Legacy Activity Inputs
        </p>
        <div className="space-y-3">
          <Field
            label="Rep Cost / Hour (Fallback)"
            tooltipKey="rep_hourly_cost"
            value={values.rep_hourly_cost}
            onChange={set("rep_hourly_cost")}
            prefix="$" min={10} max={250} step={5}
          />
          <Field
            label="Cleanup Hours / Rep / Month"
            tooltipKey="cleanup_hours_per_rep_per_month"
            value={values.cleanup_hours_per_rep_per_month}
            onChange={set("cleanup_hours_per_rep_per_month")}
            min={0} max={40} step={0.5}
          />
          <Field
            label="Emails / Rep / Week"
            tooltipKey="emails_per_rep_per_week"
            value={values.emails_per_rep_per_week}
            onChange={set("emails_per_rep_per_week")}
            min={0} max={5000} step={25}
          />
          <Field
            label="New Contacts / Rep / Week"
            tooltipKey="new_contacts_per_rep_per_week"
            value={values.new_contacts_per_rep_per_week}
            onChange={set("new_contacts_per_rep_per_week")}
            min={0} max={2000} step={5}
          />
        </div>
      </div>
    </div>
  );
}
