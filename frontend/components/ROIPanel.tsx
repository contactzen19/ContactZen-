"use client";
import { ROIInputs } from "@/lib/types";

interface Props {
  values: ROIInputs;
  onChange: (vals: ROIInputs) => void;
}

function Field({ label, value, onChange, min, max, step, prefix }: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; prefix?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
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

export default function ROIPanel({ values, onChange }: Props) {
  const set = (key: keyof ROIInputs) => (v: number) => onChange({ ...values, [key]: v });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">ROI Assumptions</p>
        <div className="space-y-3">
          <Field label="Rep Cost / Hour" value={values.rep_hourly_cost} onChange={set("rep_hourly_cost")} prefix="$" min={10} max={250} step={5} />
          <Field label="Cleanup Hours / Rep / Month" value={values.cleanup_hours_per_rep_per_month} onChange={set("cleanup_hours_per_rep_per_month")} min={0} max={40} step={0.5} />
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">
              Confidence Factor
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
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Sales Org</p>
        <div className="space-y-3">
          <Field label="Number of Reps" value={values.number_of_reps} onChange={set("number_of_reps")} min={1} max={5000} />
          <Field label="Emails / Rep / Week" value={values.emails_per_rep_per_week} onChange={set("emails_per_rep_per_week")} min={0} max={5000} step={25} />
          <Field label="New Contacts / Rep / Week" value={values.new_contacts_per_rep_per_week} onChange={set("new_contacts_per_rep_per_week")} min={0} max={2000} step={5} />
          <Field label="Annual Data Provider Cost" value={values.annual_data_cost} onChange={set("annual_data_cost")} prefix="$" min={0} max={5000000} step={500} />
        </div>
      </div>
    </div>
  );
}
