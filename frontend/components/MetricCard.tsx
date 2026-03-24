import clsx from "clsx";

interface Props {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  danger?: boolean;
}

export default function MetricCard({ label, value, sub, highlight, danger }: Props) {
  return (
    <div className="card flex flex-col gap-1">
      <div className={clsx(
        "text-2xl font-bold leading-tight",
        danger ? "text-red-500" : highlight ? "text-brand-600" : "text-brand-600"
      )}>
        {value}
      </div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && (
        <div className={clsx("text-xs font-medium mt-0.5", danger ? "text-red-400" : "text-gray-400")}>
          {sub}
        </div>
      )}
    </div>
  );
}
