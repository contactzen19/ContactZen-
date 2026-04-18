"""
ContactZen Signal Scoring Engine

Converts HubSpot engagement history into a weighted, time-decayed prospect score.
Produces a tier (hot/warm/cold/dead) and a human-readable contact story.
"""

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional


# ── Signal definitions ─────────────────────────────────────────────────────────

@dataclass
class SignalEvent:
    event_type: str        # canonical type key
    occurred_at: datetime  # timezone-aware UTC
    label: str             # human-readable for story panel


# Base weights (un-decayed score contribution)
SIGNAL_WEIGHTS: dict[str, float] = {
    "meeting_booked":      100.0,
    "form_submitted":       40.0,
    "calendar_clicked":     40.0,
    "email_replied":        30.0,
    "call_connected":       25.0,
    "email_link_clicked":   20.0,
    "email_opened":          5.0,
    "email_sent":            0.0,  # neutral — don't score sends
    "call_no_answer":       -2.0,
    "unsubscribed":       -100.0,  # permanent negative
    "hard_bounce":         -50.0,  # permanent negative
}

# Half-life in days: score halves every N days (recency decay)
HALF_LIFE_DAYS: dict[str, float] = {
    "meeting_booked":     90.0,
    "form_submitted":     14.0,
    "calendar_clicked":    7.0,
    "email_replied":      30.0,
    "call_connected":     21.0,
    "email_link_clicked":  7.0,
    "email_opened":        3.0,
    "call_no_answer":    999.0,  # doesn't decay
    "unsubscribed":      999.0,  # permanent
    "hard_bounce":       999.0,  # permanent
}

PERMANENT_NEGATIVE_TYPES = {"unsubscribed", "hard_bounce"}

# (min_score, tier_name) — checked in order
SCORE_TIERS = [
    (60.0, "hot"),
    (25.0, "warm"),
    (5.0,  "cold"),
    (0.0,  "dead"),
]


# ── Core scoring ───────────────────────────────────────────────────────────────

def _decay(event_type: str, days_ago: float) -> float:
    """0–1 multiplier based on recency. Permanent negatives never decay."""
    if event_type in PERMANENT_NEGATIVE_TYPES:
        return 1.0
    half_life = HALF_LIFE_DAYS.get(event_type, 7.0)
    return math.pow(0.5, days_ago / half_life)


def score_contact(
    events: list[SignalEvent],
    now: Optional[datetime] = None,
) -> dict:
    """
    Score one contact from their list of SignalEvents.

    Returns:
        score          — int, 0 to ~200
        tier           — "hot" | "warm" | "cold" | "dead"
        signal_summary — pipe-delimited string (stored as HubSpot property)
        story          — list[str] of human-readable lines, most recent first
        event_count    — total events processed
    """
    if now is None:
        now = datetime.now(timezone.utc)

    has_permanent_negative = any(
        e.event_type in PERMANENT_NEGATIVE_TYPES for e in events
    )

    raw = 0.0
    for e in events:
        weight = SIGNAL_WEIGHTS.get(e.event_type, 0.0)
        if weight == 0.0:
            continue
        days_ago = max(0.0, (now - e.occurred_at).total_seconds() / 86400)
        raw += weight * _decay(e.event_type, days_ago)

    score = max(0, round(raw))

    tier = "dead"
    if not has_permanent_negative:
        for threshold, name in SCORE_TIERS:
            if score >= threshold:
                tier = name
                break

    # Story: top 5 meaningful events, most recent first
    meaningful = sorted(
        [e for e in events if e.event_type != "email_sent"],
        key=lambda e: e.occurred_at,
        reverse=True,
    )[:5]

    story_lines = []
    for e in meaningful:
        days_ago = (now - e.occurred_at).total_seconds() / 86400
        if days_ago < 1:
            when = "Today"
        elif days_ago < 2:
            when = "Yesterday"
        elif days_ago < 8:
            when = f"{int(days_ago)}d ago"
        else:
            when = e.occurred_at.strftime("%b %d")
        story_lines.append(f"{when}: {e.label}")

    summary = " | ".join(story_lines) if story_lines else "No recent signals"

    return {
        "score": score,
        "tier": tier,
        "signal_summary": summary[:500],  # HubSpot text property limit
        "story": story_lines,
        "event_count": len(events),
    }


# ── HubSpot engagement parser ──────────────────────────────────────────────────

def parse_hubspot_engagement(eng: dict) -> Optional[SignalEvent]:
    """
    Parse one HubSpot v1 engagement object into a SignalEvent.
    Returns None for types we don't score (NOTE, TASK, etc.).
    """
    engagement = eng.get("engagement", {})
    meta = eng.get("metadata", {})

    ts = engagement.get("timestamp")
    if not ts:
        return None

    try:
        occurred_at = datetime.fromtimestamp(ts / 1000.0, tz=timezone.utc)
    except (OSError, OverflowError, ValueError):
        return None

    eng_type = engagement.get("type", "").upper()

    if eng_type == "EMAIL":
        status = (meta.get("status") or "SENT").upper()
        subject = (meta.get("subject") or "email")[:60]

        if status == "BOUNCED":
            return SignalEvent("hard_bounce", occurred_at, f"Hard bounce on \"{subject}\"")
        if status in ("UNSUBSCRIBED", "SPAM_REPORT"):
            return SignalEvent("unsubscribed", occurred_at, "Unsubscribed from emails")
        if status == "CLICKED":
            return SignalEvent("email_link_clicked", occurred_at, f"Clicked link — \"{subject}\"")
        if status == "REPLIED":
            return SignalEvent("email_replied", occurred_at, f"Replied to \"{subject}\"")
        if status == "OPENED":
            return SignalEvent("email_opened", occurred_at, f"Opened \"{subject}\"")
        if status == "SENT":
            return SignalEvent("email_sent", occurred_at, f"Sent \"{subject}\"")

    elif eng_type == "MEETING":
        title = (meta.get("title") or "Meeting")[:60]
        return SignalEvent("meeting_booked", occurred_at, f"Meeting booked — {title}")

    elif eng_type == "CALL":
        disposition = (meta.get("disposition") or "").lower()
        duration_ms = meta.get("durationMilliseconds") or 0
        connected = duration_ms > 30_000 or any(
            kw in disposition
            for kw in ("connected", "completed", "left_live", "left voicemail")
        )
        if connected:
            minutes = int(duration_ms / 60_000)
            label = f"Call connected ({minutes}m)" if minutes > 0 else "Call connected"
            return SignalEvent("call_connected", occurred_at, label)
        return SignalEvent("call_no_answer", occurred_at, "Call — no answer / not reached")

    elif eng_type == "FORM_SUBMISSION":
        form = (meta.get("formTitle") or "form")[:60]
        return SignalEvent("form_submitted", occurred_at, f"Submitted form: {form}")

    return None
