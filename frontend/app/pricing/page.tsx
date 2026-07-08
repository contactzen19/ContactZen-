"use client";
import Link from "next/link";
import { ShieldCheck, Phone, ListChecks, Map } from "lucide-react";

const CALENDLY = "https://calendly.com/joey-reachaudit/30min";
const STRIPE_AUDIT = "https://buy.stripe.com/3cIfZi98L1XW8tsfazb7y01";

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img
            src="/ra-logo.png"
            alt=""
            className="w-9 h-9 flex-shrink-0"
            style={{ filter: "drop-shadow(0 4px 14px rgba(124,58,237,0.25))" }}
          />
          <span className="text-xl font-extrabold text-brand-900 tracking-tight">ReachAudit</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors">
            Free score
          </Link>
          <a
            href={CALENDLY}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm px-4 py-2"
          >
            Book a call
          </a>
        </div>
      </div>
    </nav>
  );
}

const DELIVERABLES = [
  {
    icon: ListChecks,
    title: "A ranked call list",
    desc: "Every lead sorted best to worst to call, so your team works the top of the sheet instead of guessing top to bottom. The thing you open Monday morning.",
  },
  {
    icon: ShieldCheck,
    title: "Do Not Call, handled",
    desc: "Every number checked against the National registry and re-checked every 30 days, with a dated record. We flag what to skip so you call the rest with confidence. The decision to call stays yours.",
  },
  {
    icon: Phone,
    title: "Real phone info",
    desc: "Cell vs landline, live vs disconnected, on every callable record. Not just a number on file, a number that actually rings.",
  },
  {
    icon: Map,
    title: "Reachability and source",
    desc: "Independent email and phone verification, plus which source sent the dead records. We don't sell data.",
  },
];

const STEPS = [
  {
    n: 1,
    title: "Send us your list",
    desc: "Export the list you already own from your lead vendor or CRM. Or start with a free score first, it takes a minute.",
  },
  {
    n: 2,
    title: "We get it ready",
    desc: "Live email check, phone info, and a Do Not Call scrub. We process your file and discard it. We never keep or sell your data.",
  },
  {
    n: 3,
    title: "We keep it current",
    desc: "You get a clean, ranked, compliant list, and we refresh it every 30 days so it never goes stale.",
  },
];

const FAQ = [
  {
    q: "How much does it cost?",
    a: "A one-time audit of a single book of leads is $199, and you can buy it right on this page. The monthly plan depends on your list size, starting around $199/mo. Start with a free score if you want to see the shape of your list first. No commitment to try it.",
  },
  {
    q: "How do you handle Do Not Call compliance?",
    a: "We check every number against the National Do Not Call registry, re-check it every 30 days, and hand you a dated record. We flag what's on the list so you skip it. The decision to call stays with you, which keeps the compliance call where it belongs.",
  },
  {
    q: "Should I do the one-time audit or the monthly plan?",
    a: "The audit is right if you have one list and want it cleaned, checked, and ranked once. But compliance goes stale. The Do Not Call list changes, your list ages, and new leads come in, so a scrub is only good for about 30 days. If your team calls every week, the monthly plan keeps you covered instead of leaving you to redo it.",
  },
  {
    q: "Is this the same as enrichment, or what my CRM does?",
    a: "No. Enrichment fills in missing fields. We tell you who's actually reachable, whether the number is real and callable, and we keep the whole list compliant every month. On any CSV, nothing to install.",
  },
  {
    q: "Do you store my data?",
    a: "No. Your contact records are never stored. Your file is used only to run the score and audit, then discarded. We keep only the summary numbers for your report, never the contacts themselves.",
  },
  {
    q: "What do you need from me?",
    a: "A CSV with names, emails, and phone numbers. If it shows where each lead came from, we can also tell you which source sent the dead records.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-1.5 text-sm font-medium text-brand-700 mb-6">
              <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
              Simple pricing
            </div>
            <h1 className="text-5xl font-extrabold text-brand-900 tracking-tight mb-4 leading-tight">
              Know who to call,<br />and keep it that way.
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              We keep the list you bought cleaned, checked against the Do Not Call list, and ranked by who to call first. Every month. Start with a free score.
            </p>
          </div>

          {/* Three ways in: free score, one-time audit, monthly plan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {/* Free score */}
            <div className="rounded-2xl border border-gray-200 shadow-sm p-8 bg-white flex flex-col">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Start here</p>
              <h2 className="text-2xl font-extrabold text-brand-900 mb-1">Free score</h2>
              <p className="text-3xl font-extrabold text-brand-900 mb-3">$0</p>
              <p className="text-gray-500 text-sm mb-6 flex-1">
                Upload the list you bought and see how many of the leads you can actually reach. No signup, no data stored.
              </p>
              <Link href="/app" className="btn-secondary w-full block text-center text-base py-3 rounded-xl">
                Score your list free
              </Link>
            </div>

            {/* One-time audit */}
            <div className="rounded-2xl border-2 border-brand-600 shadow-xl shadow-brand-100 p-8 bg-white flex flex-col">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">One list, done right</p>
              <h2 className="text-2xl font-extrabold text-brand-900 mb-1">Contact List Audit</h2>
              <p className="text-3xl font-extrabold text-brand-900 mb-1">$199<span className="text-lg text-gray-400 font-bold"> one time</span></p>
              <p className="text-xs text-gray-400 mb-3">for a single book of leads</p>
              <p className="text-gray-500 text-sm mb-6 flex-1">
                Live email check, phone info, a Do Not Call scrub, and a graded report with a cleaned, ranked list back in your hands.
              </p>
              <a href={STRIPE_AUDIT} target="_blank" rel="noopener noreferrer" className="btn-primary w-full block text-center text-base py-3 rounded-xl">
                Buy the audit
              </a>
            </div>

            {/* Monthly plan */}
            <div className="rounded-2xl border border-gray-200 shadow-sm p-8 bg-white flex flex-col">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Then keep it handled</p>
              <h2 className="text-2xl font-extrabold text-brand-900 mb-1">Monthly plan</h2>
              <p className="text-3xl font-extrabold text-brand-900 mb-1">from $199<span className="text-lg text-gray-400 font-bold">/mo</span></p>
              <p className="text-xs text-gray-400 mb-3">priced by your list size</p>
              <p className="text-gray-500 text-sm mb-6 flex-1">
                We clean your list, check it against the Do Not Call list, rank it by who to call first, and keep it current every month.
              </p>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-primary w-full block text-center text-base py-3 rounded-xl">
                Book a call
              </a>
            </div>
          </div>

          {/* Deliverables */}
          <div className="mb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-brand-900 mb-3">What you get every month</h2>
              <p className="text-gray-500">A list your team can work, not just a cleaner spreadsheet.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {DELIVERABLES.map((d) => {
                const Icon = d.icon;
                return (
                  <div
                    key={d.title}
                    className="flex gap-4 p-6 rounded-2xl bg-gray-50 border border-gray-100"
                  >
                    <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-brand-600" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-900 mb-1">{d.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">{d.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* How it works */}
          <div className="mb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-brand-900 mb-3">How it works</h2>
              <p className="text-gray-500">You buy the leads. We do the rest, every month.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map((step) => (
                <div
                  key={step.n}
                  className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center mb-4">
                    {step.n}
                  </div>
                  <h3 className="font-bold text-brand-900 mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Who it's for */}
          <div className="mb-20 rounded-2xl bg-gray-50 border border-gray-100 p-10">
            <h2 className="text-2xl font-extrabold text-brand-900 mb-4 text-center">Who this is for</h2>
            <p className="text-gray-600 max-w-2xl mx-auto text-center leading-relaxed">
              Teams that buy lead lists and call them: <strong>insurance agencies (P&amp;C, Medicare, life), and any sales shop working purchased leads</strong>. If you&apos;re paying for leads and want to know who&apos;s worth calling and who&apos;s on the Do Not Call list, that&apos;s what we handle.
            </p>
          </div>

          {/* FAQ */}
          <div className="mb-16">
            <h2 className="text-3xl font-extrabold text-brand-900 text-center mb-10">Common questions</h2>
            <div className="space-y-6 max-w-2xl mx-auto">
              {FAQ.map((item) => (
                <div key={item.q} className="border-b border-gray-100 pb-6">
                  <h3 className="font-semibold text-brand-900 mb-2">{item.q}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center rounded-2xl p-12" style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}>
            <h2 className="text-3xl font-extrabold text-white mb-3">
              See what your list is really worth.
            </h2>
            <p className="text-brand-200 text-lg mb-8 max-w-xl mx-auto">
              Start with a free score. If it helps, we&apos;ll keep it cleaned, compliant, and ranked every month.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/app"
                className="inline-block bg-white text-brand-700 font-bold text-base px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors"
              >
                Score your list free
              </Link>
              <a
                href={CALENDLY}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block border-2 border-white/40 text-white font-bold text-base px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
              >
                Book a call
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
