"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import {
  myClients, listAudits, listDocs,
  PortalClient, PortalAudit, PortalDoc,
} from "@/lib/portal";

// Date-only strings (e.g. "2026-08-11") must parse as LOCAL midnight, not
// UTC, or they render a day early in US timezones.
const parseDate = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);

const fmtDate = (iso: string) =>
  parseDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const fmtStamp = (stamp: string) => {
  const [y, m] = stamp.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

const daysUntil = (d: string) =>
  Math.ceil((parseDate(d).getTime() - Date.now()) / 86400000);

const prettyDoc = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("report")) return "Audit report";
  if (n.includes("compliance")) return "Compliance record";
  if (n.includes("roadmap")) return "Action roadmap";
  if (n.includes("evidence")) return "Evidence CSV";
  return name;
};

function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const sb = getSupabase();
    if (!sb) { setError("Sign-in isn't configured yet."); setLoading(false); return; }
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/portal` },
    });
    if (error) setError(error.message); else setSent(true);
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto card space-y-5 mt-12">
      <div>
        <h1 className="text-xl font-bold text-brand-900">Customer portal</h1>
        <p className="text-sm text-gray-500 mt-1">
          Your audit history, downloads, and next rescrub date. No password — we email you a sign-in link.
        </p>
      </div>
      {sent ? (
        <div className="bg-brand-50 border border-brand-200 rounded-xl px-5 py-4 text-center space-y-2">
          <p className="text-2xl">📬</p>
          <p className="font-semibold text-brand-900">Check your email</p>
          <p className="text-sm text-gray-500">
            We sent a sign-in link to <strong>{email}</strong>. Click it and you&apos;ll land right back here.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Work email</label>
            <input
              type="email"
              required
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm">
            {loading ? "Sending…" : "Email me a sign-in link →"}
          </button>
          <p className="text-xs text-gray-400 text-center">
            Use the email address your audits are delivered to.
          </p>
        </form>
      )}
    </div>
  );
}

function AuditRow({ audit }: { audit: PortalAudit }) {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<PortalDoc[] | null>(null);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && docs === null) {
      setDocs(await listDocs(audit.client_id, audit.stamp));
    }
  };

  const v = audit.verdicts ?? {};
  const d = audit.delta;

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-brand-900">{fmtStamp(audit.stamp)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Published {fmtDate(audit.published_at)}</p>
        </div>
        {audit.score != null && (
          <div className="text-right shrink-0">
            <p className="text-2xl font-extrabold text-brand-900">{audit.score}</p>
            <p className="text-xs text-gray-400 -mt-0.5">reachability</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Reachable", value: v["Reachable"] },
          { label: "At-risk", value: v["At-risk"] },
          { label: "Dead", value: v["Dead"] },
        ].map((m) => (
          <div key={m.label} className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-xs text-gray-400 font-medium">{m.label}</p>
            <p className="text-sm font-bold text-brand-900 mt-0.5">
              {m.value != null ? m.value.toLocaleString() : "—"}
            </p>
          </div>
        ))}
      </div>

      {d && (d.went_dead != null || d.new_dnc != null || d.email_died != null) && (
        <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
          Since {d.previous ? fmtStamp(d.previous) : "last month"}:{" "}
          {[
            d.email_died != null && `${d.email_died} emails died`,
            d.new_dnc != null && `${d.new_dnc} numbers joined the DNC registry`,
            d.went_dead != null && `${d.went_dead} contacts went dead`,
          ].filter(Boolean).join(", ")}.
        </p>
      )}

      <button onClick={toggle} className="btn-secondary text-xs px-4 py-2">
        {open ? "Hide downloads" : "Downloads"}
      </button>

      {open && (
        <div className="space-y-2">
          {docs === null && <p className="text-xs text-gray-400">Loading…</p>}
          {docs !== null && docs.length === 0 && (
            <p className="text-xs text-gray-400">
              No files yet for this month. If you expected some, reply to your delivery email.
            </p>
          )}
          {docs?.map((doc) =>
            doc.url ? (
              <a
                key={doc.bucket + doc.name}
                href={doc.url}
                className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-xl px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-brand-900">{prettyDoc(doc.name)}</span>
                <span className="text-xs text-gray-400">{doc.name}</span>
              </a>
            ) : (
              <div
                key={doc.bucket + doc.name}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 text-sm"
              >
                <span className="font-medium text-gray-500">{prettyDoc(doc.name)}</span>
                <span className="text-xs text-gray-400">request download — reply to your delivery email</span>
              </div>
            )
          )}
          <p className="text-xs text-gray-400">
            Contact-level files (evidence, roadmap) are kept for a few days after delivery, then purged.
            Your reports and compliance records stay here permanently.
          </p>
        </div>
      )}
    </div>
  );
}

export default function PortalPage() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [clients, setClients] = useState<PortalClient[]>([]);
  const [active, setActive] = useState<PortalClient | null>(null);
  const [audits, setAudits] = useState<PortalAudit[]>([]);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setConfigured(false); setLoading(false); return; }
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setAuthed(true);
      const cs = await myClients();
      setClients(cs);
      if (cs.length > 0) {
        setActive(cs[0]);
        setAudits(await listAudits(cs[0].id));
      }
      setLoading(false);
    });
  }, []);

  const switchClient = async (c: PortalClient) => {
    setActive(c);
    setAudits(await listAudits(c.id));
  };

  const handleSignOut = async () => {
    await getSupabase()?.auth.signOut();
    window.location.href = "/portal";
  };

  const rescrubDays = active?.next_rescrub ? daysUntil(active.next_rescrub) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/ra-logo.png"
              alt=""
              className="w-9 h-9 flex-shrink-0"
              style={{ filter: "drop-shadow(0 4px 14px rgba(124,58,237,0.25))" }}
            />
            <span className="text-xl font-extrabold text-brand-900 tracking-tight">ReachAudit</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-1">Portal</span>
          </div>
          {authed && (
            <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Sign Out
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {loading && <p className="text-gray-400 text-sm">Loading…</p>}

        {!loading && !configured && (
          <div className="card text-center py-12">
            <p className="text-gray-500">The portal isn&apos;t available right now. Please try again shortly.</p>
          </div>
        )}

        {!loading && configured && !authed && <SignIn />}

        {!loading && authed && clients.length === 0 && (
          <div className="card text-center space-y-3 py-12">
            <p className="text-gray-500 font-medium">This email isn&apos;t linked to a customer account yet.</p>
            <p className="text-gray-400 text-sm">
              If you&apos;re a ReachAudit customer, reply to your delivery email and we&apos;ll connect it.
            </p>
            <Link href="/" className="btn-secondary text-sm px-6 py-2 inline-block">Back to reachaudit.com</Link>
          </div>
        )}

        {!loading && authed && active && (
          <>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold text-brand-900">{active.name}</h1>
                <p className="text-gray-500 text-sm mt-1">Monthly audit history and deliverables.</p>
              </div>
              {rescrubDays != null && (
                <div className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
                  rescrubDays <= 5 ? "bg-red-50 text-red-700 border border-red-100"
                                   : "bg-brand-50 text-brand-900 border border-brand-200"
                }`}>
                  Next DNC rescrub: {fmtDate(active.next_rescrub!)}
                  {rescrubDays >= 0 && <span className="text-xs font-normal"> · in {rescrubDays} day{rescrubDays === 1 ? "" : "s"}</span>}
                </div>
              )}
            </div>

            {clients.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => switchClient(c)}
                    className={c.id === active.id ? "btn-primary text-xs px-4 py-2" : "btn-secondary text-xs px-4 py-2"}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            {audits.length === 0 && (
              <div className="card text-center space-y-2 py-12">
                <p className="text-4xl">📂</p>
                <p className="text-gray-500 font-medium">No audits published yet.</p>
                <p className="text-gray-400 text-sm">Your first monthly audit will appear here as soon as it ships.</p>
              </div>
            )}

            {audits.map((a) => <AuditRow key={a.id} audit={a} />)}
          </>
        )}
      </div>
    </div>
  );
}
