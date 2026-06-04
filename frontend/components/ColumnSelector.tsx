"use client";

type ColumnKey =
  | "emailCol"
  | "sourceCol"
  | "phoneCol"
  | "lastSendCol"
  | "lastOpenCol"
  | "lastReplyCol";

interface Props {
  columns: string[];
  emailCol: string;
  sourceCol: string;
  phoneCol: string;
  lastSendCol: string;
  lastOpenCol: string;
  lastReplyCol: string;
  onChange: (key: ColumnKey, value: string) => void;
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

export default function ColumnSelector({
  columns,
  emailCol,
  sourceCol,
  phoneCol,
  lastSendCol,
  lastOpenCol,
  lastReplyCol,
  onChange,
}: Props) {
  return (
    <div className="space-y-5">
      {/* Core columns */}
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

      {/* Engagement columns — unlocks abandoned-inbox detection */}
      <div className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-4 space-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-700">
            Engagement columns
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Map these to unlock the abandoned-inbox bucket — the reachability layer NeverBounce can&apos;t see. Leave blank if your export doesn&apos;t include them.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Last Email Send"
            value={lastSendCol}
            options={columns}
            onChange={(v) => onChange("lastSendCol", v)}
          />
          <Select
            label="Last Email Open"
            value={lastOpenCol}
            options={columns}
            onChange={(v) => onChange("lastOpenCol", v)}
          />
          <Select
            label="Last Email Reply"
            value={lastReplyCol}
            options={columns}
            onChange={(v) => onChange("lastReplyCol", v)}
          />
        </div>
      </div>
    </div>
  );
}
