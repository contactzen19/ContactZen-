import Link from "next/link";
import { ShieldCheck, Phone, ListChecks, RefreshCw } from "lucide-react";

export const metadata = {
  title: "Sample audit | ReachAudit",
  description: "An example ReachAudit report: your reachability score, who to call first, and what stays handled every month.",
};

const CALENDLY = "https://calendly.com/joey-reachaudit/30min";

// Names below are fictional placeholders. Never use real client contacts here,
// even partially masked — DNC-registered people especially must never appear.
const CALL_FIRST = [
  { rank: 1, name: "Marisol R.", city: "Saint Paul", tier: "A", action: "Call + email" },
  { rank: 2, name: "Desmond K.", city: "Saint Paul", tier: "A", action: "Call + email" },
  { rank: 3, name: "Annika L.", city: "Minneapolis", tier: "A", action: "Call + email" },
  { rank: 4, name: "Tobias M.", city: "Bloomington", tier: "B", action: "Email first" },
  { rank: 5, name: "Priya S.", city: "Rochester", tier: "C", action: "Call only" },
  { rank: 6, name: "Franco D.", city: "Duluth", tier: "C", action: "Call only" },
];

const TIERS = [
  { tier: "A", label: "Reachable by email and phone. Call and email these first." },
  { tier: "B", label: "Email is good, phone is unknown. Email first." },
  { tier: "C", label: "Phone is good, email is dead. Call only." },
  { tier: "D", label: "One weak signal. Work these last." },
];

const DNC = [
  { name: "Quentin H.", city: "Saint Paul" },
  { name: "Greta W.", city: "Minneapolis" },
  { name: "Darnell P.", city: "Rochester" },
];

const MONTHLY = [
  { icon: ShieldCheck, title: "Do Not Call scrub", desc: "Every number checked and re-checked every 30 days, with a dated record." },
  { icon: ListChecks, title: "A clean, current list", desc: "Dead emails and bad numbers flagged, so your time goes to real people." },
  { icon: Phone, title: "Who to call first", desc: "Everyone ranked, so your best prospects are always at the top." },
  { icon: RefreshCw, title: "Kept up to date", desc: "Refreshed every month so it never goes stale." },
];

function tierColor(t: string) {
  if (t === "A") return "bg-green-100 text-green-700";
  if (t === "B") return "bg-brand-100 text-brand-700";
  if (t === "C") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-600";
}

export default function SamplePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/ra-logo.png" alt="" className="w-9 h-9 flex-shrink-0" style={{ filter: "drop-shadow(0 4px 14px rgba(124,58,237,0.25))" }} />
            <span className="text-xl font-extrabold text-brand-900 tracking-tight">ReachAudit</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors">Pricing</Link>
            <Link href="/app" className="btn-primary text-sm px-4 py-2">Score your list free</Link>
          </div>
        </div>
      </nav>

      <div className="pt-28 pb-24 px-6">
        <div className="max-w-4xl mx-auto space-y-10">

          {/* Sample banner */}
          <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-1.5 text-sm font-medium text-brand-700">
            <span className="w-2 h-2 rounded-full bg-brand-600" />
            Sample audit · this is an example, your report runs on your own list
          </div>

          {/* Report header */}
          <div>
            <h1 className="text-4xl font-extrabold text-brand-900 tracking-tight mb-2">Reachability audit</h1>
            <p className="text-gray-500">Prepared for Lakeside Insurance (example) · June 2026 · by Joey Prindle, ReachAudit</p>
          </div>

          {/* Score */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-sm text-gray-500">Reachability score</span>
              <span className="text-sm text-green-600 font-medium">Healthy</span>
            </div>
            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-5xl font-extrabold text-brand-900">93</span>
              <span className="text-gray-400">/ 100</span>
            </div>
            <div className="relative h-2.5 bg-white rounded-full mb-2 border border-gray-100">
              <div className="absolute top-0 bottom-0 rounded-full bg-green-200" style={{ left: "70%", width: "23%" }} />
              <div className="absolute -top-1 -bottom-1 w-0.5 bg-brand-900" style={{ left: "93%" }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>0</span><span>typical 3-month-old list: 85 to 95</span><span>100</span>
            </div>
            <p className="text-brand-900 mt-5">
              <strong>3,733 of 4,015 leads are reachable right now.</strong> The list is in good shape for its age. Here&apos;s what&apos;s in it and where to start.
            </p>
          </div>

          {/* Findings */}
          <div>
            <h2 className="text-sm text-gray-500 mb-3">What&apos;s in the list</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl p-4 bg-gray-50 border border-gray-100"><p className="text-2xl font-extrabold text-green-600">3,733</p><p className="text-xs text-gray-500 mt-0.5">reachable right now</p></div>
              <div className="rounded-xl p-4 bg-gray-50 border border-gray-100"><p className="text-2xl font-extrabold text-brand-900">282</p><p className="text-xs text-gray-500 mt-0.5">not reachable right now</p></div>
              <div className="rounded-xl p-4 bg-gray-50 border border-gray-100"><p className="text-2xl font-extrabold text-brand-900">8</p><p className="text-xs text-gray-500 mt-0.5">on the Do Not Call list</p></div>
              <div className="rounded-xl p-4 bg-gray-50 border border-gray-100"><p className="text-2xl font-extrabold text-brand-900">2,586</p><p className="text-xs text-gray-500 mt-0.5">no cell on file</p></div>
            </div>
          </div>

          {/* Who to call first */}
          <div>
            <h2 className="text-2xl font-extrabold text-brand-900 mb-1">Who to call first</h2>
            <p className="text-gray-500 text-sm mb-5">Every reachable lead ranked and sorted into tiers, so you always know who&apos;s next.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {TIERS.map((t) => (
                <div key={t.tier} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierColor(t.tier)}`}>Tier {t.tier}</span>
                  <p className="text-sm text-gray-600">{t.label}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs text-gray-400">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">City</th>
                    <th className="px-4 py-3 font-medium">Tier</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {CALL_FIRST.map((c) => (
                    <tr key={c.rank} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-brand-600 font-bold">{c.rank}</td>
                      <td className="px-4 py-3 text-gray-700">{c.name}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{c.city}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tierColor(c.tier)}`}>{c.tier}</span></td>
                      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{c.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Do Not Call */}
          <div>
            <h2 className="text-2xl font-extrabold text-brand-900 mb-1">Do Not Call, flagged</h2>
            <p className="text-gray-500 text-sm mb-5">These are on the National registry. We flag them so you skip them and call the rest with confidence.</p>
            <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100">
              {DNC.map((d) => (
                <div key={d.name} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700">{d.name} · <span className="text-gray-400">{d.city}</span></span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Skip</span>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly */}
          <div>
            <h2 className="text-2xl font-extrabold text-brand-900 mb-5">What stays handled every month</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MONTHLY.map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.title} className="flex gap-4 p-5 rounded-2xl bg-gray-50 border border-gray-100">
                    <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-brand-600" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-900 mb-1">{m.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{m.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center rounded-2xl p-10" style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}>
            <h2 className="text-3xl font-extrabold text-white mb-3">This, on your own list.</h2>
            <p className="text-brand-200 text-lg mb-8 max-w-xl mx-auto">Start with a free score. If it helps, we&apos;ll keep it cleaned, compliant, and ranked every month.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/app" className="inline-block bg-white text-brand-700 font-bold text-base px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors">Score your list free</Link>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="inline-block border-2 border-white/40 text-white font-bold text-base px-8 py-4 rounded-xl hover:bg-white/10 transition-colors">Book a call</a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
