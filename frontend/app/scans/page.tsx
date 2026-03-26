"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { listScans, deleteScan, SavedScan } from "@/lib/scans";
import { encodeSummary } from "@/lib/report";

const fmt = (x: number) => `${(x * 100).toFixed(1)}%`;
const fmtNum = (x: number) => x.toLocaleString();
const fmtDollar = (x: number) => `$${Math.round(x).toLocaleString()}`;

export default function ScansPage() {
  const [scans, setScans] = useState<SavedScan[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setAuthed(true);
      listScans().then((s) => { setScans(s); setLoading(false); });
    });
  }, []);

  const handleDelete = async (id: string) => {
    await deleteScan(id);
    setScans((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/app";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white text-base flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7C3AED, #9F67FF)", boxShadow: "0 4px 14px rgba(124,58,237,0.25)" }}
            >
              ⚡
            </div>
            <span className="text-xl font-extrabold text-brand-900 tracking-tight">ContactZen</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/app" className="btn-secondary text-sm px-4 py-2">New Scan</Link>
            {authed && (
              <button onClick={handleSignOut} className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Saved Scans</h1>
          <p className="text-gray-500 text-sm mt-1">Your scan history — click any report to view or share it.</p>
        </div>

        {loading && (
          <p className="text-gray-400 text-sm">Loading…</p>
        )}

        {!loading && !authed && (
          <div className="card text-center space-y-4 py-12">
            <p className="text-gray-500">You need to sign in to view saved scans.</p>
            <Link href="/app" className="btn-primary text-sm px-6 py-2">Go to Scanner</Link>
          </div>
        )}

        {!loading && authed && scans.length === 0 && (
          <div className="card text-center space-y-4 py-12">
            <p className="text-4xl">📂</p>
            <p className="text-gray-500 font-medium">No saved scans yet.</p>
            <p className="text-gray-400 text-sm">Run a scan and click &quot;Save Scan&quot; to see it here.</p>
            <Link href="/app" className="btn-primary text-sm px-6 py-2">Run a Scan</Link>
          </div>
        )}

        {scans.map((scan) => {
          const s = scan.summary;
          const reportUrl = `/report?d=${encodeSummary(s)}`;
          const date = new Date(scan.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          return (
            <div key={scan.id} className="card space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-brand-900">{scan.label ?? `${fmtNum(s.total)}-contact scan`}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{date}</p>
                </div>
                <button
                  onClick={() => handleDelete(scan.id)}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0"
                >
                  Delete
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Contacts", value: fmtNum(s.total) },
                  { label: "Risk Rate", value: fmt(s.contact_high_risk_rate) },
                  { label: "Annual Impact", value: fmtDollar(s.roi.total_annual_impact) },
                  { label: "Completeness", value: `${s.completeness_score}/100` },
                ].map((m) => (
                  <div key={m.label} className="bg-gray-50 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400 font-medium">{m.label}</p>
                    <p className="text-sm font-bold text-brand-900 mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Link href={reportUrl} className="btn-primary text-xs px-4 py-2 flex-1 text-center">View Report →</Link>
                <button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}${reportUrl}`)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Copy Link
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
