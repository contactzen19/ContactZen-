"use client";
import Link from "next/link";
import { Globe, Map, Trash2, BarChart3 } from "lucide-react";

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

const DELIVERABLES = [
  {
    icon: Globe,
    title: "Shareable web report",
    desc: "A live link your team can pass around in Slack, email, or a doc. Always up to date, accessible across RevOps, sales leadership, and finance.",
  },
  {
    icon: Map,
    title: "Source map",
    desc: "Which data provider's contacts are decayed, by what percentage, with the dollar cost mapped to your renewal. Ready for the vendor conversation.",
  },
  {
    icon: BarChart3,
    title: "ROI levers",
    desc: "Three numbers your CFO will ask for: wasted rep capacity, recoverable pipeline, wasted data spend. Each one defended by methodology.",
  },
  {
    icon: Trash2,
    title: "Suppression list",
    desc: "Cleanup-ready CSV. Hard bounces, role addresses, and abandoned inboxes flagged so your next sequence isn't burning sender reputation.",
  },
];

const STEPS = [
  {
    n: 1,
    title: "30-min scoping call",
    desc: "We walk through your list size, data sources, current renewal timeline, and what you want the audit to answer. Free.",
  },
  {
    n: 2,
    title: "Secure CSV transfer",
    desc: "You export your contact list from HubSpot, Salesforce, or any CRM. We process it in memory and discard it on completion. Nothing stored.",
  },
  {
    n: 3,
    title: "Live readout in 5 business days",
    desc: "We deliver the audit live to your team (RevOps, sales leadership, CFO if relevant). Then we hand off the shareable web report link.",
  },
];

const FAQ = [
  {
    q: "How fast is the turnaround?",
    a: "Five business days from the moment we receive your CSV. Most audits complete in three.",
  },
  {
    q: "What size list does this work for?",
    a: "The $5,000 base engagement covers lists up to 25,000 contacts. Larger lists or recurring quarterly audits are scoped on the call.",
  },
  {
    q: "Do you store our data?",
    a: "No. Your CSV is processed in memory during the audit and discarded immediately after. Nothing is written to a database, nothing persists past the engagement.",
  },
  {
    q: "What CRMs are supported?",
    a: "Any CRM that can export a CSV. HubSpot, Salesforce, Outreach, Apollo, Pipedrive, custom systems. We're CRM-independent by design.",
  },
  {
    q: "Can we do this as a recurring engagement?",
    a: "Yes. Many teams run a quarterly audit aligned with their data provider's renewal cycle, so they walk into that conversation knowing their cost per reachable contact and what a right-sized contract looks like. Scoped per relationship.",
  },
  {
    q: "What if the audit finds very little?",
    a: "That's a result too, and worth knowing. You'll have an independent, methodology-defended baseline you can show leadership. We've never had an audit return zero. If yours does, you'll have the receipt.",
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
              Engagement-based, not subscription
            </div>
            <h1 className="text-5xl font-extrabold text-brand-900 tracking-tight mb-4 leading-tight">
              Audits scoped to your list,<br />not a SaaS seat count.
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              You don&apos;t need a recurring tool. You need an independent answer. Once, before your next data provider renewal.
            </p>
          </div>

          {/* Pricing card */}
          <div className="rounded-2xl border-2 border-brand-600 shadow-xl shadow-brand-100 p-10 mb-16 bg-white">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-8">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-2">Reachability Audit</p>
                <h2 className="text-2xl font-extrabold text-brand-900 mb-1">One engagement, four deliverables.</h2>
                <p className="text-gray-500 text-sm">Web report · source map · ROI levers · suppression list.</p>
              </div>
              <div className="text-right">
                <div className="flex items-end gap-1 justify-end">
                  <span className="text-sm text-gray-400 mb-2">Starts at</span>
                  <span className="text-5xl font-extrabold text-brand-900">$5,000</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Up to 25,000 contacts · Quoted per engagement</p>
              </div>
            </div>
            <a
              href="https://calendly.com/contactzen-joey/new-meeting"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary w-full block text-center text-base py-4 rounded-xl"
            >
              Book a 30-min scoping call
            </a>
            <p className="text-xs text-gray-400 text-center mt-3">
              No commitment on the call. We scope it together, then you decide.
            </p>
          </div>

          {/* Deliverables */}
          <div className="mb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-brand-900 mb-3">What you get</h2>
              <p className="text-gray-500">Four deliverables, built to move money before your next data vendor renewal.</p>
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
              <p className="text-gray-500">Scoping call to readout in under two weeks.</p>
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
              RevOps, CRO, and CFO teams at B2B sales orgs spending <strong>$50k+/year on data providers</strong> (ZoomInfo, Apollo, Cognism, LeadIQ). If your team is treating reachability as an assumption instead of a measurement, that&apos;s the gap we close.
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
              The hard part isn&apos;t deciding to audit.
            </h2>
            <p className="text-brand-200 text-lg mb-8 max-w-xl mx-auto">
              It&apos;s deciding to audit before your next data provider renewal. While there&apos;s still time to call your rep.
            </p>
            <a
              href="https://calendly.com/contactzen-joey/new-meeting"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-white text-brand-700 font-bold text-base px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors"
            >
              Book your scoping call
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
