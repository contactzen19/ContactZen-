"use client";
import { useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white text-base flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #7C3AED, #9F67FF)", boxShadow: "0 4px 14px rgba(124,58,237,0.25)" }}>
            ⚡
          </div>
          <span className="text-xl font-extrabold text-brand-900 tracking-tight">ContactZen</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app" className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors">
            Try the Tool
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors">
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
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 text-center">
      <div className="max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-full px-4 py-1.5 text-sm font-medium text-brand-700 mb-8">
          <span className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
          Built for RevOps &amp; Sales Leaders
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold text-brand-900 leading-tight tracking-tight mb-6">
          Your CRM is full of<br />
          <span style={{ background: "linear-gradient(135deg, #7C3AED, #9F67FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            bad data.
          </span>
          <br />We&apos;ll prove it in 60 seconds.
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          ContactZen scans your HubSpot contacts for invalid emails, dead phone numbers, duplicates, and missing fields — then shows you exactly what it&apos;s costing your team.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/app?demo=true"
            className="btn-primary text-base px-8 py-4 rounded-xl"
          >
            ✨ See a Live Demo
          </Link>
          <a
            href={`${API_URL}/auth/hubspot`}
            className="flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-brand-400 text-gray-700 font-semibold text-base px-8 py-4 rounded-xl transition-colors"
          >
            Connect HubSpot
          </a>
        </div>
        <p className="text-xs text-gray-400 mt-4">No credit card required · No data stored · Read-only access</p>
      </div>
    </section>
  );
}

function PainSection() {
  const stats = [
    { number: "28%", label: "of contacts flagged as high-risk in our own 25,000-contact scan" },
    { number: "45%", label: "of contacts had missing or invalid phone numbers" },
    { number: "1 in 3", label: "contacts had incomplete fields — no title, no company, or both" },
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-4">Bad data is a silent revenue killer</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Your reps are burning time on contacts that will never convert. Your emails are bouncing. Your data providers are selling you stale lists. Here&apos;s what we found when we ran ContactZen on a real 25,000-contact CRM database:
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((s) => (
            <div key={s.number} className="text-center p-8 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="text-4xl font-extrabold mb-2" style={{ background: "linear-gradient(135deg, #7C3AED, #9F67FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
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

function HowItWorks() {
  const steps = [
    {
      icon: "🔗",
      title: "Connect your CRM",
      desc: "Connect HubSpot directly via OAuth, or upload a CSV export from any CRM. Takes 30 seconds.",
    },
    {
      icon: "⚡",
      title: "ContactZen scans everything",
      desc: "We check every contact for email validity, phone quality, duplicates, field completeness, and source attribution.",
    },
    {
      icon: "📊",
      title: "Get your executive report",
      desc: "See your risk rate, ROI impact, worst offending sources, and a clean export — ready to act on immediately.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-4">How it works</h2>
          <p className="text-gray-500 text-lg">From connection to insight in under 60 seconds.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm">
              <div className="text-4xl mb-4">{step.icon}</div>
              <div className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-2">Step {i + 1}</div>
              <h3 className="text-lg font-bold text-brand-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  const items = [
    { icon: "🔒", title: "We never store your contacts", desc: "Your data is processed in memory and immediately discarded. Nothing is written to a database." },
    { icon: "👁️", title: "Read-only CRM access", desc: "ContactZen can only read your contacts. We cannot modify, delete, or export anything from your CRM." },
    { icon: "🛡️", title: "SOC 2-aligned architecture", desc: "Built from day one with security best practices. Process-and-discard data model minimizes your compliance surface." },
    { icon: "🔑", title: "Revoke access any time", desc: "You control the connection. Disconnect ContactZen from your HubSpot settings in one click, at any time." },
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-4">Built for trust</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Your contact data is sensitive. We designed ContactZen so you never have to wonder what happens to it.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => (
            <div key={item.title} className="flex gap-4 p-6 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="text-3xl flex-shrink-0">{item.icon}</div>
              <div>
                <h3 className="font-bold text-brand-900 mb-1">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await fetch("https://formspree.io/f/xykbydze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "landing-page" }),
    });
    setSubmitted(true);
    setSending(false);
  };

  return (
    <section className="py-24 px-6" style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}>
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-4xl font-extrabold text-white mb-4">
          Ready to see what&apos;s hiding in your CRM?
        </h2>
        <p className="text-brand-200 text-lg mb-10">
          Run a free scan on your demo data in 60 seconds, or connect your HubSpot and see your real numbers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
          <Link href="/app?demo=true" className="bg-white text-brand-700 font-bold text-base px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors">
            ✨ Try the Demo
          </Link>
          <a
            href="https://calendly.com/contactzen-joey/new-meeting"
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-white/40 text-white font-bold text-base px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
          >
            Book a Call
          </a>
        </div>
        {submitted ? (
          <p className="text-brand-200 font-medium">You&apos;re on the list — I&apos;ll be in touch soon. 🎉</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
            <input
              type="email"
              required
              placeholder="your@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none"
            />
            <button
              type="submit"
              disabled={sending}
              className="bg-brand-400 hover:bg-brand-300 text-white font-semibold text-sm px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {sending ? "…" : "Notify Me"}
            </button>
          </form>
        )}
        <p className="text-brand-300 text-xs mt-3">No spam. Just product updates and early access invites.</p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-brand-900 py-8 px-6 text-center">
      <p className="text-brand-400 text-sm">
        © 2026 ContactZen · Contact Data Intelligence Platform ·{" "}
        <a href="mailto:contactzen.joey@gmail.com" className="hover:text-white transition-colors">
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
      <PainSection />
      <HowItWorks />
      <TrustSection />
      <CTASection />
      <Footer />
    </div>
  );
}
