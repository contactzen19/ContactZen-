import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy & Data Retention | ReachAudit",
  description:
    "Exactly what ReachAudit does with your data. No legal fog, just the actual rules the system runs on.",
};

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
          <span className="text-xl font-extrabold text-brand-900 tracking-tight">
            ReachAudit
          </span>
        </Link>
        <Link
          href="/app"
          className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
        >
          Free score
        </Link>
      </div>
    </nav>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="text-2xl font-extrabold text-brand-900 mb-4">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-4">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        <h1 className="text-4xl font-extrabold text-brand-900 mb-4">
          How we handle your data
        </h1>
        <p className="text-gray-500 text-lg mb-12">
          ReachAudit exists because contact data gets treated carelessly. Here
          is exactly what we do with yours. No legal fog, just the actual rules
          the system runs on.
        </p>

        <Section title="The free tool">
          <p>
            Your list is processed in memory and discarded the moment your
            score finishes. We keep only the summary numbers that make up your
            report, never the contacts themselves. Quick checks need no signup.
            Whole-list scores take an email address so the free tool stays
            free, and that email is used to send you your score, not to spam
            you.
          </p>
        </Section>

        <Section title="Paid audits and your customer portal">
          <p>
            When you become a customer, some things are worth keeping, and
            keeping them is part of what you pay for:
          </p>
          <p>
            <strong className="text-brand-900">What we retain.</strong> Your
            audit reports, scores, monthly deltas, and compliance records
            (like Do Not Call scrub documentation) live in your portal for as
            long as you are a customer. That is the point of the portal: your
            history and your compliance evidence, in one place, when you need
            it. If a regulator or carrier ever asks, your scrub records are
            right there.
          </p>
          <p>
            <strong className="text-brand-900">What we do not retain.</strong>{" "}
            Your contact lists themselves are transit files. They exist while
            we run your audit and deliver your results, then they are purged
            from our systems within 7 days. Downloads of contact-level files
            use expiring links. After the purge window you can request a fresh
            copy and we regenerate it from a new run, not from a stored copy.
          </p>
          <p>
            <strong className="text-brand-900">
              Where the canonical copies live.
            </strong>{" "}
            Your deliverables are also kept offline in your client file with
            us. Nothing about your business is ever published, shared, or
            sold. Client names and contact records never appear in our
            marketing, in any form.
          </p>
        </Section>

        <Section title="What we never do">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              We never sell your data or share it with anyone outside the
              services that run ReachAudit.
            </li>
            <li>
              We never keep your contact lists beyond the 7-day delivery
              window.
            </li>
            <li>We never use your contacts for our own outreach.</li>
            <li>
              We never publish client names or client records, even anonymized
              ones.
            </li>
          </ul>
        </Section>

        <Section title="The services that run ReachAudit">
          <p>
            Your data touches a short list of infrastructure providers, each
            for one job: ZeroBounce (email verification), Supabase (secure
            hosting and sign-in), Vercel (this website), and Resend (the
            emails we send you). None of them may use your data for anything
            except running our service.
          </p>
        </Section>

        <Section title="Questions">
          <p>
            Reply to any email from us, or write{" "}
            <a
              href="mailto:joey@reachaudit.com"
              className="text-brand-600 underline"
            >
              joey@reachaudit.com
            </a>
            . You will get Joey, not a ticket queue.
          </p>
        </Section>
      </main>
      <footer className="bg-brand-900 py-8 px-6 text-center">
        <p className="text-brand-400 text-sm">
          © 2026 ReachAudit ·{" "}
          <Link href="/" className="hover:text-white transition-colors">
            Home
          </Link>{" "}
          ·{" "}
          <a
            href="mailto:joey@reachaudit.com"
            className="hover:text-white transition-colors"
          >
            joey@reachaudit.com
          </a>
        </p>
      </footer>
    </div>
  );
}
