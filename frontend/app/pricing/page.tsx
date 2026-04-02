"use client";
import { useState } from "react";
import Link from "next/link";

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white text-base flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #9F67FF)", boxShadow: "0 4px 14px rgba(124,58,237,0.25)" }}>
            ⚡
          </div>
          <span className="text-xl font-extrabold text-brand-900 tracking-tight">ContactZen</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors">
            Try the Tool
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
      </div>
    </nav>
  );
}

const TIERS = [
  {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "See what ContactZen can do with no commitment.",
    cta: "Start Free",
    ctaHref: "/app",
    ctaStyle: "border-2 border-brand-600 text-brand-600 hover:bg-brand-50",
    highlight: false,
    features: [
      { text: "Up to 5,000 contacts per scan", included: true },
      { text: "1 scan per month", included: true },
      { text: "HubSpot connection", included: true },
      { text: "Email & phone reachability scoring", included: true },
      { text: "Executive ROI report", included: true },
      { text: "Clean CSV export", included: false },
      { text: "Suppression list export", included: false },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Pro",
    monthlyPrice: 99,
    annualPrice: 79,
    description: "For RevOps teams who need to run clean data as an ongoing workflow.",
    cta: "Get Started",
    ctaHref: "https://calendly.com/contactzen-joey/new-meeting",
    ctaStyle: "bg-brand-600 text-white hover:bg-brand-700",
    highlight: true,
    features: [
      { text: "Up to 50,000 contacts per scan", included: true },
      { text: "Unlimited scans", included: true },
      { text: "HubSpot connection", included: true },
      { text: "Email & phone reachability scoring", included: true },
      { text: "Executive ROI report", included: true },
      { text: "Clean CSV export", included: true },
      { text: "Suppression list export", included: true },
      { text: "Priority support", included: false },
    ],
  },
  {
    name: "Team",
    monthlyPrice: 299,
    annualPrice: 239,
    description: "For larger orgs that need unlimited scale and hands-on support.",
    cta: "Book a Call",
    ctaHref: "https://calendly.com/contactzen-joey/new-meeting",
    ctaStyle: "border-2 border-brand-600 text-brand-600 hover:bg-brand-50",
    highlight: false,
    features: [
      { text: "Unlimited contacts per scan", included: true },
      { text: "Unlimited scans", included: true },
      { text: "HubSpot connection", included: true },
      { text: "Email & phone reachability scoring", included: true },
      { text: "Executive ROI report", included: true },
      { text: "Clean CSV export", included: true },
      { text: "Suppression list export", included: true },
      { text: "Priority support", included: true },
    ],
  },
];

function Check() {
  return (
    <svg className="w-5 h-5 text-brand-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function X() {
  return (
    <svg className="w-5 h-5 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <NavBar />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-extrabold text-brand-900 tracking-tight mb-4">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-8">
              A fraction of what you&apos;re spending on data providers today — with a clear picture of what it&apos;s actually costing you.
            </p>

            {/* Annual toggle */}
            <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${!annual ? "bg-white text-brand-900 shadow-sm" : "text-gray-500"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${annual ? "bg-white text-brand-900 shadow-sm" : "text-gray-500"}`}
              >
                Annual
                <span className="ml-2 text-xs font-bold text-brand-600">Save 20%</span>
              </button>
            </div>
          </div>

          {/* Tiers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-8 relative ${
                  tier.highlight
                    ? "border-brand-600 shadow-xl shadow-brand-100"
                    : "border-gray-200"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-brand-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h2 className="text-xl font-extrabold text-brand-900 mb-1">{tier.name}</h2>
                  <p className="text-gray-500 text-sm mb-4">{tier.description}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-extrabold text-brand-900">
                      ${annual ? tier.annualPrice : tier.monthlyPrice}
                    </span>
                    {tier.monthlyPrice > 0 && (
                      <span className="text-gray-400 text-sm mb-1">/mo</span>
                    )}
                  </div>
                  {annual && tier.monthlyPrice > 0 && (
                    <p className="text-xs text-brand-600 font-medium mt-1">
                      Billed annually · Save ${(tier.monthlyPrice - tier.annualPrice) * 12}/yr
                    </p>
                  )}
                </div>

                <a
                  href={tier.ctaHref}
                  target={tier.ctaHref.startsWith("http") ? "_blank" : undefined}
                  rel={tier.ctaHref.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={`w-full block text-center font-semibold text-sm px-6 py-3 rounded-xl transition-colors mb-8 ${tier.ctaStyle}`}
                >
                  {tier.cta}
                </a>

                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-3">
                      {f.included ? <Check /> : <X />}
                      <span className={`text-sm ${f.included ? "text-gray-700" : "text-gray-400"}`}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-20 max-w-2xl mx-auto">
            <h2 className="text-2xl font-extrabold text-brand-900 text-center mb-8">Common questions</h2>
            <div className="space-y-6">
              {[
                {
                  q: "Do you store my contact data?",
                  a: "Never. Your contacts are processed in memory during the scan and immediately discarded. Nothing is written to a database. This is a core architectural decision, not an afterthought.",
                },
                {
                  q: "What CRM access does ContactZen need?",
                  a: "Read-only access to your contacts. We cannot modify, delete, or export anything from your CRM. You can revoke access at any time from your HubSpot settings.",
                },
                {
                  q: "Can I try it before paying?",
                  a: "Yes — the Free plan lets you scan up to 5,000 contacts with a full HubSpot connection and executive report. No credit card required.",
                },
                {
                  q: "What happens when I hit my contact limit?",
                  a: "We'll let you know and give you the option to upgrade. We don't cut off your scan mid-results.",
                },
                {
                  q: "Is Salesforce supported?",
                  a: "Salesforce is on our roadmap and coming soon on the Team plan. In the meantime, any CRM that exports a CSV works on all plans.",
                },
              ].map((item) => (
                <div key={item.q} className="border-b border-gray-100 pb-6">
                  <h3 className="font-semibold text-brand-900 mb-2">{item.q}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-16 text-center">
            <p className="text-gray-500 mb-4">Not sure which plan is right for you?</p>
            <a
              href="https://calendly.com/contactzen-joey/new-meeting"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-8 py-3 text-base"
            >
              Book a 30-minute call
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
