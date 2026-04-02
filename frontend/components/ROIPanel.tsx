"use client";
import { useState } from "react";
import { ROIInputs, ROIResult } from "@/lib/types";

interface Props {
  values: ROIInputs;
  onChange: (vals: ROIInputs) => void;
  roi?: ROIResult;
}

const fmtDollar = (x: number) => `$${Math.round(x).toLocaleString()}`;

const TOOLTIPS: Record<string, string> = {
  rep_hourly_cost: "Average fully-loaded cost per rep per hour including salary, benefits, and overhead.",
  cleanup_hours_per_rep_per_month: "How many hours each rep spends per month manually cleaning or verifying contact data.",
  confidence_factor: "How much of the calculated impact you want to count. Conservative (50%) is a safe number for executive presentations.",
  number_of_reps: "Total number of quota-carrying sales reps in your org.",
  emails_per_rep_per_week: "Average outbound emails sent per rep per week across all sequences and campaigns.",
  new_contacts_per_rep_per_week: "How many new contacts each rep adds to the CRM per week from all sources.",
  annual_data_cost: "What you spend annually on data providers like ZoomInfo, Apollo, or Lusha.",
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

function Field({ label, tooltipKey, value, onChange, min, max, step, prefix }: {
  label: string;
  tooltipKey: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
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
          value={value}
          min={min}
          max={max}
          step={step ?? 1}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`w-full border border-gray-200 rounded-lg py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 ${prefix ? "pl-7 pr-3" : "px-3"}`}
        />
      </div>
    </div>
  );
}

export default function ROIPanel({ values, onChange, roi }: Props) {
  const set = (key: keyof ROIInputs) => (v: number) => onChange({ ...values, [key]: v });

  return (
    <div className="space-y-5">
      {roi && (
        <div className="rounded-xl p-4 text-white space-y-3" style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-300">GTM Waste Detected</p>
          <p className="text-3xl font-extrabold">{fmtDollar(roi.total_annual_impact)}</p>
          <p className="text-brand-200 text-xs">estimated annual impact</p>
          <div className="border-t border-white/20 pt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-brand-200">Rep time waste</span>
              <span className="font-semibold">{fmtDollar(roi.rep_productivity_loss)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-brand-200">Data vendor waste</span>
              <span className="font-semibold">{fmtDollar(roi.estimated_data_waste)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-brand-200">Wasted emails / yr</span>
              <span className="font-semibold">{roi.wasted_emails.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">ROI Assumptions</p>
        <div className="space-y-3">
          <Field label="Rep Cost / Hour" tooltipKey="rep_hourly_cost" value={values.rep_hourly_cost} onChange={set("rep_hourly_cost")} prefix="$" min={10} max={250} step={5} />
          <Field label="Cleanup Hours / Rep / Month" tooltipKey="cleanup_hours_per_rep_per_month" value={values.cleanup_hours_per_rep_per_month} onChange={set("cleanup_hours_per_rep_per_month")} min={0} max={40} step={0.5} />
          <div>
            <label className="flex items-center text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              Confidence Factor
              <Tooltip text={TOOLTIPS.confidence_factor} />
            </label>
            <input
              type="range"
              min={0} max={1} step={0.05}
              value={values.confidence_factor}
              onChange={(e) => set("confidence_factor")(Number(e.target.value))}
              className="w-full accent-brand-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>Conservative</span>
              <span className="text-brand-600 font-medium">{Math.round(values.confidence_factor * 100)}%</span>
              <span>Aggressive</span>
            </div>
            <p className="text-xs text-gray-400 mt-1 leading-snug">
              {values.confidence_factor <= 0.4
                ? "Safe for board-level presentations"
                : values.confidence_factor <= 0.6
                ? "Balanced — good for internal planning"
                : "Full impact — use when you have supporting data"}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Sales Org</p>
        <div className="space-y-3">
          <Field label="Number of Reps" tooltipKey="number_of_reps" value={values.number_of_reps} onChange={set("number_of_reps")} min={1} max={5000} />
          <Field label="Emails / Rep / Week" tooltipKey="emails_per_rep_per_week" value={values.emails_per_rep_per_week} onChange={set("emails_per_rep_per_week")} min={0} max={5000} step={25} />
          <Field label="New Contacts / Rep / Week" tooltipKey="new_contacts_per_rep_per_week" value={values.new_contacts_per_rep_per_week} onChange={set("new_contacts_per_rep_per_week")} min={0} max={2000} step={5} />
          <Field label="Annual Data Provider Cost" tooltipKey="annual_data_cost" value={values.annual_data_cost} onChange={set("annual_data_cost")} prefix="$" min={0} max={5000000} step={500} />
        </div>
      </div>
    </div>
  );
}
