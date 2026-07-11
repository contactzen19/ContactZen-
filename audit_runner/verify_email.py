"""verify_email.py — module 2 of the audit runner.

ZeroBounce batch verification (100/request, 1 credit per email) with a JSONL
checkpoint: every verified email is appended to work/zb_checkpoint.jsonl the
moment its batch returns, so a crashed or interrupted run resumes without
re-spending a single credit. Final output: work/zb_results.csv.

Lifted from ONEinsurance/run_verify.py (batch endpoint, resume, credit
check, dry mode) with the checkpoint switched from CSV to JSONL.
"""
from __future__ import annotations

import csv
import json
import os
import ssl
import sys
import time
import urllib.parse
import urllib.request

BATCH = 100

try:
    import certifi
    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:
    SSL_CTX = ssl._create_unverified_context()

_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_KEY_PATHS = (
    os.path.join(_REPO, ".zerobounce_key"),
    os.path.join(_REPO, "zerobounce_key"),
    os.path.expanduser("~/ContactZen/.zerobounce_key"),
    os.path.expanduser("~/ContactZen/zerobounce_key"),
)


def load_key() -> str:
    for p in _KEY_PATHS:
        if os.path.exists(p):
            k = open(p).read().strip()
            if k:
                return k
    k = os.environ.get("ZEROBOUNCE_API_KEY", "").strip()
    if k:
        return k
    sys.exit("No ZeroBounce key found (ContactZen/zerobounce_key or ZEROBOUNCE_API_KEY).")


def get_credits(key: str) -> int:
    url = "https://api.zerobounce.net/v2/getcredits?" + urllib.parse.urlencode({"api_key": key})
    with urllib.request.urlopen(url, timeout=20, context=SSL_CTX) as r:
        return int(json.load(r).get("Credits", -1))


def verify_batch(emails: list[str], key: str) -> list[tuple[str, str, str]]:
    body = json.dumps({
        "api_key": key,
        "email_batch": [{"email_address": e, "ip_address": ""} for e in emails],
    }).encode()
    req = urllib.request.Request(
        "https://bulkapi.zerobounce.net/v2/validatebatch",
        data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60, context=SSL_CTX) as r:
        d = json.load(r)
    return [
        (i.get("address", ""), i.get("status", "unknown"), i.get("sub_status", ""))
        for i in d.get("email_batch", [])
    ]


def _checkpoint_done(ckpt: str) -> set[str]:
    done = set()
    if os.path.exists(ckpt):
        with open(ckpt) as f:
            for line in f:
                try:
                    done.add(json.loads(line)["email"])
                except (json.JSONDecodeError, KeyError):
                    continue  # torn line from a crash mid-write; that email re-verifies
    return done


def plan(emails: list[str], workdir: str) -> dict:
    """Cost preview: how many need verifying, how many already checkpointed."""
    ckpt = os.path.join(workdir, "zb_checkpoint.jsonl")
    done = _checkpoint_done(ckpt)
    todo = [e for e in dict.fromkeys(emails) if e and e not in done]
    return {"total": len(set(e for e in emails if e)), "done": len(done), "todo": todo, "ckpt": ckpt}


def run(emails: list[str], workdir: str, key: str) -> dict:
    p = plan(emails, workdir)
    todo, ckpt = p["todo"], p["ckpt"]
    counts: dict[str, int] = {}

    with open(ckpt, "a") as f:
        for i in range(0, len(todo), BATCH):
            chunk = todo[i:i + BATCH]
            try:
                results = verify_batch(chunk, key)
            except Exception as e:
                results = [(c, "error", str(e)[:80]) for c in chunk]
            for email, status, sub in results:
                counts[status] = counts.get(status, 0) + 1
                f.write(json.dumps({"email": email, "status": status, "sub_status": sub}) + "\n")
            f.flush()
            print(f"    verified {min(i + BATCH, len(todo))}/{len(todo)}")
            time.sleep(1)

    # Materialize the full checkpoint (all runs) into the results CSV.
    out = os.path.join(workdir, "zb_results.csv")
    with open(out, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["email", "zb_status", "zb_sub_status"])
        seen = set()
        with open(ckpt) as c:
            for line in c:
                try:
                    r = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if r["email"] in seen:
                    continue
                seen.add(r["email"])
                w.writerow([r["email"], r["status"], r["sub_status"]])

    return {"results": out, "verified_this_run": len(todo), "statuses": counts}
