"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Zap,
  Link2,
  BarChart3,
  Lock,
  Eye,
  Shield,
  Key,
  Menu,
  X,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

function NavBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" aria-label="ReachAudit home" className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #9F67FF)",
              boxShadow: "0 4px 14px rgba(124,58,237,0.25)",
            }}
          >
            <Zap className="w-5 h-5" aria-hidden="true" />
          </div>
          <span className="text-xl font-extrabold text-brand-900 tracking-tight">
            ReachAudit
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/app"
            className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
          >
            Try the Tool
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
          >
            Pricing
          </Link>
          <a
            href="https://calendly.com/contactzen-joey/new-meeting"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm px-4 py-2"
          >
            Book a Call
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="md:hidden p-2 -mr-2 text-brand-900 hover:text-brand-600 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-expanded={isOpen}
          aria-controls="mobile-menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {isOpen && (
        <div
          id="mobile-menu"
          className="md:hidden border-t border-gray-100 bg-white"
        >
          <div className="px-6 py-4 flex flex-col gap-4">
            <Link
              href="/app"
              className="text-base font-medium text-gray-700 hover:text-brand-600 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Try the Tool
            </Link>
            <Link
              href="/pricing"
              className="text-base font-medium text-gray-700 hover:text-brand-600 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </Link>
            <a
              href="https://calendly.com/contactzen-joey/new-meeting"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm px-4 py-2 text-center"
              onClick={() => setIsOpen(false)}
            >
              Book a Call
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 text-center">
      <div className="max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-1.5 text-sm font-medium text-brand-700 mb-8">
          <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
          Independent Reachability Audits
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-brand-900 leading-tight tracking-tight mb-6">
          Valid doesn&apos;t mean<br />
          <span
            style={{
              background: "linear-gradient(135deg, #7C3AED, #9F67FF)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            reachable.
          </span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          An independent audit of your CRM&apos;s reachability — sourced, scored, and dollarized. Run before your next data vendor renewal, while you still have leverage.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://calendly.com/contactzen-joey/new-meeting"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-base px-8 py-4 rounded-xl inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Book a Scoping Call
          </a>
          <Link
            href="/audit/sample"
            className="flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-brand-400 text-gray-700 font-semibold text-base px-8 py-4 rounded-xl transition-colors"
          >
            See a Sample Audit
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          30-min scoping call · No commitment · 5-day audit turnaround
        </p>
      </div>
    </section>
  );
}

function ProductPreview() {
  const metrics = [
    { label: "Contacts Scanned", value: "25,412", sub: "full database" },
    { label: "High-Risk Rate", value: "28.4%", sub: "7,217 flagged", highlight: true },
    { label: "Invalid Emails", value: "3,841", sub: "hard bounces incoming" },
    { label: "GTM Waste", value: "$94,200", sub: "estimated annual" },
  ];

  const sources = [
    { name: "ZoomInfo", pct: 41, bad: 38, color: "#EF4444" },
    { name: "Apollo", pct: 27, bad: 22, color: "#F97316" },
    { name: "Organic / Inbound", pct: 19, bad: 4, color: "#22C55E" },
    { name: "LinkedIn", pct: 13, bad: 11, color: "#F59E0B" },
  ];

  const atRisk = [
    { email: "j.smith@techcorp.io", risk: "Invalid", reason: "Mailbox does not exist", source: "ZoomInfo" },
    { email: "ceo@oldstartup.com", risk: "Risky", reason: "Domain parked / inactive", source: "Apollo" },
    { email: "mike.jones@bigco.com", risk: "Invalid", reason: "Role address — mass reject risk", source: "ZoomInfo" },
  ];

  return (
    <section className="py-20 px-6 bg-gray-50 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-3">
            What the audit shows you.
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Anonymized view from a real audit — 25,000 contacts from a mid-market B2B team. Source attribution, dollarized waste, credit-recapture-ready.
          </p>
        </div>

        {/* Browser chrome wrapper */}
        <div className="rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" style={{ boxShadow: "0 25px 60px rgba(124,58,237,0.15)" }}>
          {/* Browser bar */}
          <div className="bg-gray-100 border-b border-gray-200 px-4 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 font-mono max-w-xs mx-auto text-center">
              reachaudit.com/app
            </div>
          </div>

          {/* App content */}
          <div className="bg-gray-50 p-5 space-y-4">
            {/* Metric tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className={`rounded-xl p-4 border ${m.highlight ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}
                >
                  <p className="text-xs text-gray-400 font-medium mb-1">{m.label}</p>
                  <p className={`text-2xl font-extrabold ${m.highlight ? "text-red-600" : "text-brand-900"}`}>{m.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source breakdown */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Source Quality Breakdown</p>
                <div className="space-y-3">
                  {sources.map((s) => (
                    <div key={s.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{s.name}</span>
                        <span className="text-xs font-bold" style={{ color: s.color }}>{s.bad}% bad</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${s.bad}%`, background: s.color, opacity: 0.7 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ROI callout */}
              <div className="rounded-xl p-4 text-white space-y-3" style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-300">GTM Waste Detected</p>
                <p className="text-4xl font-extrabold">$94,200</p>
                <p className="text-brand-200 text-xs">estimated annual impact</p>
                <div className="border-t border-white/20 pt-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-200">Rep time wasted</span>
                    <span className="font-semibold">$61,400</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-200">Data vendor waste</span>
                    <span className="font-semibold">$32,800</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-brand-200">Bad emails / yr</span>
                    <span className="font-semibold">46,000+</span>
                  </div>
                </div>
              </div>
            </div>

            {/* At-risk sample */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">At-Risk Records — Sample</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-2 font-medium">Email</th>
                      <th className="pb-2 font-medium">Risk</th>
                      <th className="pb-2 font-medium hidden sm:table-cell">Reason</th>
                      <th className="pb-2 font-medium hidden md:table-cell">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRisk.map((r) => (
                      <tr key={r.email} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 font-mono text-xs text-gray-600">{r.email}</td>
                        <td className="py-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.risk === "Invalid" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {r.risk}
                          </span>
                        </td>
                        <td className="py-2 text-xs text-gray-500 hidden sm:table-cell">{r.reason}</td>
                        <td className="py-2 text-xs text-gray-400 hidden md:table-cell">{r.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-400 mb-4">Want this on your own data? Try the engine free, or book a scoping call for the full audit.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://calendly.com/contactzen-joey/new-meeting"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-6 py-3 text-sm font-semibold rounded-xl inline-block"
            >
              Book a Scoping Call →
            </a>
            <a
              href="/app?demo=true"
              className="btn-secondary px-6 py-3 text-sm font-semibold rounded-xl inline-block"
            >
              Try the Engine Free
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function PainSection() {
  const stats = [
    {
      number: "28%",
      label:
        "of contacts flagged high-risk in a real CRM scan — invalid, unreachable, or actively harmful to sender reputation",
    },
    {
      number: "22%",
      label:
        "of phone numbers invalid or missing — your dialers are burning credits on numbers that don't exist",
    },
    {
      number: "0 of 25",
      label:
        "enterprise direct dials connected in a real outreach test — every email delivered, zero phones reached",
    },
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-4">
            You&apos;re not missing pipeline. You&apos;re dialing bad data.
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Your data vendor calls it valid. The phone doesn&apos;t connect. The audit is the difference between assuming reachability and measuring it — with the receipt your CFO will sign off on.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((s) => (
            <div
              key={s.number}
              className="text-center p-8 rounded-2xl bg-gray-50 border border-gray-100"
            >
              <div
                className="text-4xl font-extrabold mb-2"
                style={{
                  background: "linear-gradient(135deg, #7C3AED, #9F67FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {s.number}
              </div>
              <p className="text-gray-600 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type Step = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

function HowItWorks() {
  const steps: Step[] = [
    {
      icon: Link2,
      title: "30-min scoping call",
      desc: "We walk through your list size, data sources, and renewal timeline. Free, no commitment.",
    },
    {
      icon: Zap,
      title: "Secure CSV transfer",
      desc: "Export from HubSpot, Salesforce, or any CRM. We process in memory and discard on completion. Nothing stored.",
    },
    {
      icon: BarChart3,
      title: "Live readout in 5 business days",
      desc: "We deliver the audit live to your team — RevOps, sales leadership, CFO — then hand off the shareable link and PDF.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-4">How the audit works</h2>
          <p className="text-gray-500 text-lg">Scoping call to boardroom-ready readout in under two weeks.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-brand-600" aria-hidden="true" />
                </div>
                <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-2">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-bold text-brand-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type TrustItem = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

function TrustSection() {
  const items: TrustItem[] = [
    {
      icon: Lock,
      title: "We never store your contacts",
      desc: "Your data is processed in memory and immediately discarded. Nothing is written to a database.",
    },
    {
      icon: Eye,
      title: "Read-only by design",
      desc: "ReachAudit only reads the contacts you upload. We never modify, delete, or write back to your CRM.",
    },
    {
      icon: Shield,
      title: "SOC 2-aligned architecture",
      desc: "Built from day one with security best practices. Process-and-discard data model minimizes your compliance surface.",
    },
    {
      icon: Key,
      title: "You stay in control",
      desc: "Your CSV is processed once and discarded. Nothing persists, nothing syncs, nothing leaves your hands.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-4">Built for trust</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Your contact data is sensitive. We designed ReachAudit so you never have to wonder what happens to it.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="flex gap-4 p-6 rounded-2xl bg-gray-50 border border-gray-100"
              >
                <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-brand-600" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-bold text-brand-900 mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section
      className="py-24 px-6"
      style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}
    >
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-4xl font-extrabold text-white mb-4">
          The hard part isn&apos;t deciding to audit.
        </h2>
        <p className="text-brand-200 text-lg mb-10">
          It&apos;s deciding to audit before your next data vendor renewal — while you still have leverage.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <a
            href="https://calendly.com/contactzen-joey/new-meeting"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-brand-700 font-bold text-base px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors"
          >
            Book a Scoping Call
          </a>
          <Link
            href="/audit/sample"
            className="border-2 border-white/40 text-white font-bold text-base px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
          >
            See a Sample Audit
          </Link>
        </div>
        <p className="text-white/50 text-xs">
          30-min scoping call · No commitment · 5-day audit turnaround
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-brand-900 py-8 px-6 text-center">
      <p className="text-brand-400 text-sm">
        © 2026 ReachAudit · Valid doesn&apos;t mean reachable. ·{" "}
        <a
          href="mailto:contactzen.joey@gmail.com"
          className="hover:text-white transition-colors"
        >
          contactzen.joey@gmail.com
        </a>
      </p>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <Hero />
      <ProductPreview />
      <PainSection />
      <HowItWorks />
      <TrustSection />
      <CTASection />
      <Footer />
    </div>
  );
}
