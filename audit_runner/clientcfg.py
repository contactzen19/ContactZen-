"""clientcfg.py — load/create the per-client config (client.yaml).

One file per customer at clients/<name>/client.yaml. Holds everything the
runner should never have to ask twice: column mapping, SAN details (three
pieces, never guessed), vendor spend for CPRC, plan tier, rescrub anchor.

SAN + spend are optional in M1 (email-only milestone). M2 (phone/DNC) will
refuse to run without the SAN three-piece.
"""
from __future__ import annotations

import os
import sys
from datetime import date

try:
    import yaml
except ImportError:
    sys.exit(
        "PyYAML is missing. Run this once and try again:\n"
        "    pip3 install pyyaml --break-system-packages"
    )

RUNNER_DIR = os.path.dirname(os.path.abspath(__file__))
CLIENTS_DIR = os.path.join(RUNNER_DIR, "clients")


def client_dir(name: str) -> str:
    return os.path.join(CLIENTS_DIR, name)


def cfg_path(name: str) -> str:
    return os.path.join(client_dir(name), "client.yaml")


def load(name: str) -> dict | None:
    p = cfg_path(name)
    if not os.path.exists(p):
        return None
    with open(p) as f:
        return yaml.safe_load(f) or {}


def save(name: str, cfg: dict) -> str:
    os.makedirs(client_dir(name), exist_ok=True)
    p = cfg_path(name)
    with open(p, "w") as f:
        yaml.safe_dump(cfg, f, sort_keys=False, allow_unicode=True)
    return p


def create_interactive(name: str) -> dict:
    """First-run setup. Only asks what M1 needs; SAN/spend can be added later
    by editing client.yaml directly (the file is meant to be human-edited)."""
    print(f"\nNew client '{name}' — quick setup (edit clients/{name}/client.yaml later to change anything).")
    display = input(f"  Display name [{name}]: ").strip() or name
    cfg = {
        "display_name": display,
        "created": str(date.today()),
        "plan": "",              # e.g. one-time-199 / retainer-299
        "columns": {},            # filled by ingest on first run
        "san": {                  # REQUIRED before any DNC run (M2). Never guess.
            "organization_id": "",
            "san_number": "",
            "san_expiration": "",
        },
        "vendor_spend": {},       # e.g. {"vendor_name": 12000} annual $ — powers CPRC
        "rescrub_anchor": "",     # set after first compliance run (31-day cycle)
    }
    save(name, cfg)
    print(f"  Saved clients/{name}/client.yaml")
    return cfg


def run_dir(name: str, stamp: str) -> dict:
    """Create (or reuse) the folder set for one audit run: input/ work/ deliver/."""
    base = os.path.join(client_dir(name), stamp)
    paths = {sub: os.path.join(base, sub) for sub in ("input", "work", "deliver")}
    for p in paths.values():
        os.makedirs(p, exist_ok=True)
    paths["base"] = base
    return paths
