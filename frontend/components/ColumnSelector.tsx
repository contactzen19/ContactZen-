"use client";

interface Props {
  columns: string[];
  emailCol: string;
  sourceCol: string;
  phoneCol: string;
  onChange: (key: "emailCol" | "sourceCol" | "phoneCol", value: string) => void;
}

function Select({ label, value, options, onChange, required }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
        {label} {!required && <span className="font-normal text-gray-400">(optional)</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
      >
        {!required && <option value="">(none)</option>}
        {options.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </div>
  );
}

export default function ColumnSelector({ columns, emailCol, sourceCol, phoneCol, onChange }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Select
        label="Email Column"
        value={emailCol}
        options={columns}
        onChange={(v) => onChange("emailCol", v)}
        required
      />
      <Select
        label="Source Column"
        value={sourceCol}
        options={columns}
        onChange={(v) => onChange("sourceCol", v)}
      />
      <Select
        label="Phone Column"
        value={phoneCol}
        options={columns}
        onChange={(v) => onChange("phoneCol", v)}
      />
    </div>
  );
}
