export default function Logo() {
  return (
    <div className="flex items-center gap-3.5">
      <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-white text-xl flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #7C3AED, #9F67FF)", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}>
        ⚡
      </div>
      <div>
        <div className="text-3xl font-extrabold text-brand-900 leading-tight tracking-tight">
          ContactZen
        </div>
        <div className="text-sm font-medium text-brand-600 mt-0.5">
          Contact Data Intelligence Platform
        </div>
      </div>
    </div>
  );
}
