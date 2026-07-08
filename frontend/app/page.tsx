"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ShoppingCart,
  RefreshCw,
  Phone,
  Lock,
  Eye,
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
          <img
            src="/ra-logo.png"
            alt=""
            className="w-9 h-9 flex-shrink-0"
            style={{ filter: "drop-shadow(0 4px 14px rgba(124,58,237,0.25))" }}
          />
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
            Free score
          </Link>
          <Link
            href="/sample"
            className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
          >
            Sample
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
          >
            Pricing
          </Link>
          <a
            href="https://calendly.com/joey-reachaudit/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary text-sm px-4 py-2"
          >
            Book a call
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
              Free score
            </Link>
            <Link
              href="/sample"
              className="text-base font-medium text-gray-700 hover:text-brand-600 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Sample
            </Link>
            <Link
              href="/pricing"
              className="text-base font-medium text-gray-700 hover:text-brand-600 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </Link>
            <a
              href="https://calendly.com/joey-reachaudit/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary text-sm px-4 py-2 text-center"
              onClick={() => setIsOpen(false)}
            >
              Book a call
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
          Monthly reachability and compliance
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
        <p className="text-lg md:text-xl font-semibold text-brand-900 max-w-2xl mx-auto mb-4">
          Valid means the record looks right. Reachable means a real person answers.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            href="/app"
            className="btn-primary text-base px-8 py-4 rounded-xl inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            Score your list free
          </Link>
          <Link
            href="/sample"
            className="flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-brand-400 text-gray-700 font-semibold text-base px-8 py-4 rounded-xl transition-colors"
          >
            See a sample
          </Link>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          No signup · No data stored · Takes a minute
        </p>
      </div>
    </section>
  );
}

function ReachableDefinition() {
  const checks = [
    {
      n: 1,
      title: "The email lands",
      desc: "A live mailbox a real person reads. Not an address that just looks right. Dead domains and abandoned inboxes fail this check.",
    },
    {
      n: 2,
      title: "The phone rings",
      desc: "A working number with a person on the other end, flagged cell or landline. Disconnected and dead lines fail this check.",
    },
    {
      n: 3,
      title: "You're allowed to reach out",
      desc: "Not on the National Do Not Call registry, with a dated record proving you checked before you dialed.",
    },
  ];

  return (
    <section className="py-16 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-3">
            So what counts as reachable?
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            A lead is reachable when a real person would answer if you reached out today. That takes passing all three checks.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {checks.map((c) => (
            <div key={c.n} className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-8 h-8 rounded-full bg-brand-600 text-white text-sm font-bold flex items-center justify-center mb-3">
                {c.n}
              </div>
              <h3 className="font-bold text-brand-900 mb-1">{c.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-500 text-base mt-8 max-w-2xl mx-auto">
          Miss any one of the three and that lead costs your team time and revenue.
        </p>
      </div>
    </section>
  );
}

function ProductPreview() {
  const metrics = [
    { label: "Leads scored", value: "4,015", sub: "your uploaded list" },
    { label: "Reachable now", value: "3,733", sub: "ready to work", highlight: true },
    { label: "On Do Not Call", value: "8", sub: "flagged to skip" },
    { label: "No cell on file", value: "2,586", sub: "no number to call" },
  ];

  const reachBreakdown = [
    { label: "Not on Do Not Call", value: "4,007" },
    { label: "Live email", value: "3,694" },
    { label: "On Do Not Call (flagged)", value: "8" },
  ];

  // Fictional placeholder names — never real client contacts, even masked.
  const callFirst = [
    { rank: 1, name: "Marisol R.", city: "Saint Paul", action: "Call + email" },
    { rank: 2, name: "Desmond K.", city: "Saint Paul", action: "Call + email" },
    { rank: 3, name: "Annika L.", city: "Minneapolis", action: "Call + email" },
  ];

  return (
    <section className="py-20 px-6 bg-gray-50 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-3">
            What your free score shows you.
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            An example from a real audit. Every number here comes from a real client&apos;s list, not a guess. Your score is measured on your own file.
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
                  className={`rounded-xl p-4 border ${m.highlight ? "bg-green-50 border-green-200" : "bg-white border-gray-100"}`}
                >
                  <p className="text-xs text-gray-400 font-medium mb-1">{m.label}</p>
                  <p className={`text-2xl font-extrabold ${m.highlight ? "text-green-600" : "text-brand-900"}`}>{m.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Who to call first */}
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Who to call first</p>
                <div className="space-y-2">
                  {callFirst.map((c) => (
                    <div key={c.rank} className="flex items-center justify-between border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-brand-600 w-4">{c.rank}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-700">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.city}</p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-green-600">{c.action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reachable summary */}
              <div className="rounded-xl p-4 text-white space-y-3" style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-300">Reachable right now</p>
                <p className="text-4xl font-extrabold">3,733</p>
                <p className="text-brand-200 text-xs">of 4,015 leads</p>
                <div className="border-t border-white/20 pt-3 space-y-1.5">
                  {reachBreakdown.map((b) => (
                    <div key={b.label} className="flex justify-between text-sm">
                      <span className="text-brand-200">{b.label}</span>
                      <span className="font-semibold">{b.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top of call list sample */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Top of your call list · Sample</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Name</th>
                      <th className="pb-2 font-medium hidden sm:table-cell">City</th>
                      <th className="pb-2 font-medium hidden md:table-cell">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callFirst.map((c) => (
                      <tr key={c.rank} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-xs font-bold text-brand-600">{c.rank}</td>
                        <td className="py-2 text-sm text-gray-600">{c.name}</td>
                        <td className="py-2 text-xs text-gray-500 hidden sm:table-cell">{c.city}</td>
                        <td className="py-2 hidden md:table-cell">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            {c.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-400 mb-4">Want this on your own list? Score it free, or book a call to keep it handled.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/app"
              className="btn-primary px-6 py-3 text-sm font-semibold rounded-xl inline-block"
            >
              Score your list free →
            </Link>
            <a
              href="https://calendly.com/joey-reachaudit/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-6 py-3 text-sm font-semibold rounded-xl inline-block"
            >
              Book a call
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

type MonthlyItem = {
  title: string;
  desc: string;
};

function MonthlySection() {
  const items: MonthlyItem[] = [
    {
      title: "Do Not Call scrub",
      desc: "Every number checked against the National registry and re-checked every 30 days, with a dated record. Dial knowing you're clean.",
    },
    {
      title: "A clean, current list",
      desc: "Dead emails and bad numbers flagged, so your time goes to people you can actually reach.",
    },
    {
      title: "Who to call first",
      desc: "Everyone ranked top to bottom, so your best prospects are always at the top of the list.",
    },
    {
      title: "The rules, handled",
      desc: "Plain guidance on how to call and text this list the right way, so you reach out with confidence.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-4">
            Your team sells. We handle the data.
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Dead numbers, stale emails, and Do Not Call checks should never be a salesperson&apos;s job. We take the data work off your team&apos;s plate so their day goes to people they can actually close. And because lists age and the registry changes, we keep it handled month after month.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.title}
              className="p-6 rounded-2xl bg-gray-50 border border-gray-100"
            >
              <h3 className="font-bold text-brand-900 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
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
      icon: ShoppingCart,
      title: "You buy the leads",
      desc: "From wherever you already buy, or the book of contacts you already have. We don't sell leads and we don't pick your list.",
    },
    {
      icon: RefreshCw,
      title: "We handle the rest",
      desc: "Every email checked live, every phone flagged cell or landline, dead lines and dead inboxes pulled out. Every number runs against the Do Not Call registry with a dated record you can point to. Then the whole list gets ranked by who to call first and kept current every 30 days.",
    },
    {
      icon: Phone,
      title: "You just call",
      desc: "You get a clean, ranked list that's safe to call. Start at the top and work down.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-4">How it works</h2>
          <p className="text-gray-500 text-lg">You buy the leads. We do the rest.</p>
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

function WhoWeHelp() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-4">Who we help</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Different desks, same problem: nobody has time to babysit lead data.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">
              The owner who buys leads
            </p>
            <p className="text-gray-600 text-sm leading-relaxed flex-1">
              You run the shop, take care of customers, and buy leads because there&apos;s no time to prospect. There&apos;s definitely no time to figure out which of those leads are callable, who&apos;s on the Do Not Call list, and who you can legally text. We hand you a clean, ranked, compliant list. You just call. One agency owner brought us 4,015 purchased leads; we flagged the 8 Do Not Call numbers hiding in them and handed back 3,733 she could work that same day.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-3">
              The shop with a sales team
            </p>
            <p className="text-gray-600 text-sm leading-relaxed flex-1">
              You&apos;ve got producers on the phones and years of contacts sitting in the CRM, and nobody knows which half of it is dead. We score the whole book for reachability, flag what&apos;s gone, and hand your data back clean enough to trust. That matters double if you&apos;re putting AI on top of your pipeline: AI on dirty data is just faster wrong answers.
            </p>
          </div>
          <div className="p-8 rounded-2xl bg-brand-900 border border-brand-900 flex flex-col">
            <p className="text-xs font-bold uppercase tracking-widest text-brand-300 mb-3">
              Why I built this
            </p>
            <p className="text-brand-100 text-sm leading-relaxed flex-1">
              &ldquo;I&apos;ve spent a decade in sales, and everywhere I went the CRM data was a mess and adding legit prospects to the pool was the biggest hurdle. For the last few years I lived it weekly: pull 500 plus contacts from the data enrichment companies, craft the best outreach I could, then watch 1 in 4 of them turn out to be dead on arrival. Time wasted, money wasted, no good solution. So I built it. ReachAudit is the referee I wished existed: independent, on your side of the table, with no leads to sell you.&rdquo;
            </p>
            <p className="text-brand-300 text-sm font-semibold mt-4">Joey Prindle, Founder</p>
          </div>
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
      title: "We never store your list",
      desc: "Your leads are processed in memory and immediately discarded. We keep only the summary numbers for your report, never your contacts.",
    },
    {
      icon: Eye,
      title: "We work for you, not the seller",
      desc: "We don't sell you leads or pick your vendor. We're the outside check on the list you already own.",
    },
    {
      icon: Key,
      title: "You own the calls",
      desc: "We get the list and the plan ready and keep it clean. You pick up the phone. Your customers, your relationships.",
    },
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-4">Where we stand</h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Your leads are yours. We designed ReachAudit so you don&apos;t have to wonder.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

function FAQSection() {
  const faqs = [
    {
      q: "Do I have to buy leads from you?",
      a: (
        <p>
          No. You buy your leads wherever you already do. We&apos;re the step right after, the one that keeps them clean, compliant, and ranked so you know who to call first. We don&apos;t sell leads and we don&apos;t pick your vendor.
        </p>
      ),
    },
    {
      q: "How do you handle Do Not Call compliance?",
      a: (
        <p>
          We check every number against the National Do Not Call registry, re-check it every 30 days, and hand you a dated record. We flag what&apos;s on the list so you skip it. The decision to call stays with you, which keeps the compliance call where it belongs.
        </p>
      ),
    },
    {
      q: "Is this just an email checker?",
      a: (
        <p>
          No. An email checker tells you whether an address is valid. We tell you who&apos;s actually reachable across email and phone, who to call first, and we keep the whole list compliant and current every month.
        </p>
      ),
    },
    {
      q: "Do you store my list?",
      a: (
        <p>
          No. Your contact records are never stored. Your file is processed in memory and discarded the moment the score finishes. We keep only the summary numbers for your report, never the contacts themselves.
        </p>
      ),
    },
    {
      q: "What does it cost?",
      a: (
        <p>
          The free score covers up to 500 contacts. A one-time audit is $199 for lists up to 5,000 contacts. If you want it kept clean and compliant every month, that&apos;s a monthly plan priced by your list size. No commitment to try it.
        </p>
      ),
    },
  ];

  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-brand-900 mb-4">
            Common questions
          </h2>
          <p className="text-gray-500 text-lg">
            What everyone asks first.
          </p>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
              open={i === 0}
            >
              <summary className="cursor-pointer list-none px-6 py-5 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                <span className="font-bold text-brand-900 text-base">{faq.q}</span>
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 text-sm font-bold transition-transform group-open:rotate-45"
                  aria-hidden="true"
                >
                  +
                </span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 text-sm leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
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
          See what your list is really worth.
        </h2>
        <p className="text-brand-200 text-lg mb-10">
          Score up to 500 contacts free, in about a minute. If you want the whole list handled, that&apos;s what we do.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Link
            href="/app"
            className="bg-white text-brand-700 font-bold text-base px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors"
          >
            Score your list free
          </Link>
          <a
            href="https://calendly.com/joey-reachaudit/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-white/40 text-white font-bold text-base px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
          >
            Book a call
          </a>
        </div>
        <p className="text-white/50 text-xs">
          No signup · No data stored · Takes a minute
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-brand-900 py-8 px-6 text-center">
      <p className="text-brand-400 text-sm">
        © 2026 ReachAudit · Clean, compliant, and ranked. ·{" "}
        <a
          href="mailto:joey@reachaudit.com"
          className="hover:text-white transition-colors"
        >
          joey@reachaudit.com
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
      <ReachableDefinition />
      <ProductPreview />
      <MonthlySection />
      <HowItWorks />
      <WhoWeHelp />
      <TrustSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
