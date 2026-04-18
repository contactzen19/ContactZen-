"use client";
import { useState } from "react";
import { ScoreResult, TaskResult, scoreHubSpotContacts, createHotTasks } from "@/lib/api";

interface Props {
  hubspotToken: string;
}

const TIER_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  hot:  { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500",    label: "Hot"  },
  warm: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500", label: "Warm" },
  cold: { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-400",   label: "Cold" },
  dead: { bg: "bg-gray-50",   text: "text-gray-500",   dot: "bg-gray-300",   label: "Dead" },
};

export default function ScorePanel({ hubspotToken }: Props) {
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);

  const [tasking, setTasking] = useState(false);
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  const handleScore = async () => {
    setScoring(true);
    setScoreError(null);
    setResult(null);
    setTaskResult(null);
    try {
      const r = await scoreHubSpotContacts(hubspotToken);
      setResult(r);
    } catch {
      setScoreError("Scoring failed. Please reconnect HubSpot and try again.");
    } finally {
      setScoring(false);
    }
  };

  const handleCreateTasks = async () => {
    setTasking(true);
    setTaskError(null);
    try {
      const r = await createHotTasks(hubspotToken);
      setTaskResult(r);
    } catch {
      setTaskError("Task creation failed. Please try again.");
    } finally {
      setTasking(false);
    }
  };

  const total = result
    ? Object.values(result.tiers).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          HS
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Signal Scoring Engine</p>
          <p className="text-xs text-gray-500">
            Scores every contact by real engagement signals — opens, clicks, replies, calls, meetings.
            Writes <code className="bg-orange-100 px-1 rounded">cz_score</code> and{" "}
            <code className="bg-orange-100 px-1 rounded">cz_score_tier</code> directly to HubSpot.
          </p>
        </div>
      </div>

      {/* Score button */}
      {!result && (
        <button
          onClick={handleScore}
          disabled={scoring}
          className="btn-primary text-sm w-full flex items-center justify-center gap-2"
        >
          {scoring ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Scoring contacts… (this may take a minute)
            </>
          ) : "Score All Contacts"}
        </button>
      )}

      {scoreError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {scoreError}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Tier breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["hot", "warm", "cold", "dead"] as const).map((tier) => {
              const s = TIER_STYLES[tier];
              const count = result.tiers[tier];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={tier} className={`rounded-lg p-3 border ${s.bg} border-transparent`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className={`text-xs font-bold uppercase tracking-wide ${s.text}`}>{s.label}</span>
                  </div>
                  <p className={`text-2xl font-extrabold ${s.text}`}>{count.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{pct}% of total</p>
                </div>
              );
            })}
          </div>

          {/* Stats strip */}
          <div className="rounded-lg bg-white border border-orange-100 px-4 py-3 text-sm text-gray-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Total contacts scored</span>
              <span className="font-semibold text-gray-800">{result.total_contacts.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Contacts with signal history</span>
              <span className="font-semibold text-gray-800">{result.contacts_with_signals.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Engagements analyzed</span>
              <span className="font-semibold text-gray-800">{result.engagements_processed.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Scored at</span>
              <span className="font-semibold text-gray-800">
                {new Date(result.scored_at).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Hot contacts callout */}
          {result.tiers.hot > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm font-semibold text-red-800 mb-1">
                🔥 {result.tiers.hot.toLocaleString()} Hot contacts ready to work
              </p>
              <p className="text-xs text-red-600 mb-3">
                These contacts have recent high-intent signals — opened emails, clicked links, visited
                your calendar. Create tasks now so your reps call them today.
              </p>

              {taskResult ? (
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                  ✅ <strong>{taskResult.tasks_created} call tasks created</strong> in HubSpot.
                  Your reps will see them in their task queue today.
                  {taskResult.errors > 0 && (
                    <span className="text-yellow-700 ml-1">({taskResult.errors} errors)</span>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={handleCreateTasks}
                    disabled={tasking}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {tasking ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        Creating tasks…
                      </>
                    ) : `Create ${result.tiers.hot} Call Tasks in HubSpot`}
                  </button>
                  {taskError && (
                    <p className="text-xs text-red-600 mt-2">{taskError}</p>
                  )}
                </>
              )}
            </div>
          )}

          <button
            onClick={handleScore}
            disabled={scoring}
            className="btn-secondary text-sm w-full"
          >
            Re-run Scoring
          </button>
        </div>
      )}
    </div>
  );
}
