import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Zap,
  AlertCircle,
  TrendingDown,
  DollarSign,
  Mail,
  Phone,
  Copy,
  Target,
  Calendar,
  CheckCircle2,
  FileText,
  ArrowDown,
} from "lucide-react";
import { getAuditReport, getAllAuditSlugs, type AuditReport } from "@/lib/audit-reports";

export function generateStaticParams() {
  return getAllAuditSlugs().map((slug) => ({ slug }));
}

const fmtPct = (x: number) => `${(x * 100).toFixed(1)}%`;
const fmtNum = (x: number) => x.toLocaleString();
const fmtMoney = (x: number) => `$${Math.round(x).toLocaleString()}`;

function MinimalNav() {
  return (
    <nav className="border-b border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #7C3AED, #9F67FF)",
              boxShadow: "0 4px 14px rgba(124,58,237,0.25)",
            }}
          >
            <Zap className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold text-brand-900 tracking-tight leading-none">
              ReachAudit
            </span>
            <span className="text-xs text-gray-400 leading-tight">Independent Reachability Audit</span>
          </div>
        </Link>
        <a
          href="https://calendly.com/contactzen-joey/new-meeting"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary text-sm px-4 py-2"
        >
          Book Your Audit
        </a>
      </div>
    </nav>
  );
}

function SampleContextBanner() {
  const expectations = [
    {
      label: "Credit-recapture documentation",
      desc: "Defensible evidence for your next data vendor renewal — typically 20-25% of contract value",
    },
    {
      label: "Vendor-by-vendor attribution",
      desc: "Which data source contributes what % of bad data — ZoomInfo, Apollo, LinkedIn, organic",
    },
    {
      label: "Dollarized ROI math",
      desc: "Rep time, vendor waste, pipeline exposure — methodology your CFO can defend",
    },
    {
      label: "Cleanup-ready suppression list",
      desc: "CSV of every flagged contact with reason — ready to act on the day you receive it",
    },
  ];

  return (
    <section className="bg-amber-50 border-b-2 border-amber-200 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-amber-700" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-1">
              Sample Audit · For Illustration Only
            </p>
            <h2 className="text-2xl font-extrabold text-amber-950 leading-tight mb-3">
              This is what a ReachAudit deliverable looks like.
            </h2>
            <p className="text-amber-900 leading-relaxed max-w-3xl">
              The audit below was prepared for a fictional mid-market B2B logistics company —{" "}
              <strong>Northstar Logistics</strong> — to show format, structure, and methodology. After a 5-day
              ReachAudit engagement on your own contact database, you&apos;d receive the same deliverable, fully
              branded and based on your real data.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {expectations.map((e) => (
            <div key={e.label} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-950">{e.label}</p>
                <p className="text-xs text-amber-800">{e.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <a
            href="https://calendly.com/contactzen-joey/new-meeting"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            Book Your Own Audit
          </a>
          <div className="text-sm text-amber-700 font-medium flex items-center gap-1.5">
            <ArrowDown className="w-4 h-4" />
            Scroll to see the sample
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportHeader({ report }: { report: AuditReport }) {
  return (
    <div className="border-b border-gray-100 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center gap-5 mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl tracking-tight"
            style={{ backgroundColor: report.customer.logoColor }}
          >
            {report.customer.logoText}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-600 mb-1">
              Reachability Audit
            </p>
            <h1 className="text-3xl font-extrabold text-brand-900 leading-tight">
              {report.customer.name}
            </h1>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Prepared for</p>
            <p className="text-gray-700 font-medium">{report.preparedFor}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Prepared by</p>
            <p className="text-gray-700 font-medium">{report.auditor}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Date</p>
            <p className="text-gray-700 font-medium flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              {report.preparedDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeadlineImpact({ report }: { report: AuditReport }) {
  return (
    <section className="px-6 py-14">
      <div className="max-w-5xl mx-auto">
        <div
          className="rounded-3xl p-10 text-white"
          style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-brand-300" />
            <p className="text-xs font-bold uppercase tracking-widest text-brand-300">Headline Finding</p>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4">{report.headline}</h2>
          <p className="text-brand-200 text-lg leading-relaxed max-w-3xl">{report.subheadline}</p>
          <div className="mt-8 pt-8 border-t border-white/20 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-300 mb-1">Database Size</p>
              <p className="text-2xl font-extrabold">{fmtNum(report.databaseSize)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-300 mb-1">Unreachable Rate</p>
              <p className="text-2xl font-extrabold">{fmtPct(report.metrics.contactRiskRate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-300 mb-1">Dollarized Waste</p>
              <p className="text-2xl font-extrabold">{fmtMoney(report.roi.totalAnnualImpact)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-300 mb-1">Pipeline at Risk</p>
              <p className="text-2xl font-extrabold">{fmtMoney(report.roi.pipelineAtRisk)}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function KeyMetrics({ report }: { report: AuditReport }) {
  const tiles = [
    {
      icon: Mail,
      label: "Invalid Contacts",
      value: fmtNum(report.metrics.invalidContacts),
      sub: `${fmtPct(report.metrics.contactRiskRate)} of database`,
      tone: "danger" as const,
    },
    {
      icon: Phone,
      label: "Phone Risk Rate",
      value: fmtPct(report.metrics.phoneRiskRate),
      sub: "Invalid or shared-line",
      tone: "warning" as const,
    },
    {
      icon: Copy,
      label: "Duplicate Records",
      value: fmtNum(report.metrics.duplicates),
      sub: "Across all sources",
      tone: "warning" as const,
    },
    {
      icon: Target,
      label: "Completeness Score",
      value: `${report.metrics.completenessScore}/100`,
      sub: "Field coverage",
      tone: "neutral" as const,
    },
  ];

  const toneStyles = {
    danger: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-600", value: "text-red-700" },
    warning: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", value: "text-amber-700" },
    neutral: { bg: "bg-brand-50", border: "border-brand-200", icon: "text-brand-600", value: "text-brand-900" },
  };

  return (
    <section className="px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-extrabold text-brand-900 mb-2">What we measured</h2>
        <p className="text-gray-500 mb-8">
          Across {fmtNum(report.databaseSize)} contacts in your CRM, scored against email deliverability,
          phone reachability, duplication, and field completeness.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tiles.map((t) => {
            const Icon = t.icon;
            const s = toneStyles[t.tone];
            return (
              <div key={t.label} className={`rounded-2xl border p-5 ${s.bg} ${s.border}`}>
                <Icon className={`w-5 h-5 mb-3 ${s.icon}`} />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t.label}</p>
                <p className={`text-2xl font-extrabold ${s.value} mb-0.5`}>{t.value}</p>
                <p className="text-xs text-gray-500">{t.sub}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SourceAttribution({ report }: { report: AuditReport }) {
  const totalBad = report.sources.reduce((sum, s) => sum + Math.round(s.contactCount * s.badRate), 0);
  const totalCredit = report.sources.reduce((sum, s) => sum + (s.creditEligible ?? 0), 0);

  return (
    <section className="px-6 py-12 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
          <div>
            <h2 className="text-2xl font-extrabold text-brand-900 mb-2">Source attribution</h2>
            <p className="text-gray-500 max-w-2xl">
              Where the bad data is coming from. This is the credit-recapture money shot — provably bad records
              per vendor, eligible for credit claims under your enterprise SLA.
            </p>
          </div>
          {totalCredit > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-700 mb-1">
                Est. Credit Recoverable
              </p>
              <p className="text-2xl font-extrabold text-green-700">{fmtMoney(totalCredit)}</p>
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-12 px-6 py-3 border-b border-gray-100 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-500">
            <div className="col-span-4">Source</div>
            <div className="col-span-2 text-right">Contacts</div>
            <div className="col-span-2 text-right">Bad Rate</div>
            <div className="col-span-2 text-right">Annual Spend</div>
            <div className="col-span-2 text-right">Credit Eligible</div>
          </div>
          {report.sources.map((s) => {
            const badContacts = Math.round(s.contactCount * s.badRate);
            const barColor =
              s.badRate >= 0.35 ? "#EF4444" : s.badRate >= 0.2 ? "#F97316" : s.badRate >= 0.1 ? "#F59E0B" : "#22C55E";
            return (
              <div key={s.name} className="border-b border-gray-100 last:border-0">
                <div className="grid grid-cols-12 px-6 py-4 items-center">
                  <div className="col-span-4 font-semibold text-brand-900">{s.name}</div>
                  <div className="col-span-2 text-right text-sm text-gray-600">{fmtNum(s.contactCount)}</div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-bold" style={{ color: barColor }}>
                      {fmtPct(s.badRate)}
                    </span>
                    <p className="text-xs text-gray-400">{fmtNum(badContacts)} bad</p>
                  </div>
                  <div className="col-span-2 text-right text-sm text-gray-600">
                    {s.annualSpend ? fmtMoney(s.annualSpend) : "—"}
                  </div>
                  <div className="col-span-2 text-right">
                    {s.creditEligible ? (
                      <span className="text-sm font-bold text-green-700">{fmtMoney(s.creditEligible)}</span>
                    ) : (
                      <span className="text-sm text-gray-300">—</span>
                    )}
                  </div>
                </div>
                <div className="px-6 pb-4">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${s.badRate * 100}%`, background: barColor, opacity: 0.85 }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3 italic">
          Total bad records: {fmtNum(totalBad)} across all sources.
        </p>
      </div>
    </section>
  );
}

function ROIBreakdown({ report }: { report: AuditReport }) {
  const tiles = [
    {
      icon: TrendingDown,
      label: "Rep Time Wasted",
      value: report.roi.repTimeWasted,
      sub: `${report.roi.repCount} reps × $75K × 5% time redirected from dead-end outreach`,
    },
    {
      icon: DollarSign,
      label: "Data Vendor Waste",
      value: report.roi.dataVendorWaste,
      sub: "Paid for contacts you can't reach",
    },
    {
      icon: AlertCircle,
      label: "Pipeline at Risk",
      value: report.roi.pipelineAtRisk,
      sub: `${report.roi.repCount} reps × ${fmtMoney(report.roi.avgPipelinePerRep)} avg pipeline`,
      large: true,
    },
  ];

  return (
    <section className="px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-extrabold text-brand-900 mb-2">ROI levers</h2>
        <p className="text-gray-500 mb-8 max-w-2xl">
          Three numbers your CFO will ask for. Each one methodology-defended, each one independent of vendor
          claims.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.label}
                className={`rounded-2xl border border-gray-100 p-6 bg-white shadow-sm ${t.large ? "md:col-span-1" : ""}`}
              >
                <Icon className="w-5 h-5 text-brand-600 mb-3" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.label}</p>
                <p className="text-3xl font-extrabold text-brand-900 mb-2">{fmtMoney(t.value)}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{t.sub}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 rounded-2xl bg-brand-50 border border-brand-200 p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700 mb-1">
              Total Annual Impact
            </p>
            <p className="text-3xl font-extrabold text-brand-900">{fmtMoney(report.roi.totalAnnualImpact)}</p>
          </div>
          <p className="text-sm text-brand-700 max-w-md">
            Sum of recoverable rep capacity + data vendor waste. Pipeline exposure is shown separately as
            opportunity cost — not double-counted here.
          </p>
        </div>
      </div>
    </section>
  );
}

function FlaggedSample({ report }: { report: AuditReport }) {
  return (
    <section className="px-6 py-12 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-extrabold text-brand-900 mb-2">Flagged contacts — sample</h2>
        <p className="text-gray-500 mb-6 max-w-2xl">
          A representative sample of records flagged as invalid or risky. Full suppression list delivered as
          CSV with each engagement.
        </p>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Risk</th>
                  <th className="px-5 py-3">Reason</th>
                  <th className="px-5 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {report.flaggedSample.map((c) => (
                  <tr key={c.email} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-700">{c.email}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.risk === "invalid" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {c.risk}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{c.reason}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{c.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3 italic">
          Showing {report.flaggedSample.length} of {fmtNum(report.metrics.invalidContacts)} flagged records.
        </p>
      </div>
    </section>
  );
}

function Recommendations({ report }: { report: AuditReport }) {
  const styles: Record<string, { bg: string; border: string; pill: string; text: string }> = {
    critical: {
      bg: "bg-red-50",
      border: "border-red-200",
      pill: "bg-red-100 text-red-700",
      text: "text-red-900",
    },
    high: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      pill: "bg-amber-100 text-amber-700",
      text: "text-amber-900",
    },
    medium: {
      bg: "bg-brand-50",
      border: "border-brand-200",
      pill: "bg-brand-100 text-brand-700",
      text: "text-brand-900",
    },
  };

  return (
    <section className="px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-extrabold text-brand-900 mb-2">Recommended actions</h2>
        <p className="text-gray-500 mb-8 max-w-2xl">
          Ranked by estimated impact. Critical actions should be taken before your next data vendor renewal
          conversation.
        </p>
        <div className="space-y-4">
          {report.recommendations.map((rec, i) => {
            const s = styles[rec.priority];
            return (
              <div key={i} className={`rounded-2xl border p-6 ${s.bg} ${s.border}`}>
                <div className="flex items-start gap-4">
                  <div className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${s.pill}`}>
                    {rec.priority}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                      <h3 className={`font-bold ${s.text} leading-snug`}>{rec.title}</h3>
                      <p className={`text-sm font-bold whitespace-nowrap ${s.text}`}>
                        {fmtMoney(rec.estimatedImpact)}
                      </p>
                    </div>
                    <p className={`text-sm leading-relaxed opacity-80 ${s.text}`}>{rec.why}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function NextSteps({ report }: { report: AuditReport }) {
  return (
    <section className="px-6 py-16">
      <div className="max-w-3xl mx-auto">
        <div
          className="rounded-3xl p-10 text-white text-center"
          style={{ background: "linear-gradient(135deg, #1E1B4B, #7C3AED)" }}
        >
          <CheckCircle2 className="w-10 h-10 text-brand-300 mx-auto mb-4" />
          <h2 className="text-2xl font-extrabold mb-4">Next steps</h2>
          <p className="text-brand-200 leading-relaxed mb-8 max-w-2xl mx-auto">{report.nextSteps.summary}</p>
          <a
            href={report.nextSteps.calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-brand-700 font-bold px-8 py-4 rounded-xl hover:bg-brand-50 transition-colors"
          >
            Schedule a follow-up
          </a>
        </div>
      </div>
    </section>
  );
}

function ReportFooter({ report }: { report: AuditReport }) {
  return (
    <footer className="border-t border-gray-100 bg-white px-6 py-8">
      <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
        <p className="text-xs text-gray-500">
          Audit prepared by {report.auditor}. Methodology available on request. © 2026 ReachAudit.
        </p>
        <Link href="/" className="text-xs text-brand-600 hover:underline">
          Learn about ReachAudit →
        </Link>
      </div>
    </footer>
  );
}

export default async function AuditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = getAuditReport(slug);

  if (!report) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <MinimalNav />
      {report.isSample && <SampleContextBanner />}
      <ReportHeader report={report} />
      <HeadlineImpact report={report} />
      <KeyMetrics report={report} />
      <SourceAttribution report={report} />
      <ROIBreakdown report={report} />
      <FlaggedSample report={report} />
      <Recommendations report={report} />
      <NextSteps report={report} />
      <ReportFooter report={report} />
    </div>
  );
}
