"""publish.py — push a reviewed audit run to the customer portal (Phase 2).

    python3 publish.py --client elaine --stamp 2026-08

What it does, in order:
  1. Review gate: refuses if the run folder has no run_summary.json (the
     runner never completed) or if the run used --mock-phone (mock outputs
     never reach a customer).
  2. Ensures the portal_clients row exists (created from client.yaml's
     display_name — never the SAN or roi values) and syncs next_rescrub.
  3. Uploads deliver/ files. PII-free artifacts (report, compliance JSON)
     go to the permanent `portal-docs` bucket; contact-level files
     (evidence.csv, roadmap xlsx) go to the auto-purged `transit` bucket.
  4. Upserts one audits row: score, verdicts, tiers, delta.
  5. Sweeps this client's transit files older than 7 days.

Env (runner-local ONLY, never the frontend): SUPABASE_URL and
SUPABASE_SERVICE_ROLE_KEY, from the shell or audit_runner/.env.

Storage rule (locked, spec 2026-07-11): history without PII custody.
Canonical deliverables stay in clients/<name>/<stamp>/deliver/ on this
machine — the portal is a window, not the system of record.
"""
from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

import clientcfg

RUNNER_DIR = os.path.dirname(os.path.abspath(__file__))

# deliver/ routing: contact-level extensions ride transit, everything else
# (report .md/.pdf, compliance .json, summaries .txt) is stored permanently.
TRANSIT_EXTS = {".csv", ".xlsx"}
TRANSIT_TTL_DAYS = 7


def load_env() -> tuple[str, str]:
    env_path = os.path.join(RUNNER_DIR, ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        sys.exit(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are not set.\n"
            "Put them in audit_runner/.env (gitignored) or export them:\n"
            "    SUPABASE_URL=https://<project>.supabase.co\n"
            "    SUPABASE_SERVICE_ROLE_KEY=<service_role key>"
        )
    return url, key


def request(method: str, url: str, key: str, body: bytes | None = None,
            headers: dict | None = None) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("apikey", key)
    req.add_header("Authorization", f"Bearer {key}")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def rest(method: str, base: str, key: str, path: str, payload=None,
         prefer: str | None = None) -> tuple[int, list | dict | None]:
    headers = {"Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    body = json.dumps(payload).encode() if payload is not None else None
    status, raw = request(method, f"{base}/rest/v1/{path}", key, body, headers)
    data = json.loads(raw) if raw else None
    return status, data


def ensure_client(base: str, key: str, slug: str, cfg: dict) -> str:
    status, rows = rest("GET", base, key,
                        f"portal_clients?slug=eq.{urllib.parse.quote(slug)}&select=id")
    if status != 200:
        sys.exit(f"portal_clients lookup failed ({status}): {rows}")
    payload = {
        "slug": slug,
        "name": cfg.get("display_name", slug),
        "next_rescrub": cfg.get("next_rescrub") or None,
    }
    if rows:
        client_id = rows[0]["id"]
        rest("PATCH", base, key, f"portal_clients?id=eq.{client_id}",
             {"next_rescrub": payload["next_rescrub"]})
        return client_id
    status, created = rest("POST", base, key, "portal_clients", payload,
                           prefer="return=representation")
    if status not in (200, 201) or not created:
        sys.exit(f"portal_clients insert failed ({status}): {created}")
    print(f"  Created portal client '{payload['name']}' ({slug})")
    return created[0]["id"]


def upload_file(base: str, key: str, bucket: str, object_path: str,
                local_path: str) -> None:
    ctype = mimetypes.guess_type(local_path)[0] or "application/octet-stream"
    with open(local_path, "rb") as f:
        body = f.read()
    status, raw = request(
        "POST", f"{base}/storage/v1/object/{bucket}/{urllib.parse.quote(object_path)}",
        key, body, {"Content-Type": ctype, "x-upsert": "true"})
    if status not in (200, 201):
        sys.exit(f"Upload failed for {object_path} ({status}): {raw.decode(errors='replace')}")


def sweep_transit(base: str, key: str, client_id: str) -> int:
    """Delete this client's transit objects older than TRANSIT_TTL_DAYS."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=TRANSIT_TTL_DAYS)
    expired: list[str] = []

    def walk(prefix: str) -> None:
        body = json.dumps({"prefix": prefix, "limit": 1000}).encode()
        status, raw = request("POST", f"{base}/storage/v1/object/list/transit",
                              key, body, {"Content-Type": "application/json"})
        if status != 200:
            return
        for item in json.loads(raw):
            name = item.get("name")
            if not name:
                continue
            full = f"{prefix}/{name}" if prefix else name
            if item.get("id") is None:          # folder → recurse
                walk(full)
            else:
                created = item.get("created_at", "")
                try:
                    ts = datetime.fromisoformat(created.replace("Z", "+00:00"))
                except ValueError:
                    continue
                if ts < cutoff:
                    expired.append(full)

    walk(client_id)
    if expired:
        body = json.dumps({"prefixes": expired}).encode()
        request("DELETE", f"{base}/storage/v1/object/transit", key, body,
                {"Content-Type": "application/json"})
    return len(expired)


def main() -> None:
    ap = argparse.ArgumentParser(description="Publish a reviewed audit run to the portal.")
    ap.add_argument("--client", required=True, help="runner client name (clients/<name>/)")
    ap.add_argument("--stamp", required=True, help="run stamp, e.g. 2026-07")
    ap.add_argument("--dry", action="store_true", help="show what would publish, send nothing")
    args = ap.parse_args()

    cfg = clientcfg.load(args.client)
    if cfg is None:
        sys.exit(f"No such client: {args.client} (no clients/{args.client}/client.yaml)")

    run_base = os.path.join(clientcfg.client_dir(args.client), args.stamp)
    summary_path = os.path.join(run_base, "run_summary.json")
    deliver_dir = os.path.join(run_base, "deliver")

    # Review gate — publish.py refuses to run if the runner never completed.
    if not os.path.exists(summary_path):
        sys.exit(f"REFUSING: {summary_path} not found — the runner never completed this run.")
    with open(summary_path) as f:
        summary = json.load(f)
    if summary.get("mock_phone"):
        sys.exit("REFUSING: this run used --mock-phone. Mock outputs never reach a customer.")

    files = sorted(
        f for f in os.listdir(deliver_dir)
        if os.path.isfile(os.path.join(deliver_dir, f))
        and not f.startswith(".") and "_MOCK" not in f
    ) if os.path.isdir(deliver_dir) else []
    if not files:
        sys.exit(f"REFUSING: nothing to publish — {deliver_dir} is empty.")

    verdicts = summary.get("verdicts") or {}
    total = sum(verdicts.values()) or None
    score = round(100 * verdicts.get("Reachable", 0) / total) if total else None

    routed = [(f, "transit" if os.path.splitext(f)[1].lower() in TRANSIT_EXTS
               else "portal-docs") for f in files]

    print(f"Publishing {cfg.get('display_name', args.client)} — {args.stamp}")
    print(f"  Score: {score}   Verdicts: {verdicts}")
    for fname, bucket in routed:
        tag = "transit (7-day)" if bucket == "transit" else "stored"
        print(f"  {tag:16} {fname}")
    if args.dry:
        print("Dry run — nothing sent.")
        return

    base, key = load_env()
    client_id = ensure_client(base, key, args.client, cfg)

    for fname, bucket in routed:
        upload_file(base, key, bucket, f"{client_id}/{args.stamp}/{fname}",
                    os.path.join(deliver_dir, fname))
    print(f"  Uploaded {len(routed)} files.")

    audit_row = {
        "client_id": client_id,
        "stamp": args.stamp,
        "score": score,
        "verdicts": verdicts or None,
        "tiers": summary.get("tiers") or None,
        "delta": summary.get("delta") or None,
    }
    status, data = rest("POST", base, key, "audits?on_conflict=client_id,stamp",
                        audit_row, prefer="resolution=merge-duplicates,return=representation")
    if status not in (200, 201):
        sys.exit(f"audits upsert failed ({status}): {data}")
    print(f"  Audit row published (stamp {args.stamp}).")

    swept = sweep_transit(base, key, client_id)
    if swept:
        print(f"  Swept {swept} expired transit file(s).")

    print("Done. The customer sees it at reachaudit.com/portal.")


if __name__ == "__main__":
    main()
