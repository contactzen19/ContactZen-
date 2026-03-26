"use client";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase";

interface Props {
  onClose: () => void;
}

export default function AuthModal({ onClose }: Props) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const sb = getSupabase();
    if (!sb) { setError("Auth not configured."); setLoading(false); return; }
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/app` },
    });
    if (error) { setError(error.message); } else { setSent(true); }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-900">Save your scan</h2>
            <p className="text-sm text-gray-500 mt-1">Sign in to save results and access them later.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>
        {sent ? (
          <div className="bg-brand-50 border border-brand-200 rounded-xl px-5 py-4 text-center space-y-2">
            <p className="text-2xl">📬</p>
            <p className="font-semibold text-brand-900">Check your email</p>
            <p className="text-sm text-gray-500">We sent a magic link to <strong>{email}</strong>. Click it to sign in — no password needed.</p>
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
              {loading ? "Sending…" : "Send Magic Link →"}
            </button>
            <p className="text-xs text-gray-400 text-center">No password. Just click the link we email you.</p>
          </form>
        )}
      </div>
    </div>
  );
}
