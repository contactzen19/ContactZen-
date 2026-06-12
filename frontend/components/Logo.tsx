export default function Logo() {
  return (
    <div className="flex items-center gap-3.5">
      <img
        src="/ra-logo.png"
        alt=""
        className="w-12 h-12 flex-shrink-0"
        style={{ filter: "drop-shadow(0 4px 14px rgba(124,58,237,0.35))" }}
      />
      <div>
        <div className="text-3xl font-extrabold text-brand-900 leading-tight tracking-tight">
          ReachAudit
        </div>
        <div className="text-sm font-medium text-brand-600 mt-0.5">
          Independent Reachability Audits
        </div>
      </div>
    </div>
  );
}
