"""
Tests for the Plane B signal pipeline changes (2026-06-16 decisions):
  - domain hash: backward-compatible plain SHA-256, opt-in HMAC pepper
  - freemail/corporate classification
  - signal rows carry domain_type + account_id and never carry PII
  - public-index min-cell gating (n>=30 AND >=5 distinct customers)

No network. Run: python backend/test_vendor_signals.py   (or pytest)
"""
import hashlib
import hmac

import pandas as pd

import vendor_signals as vs
import vendor_index as vi


def test_hash_domain_unsalted_is_backward_compatible():
    # With no pepper, must equal plain SHA-256 of the lowercased domain.
    vs.DOMAIN_HASH_PEPPER = ""
    expected = hashlib.sha256("acme.com".encode("utf-8")).hexdigest()
    assert vs.hash_domain("Jane.Doe@Acme.com") == expected


def test_hash_domain_discards_local_part():
    vs.DOMAIN_HASH_PEPPER = ""
    # Different people, same company domain -> same hash (it's not personal data).
    assert vs.hash_domain("a@acme.com") == vs.hash_domain("b@acme.com")


def test_hash_domain_pepper_changes_and_is_stable():
    vs.DOMAIN_HASH_PEPPER = "s3cret-pepper"
    h1 = vs.hash_domain("x@acme.com")
    h2 = vs.hash_domain("y@acme.com")
    plain = hashlib.sha256("acme.com".encode("utf-8")).hexdigest()
    expected = hmac.new(b"s3cret-pepper", b"acme.com", hashlib.sha256).hexdigest()
    assert h1 == h2 == expected   # deterministic, aggregation still works
    assert h1 != plain            # actually hardened vs. plain hash
    vs.DOMAIN_HASH_PEPPER = ""    # reset for other tests


def test_hash_domain_none_cases():
    vs.DOMAIN_HASH_PEPPER = ""
    assert vs.hash_domain(None) is None
    assert vs.hash_domain("no-at-sign") is None
    assert vs.hash_domain("a@nodot") is None


def test_classify_domain_type():
    assert vs.classify_domain_type("a@gmail.com") == "freemail"
    assert vs.classify_domain_type("a@acme.com") == "corporate"
    assert vs.classify_domain_type("garbage") is None


def test_build_signal_rows_shape_and_no_pii():
    vs.DOMAIN_HASH_PEPPER = ""
    df = pd.DataFrame({
        "email": ["jane@acme.com", "bob@gmail.com", "bad-row"],
        "src": ["ZoomInfo Export Q2", "manual", "apollo"],
    })
    rows = vs.build_signal_rows(df, "email", "src", None, "scan-1", account_id="acct-9")
    # 'bad-row' has no hashable domain -> dropped.
    assert len(rows) == 2
    r = rows[0]
    assert r["scan_id"] == "scan-1"
    assert r["account_id"] == "acct-9"
    assert r["domain_type"] == "corporate"
    assert r["source_normalized"] == "zoominfo"
    assert rows[1]["domain_type"] == "freemail"
    # No PII keys should ever appear.
    forbidden = {"email", "name", "phone", "first_name", "last_name", "company"}
    for row in rows:
        assert forbidden.isdisjoint(row.keys())
        # domain_hash must be a hash, never a plaintext address/domain.
        assert "@" not in row["domain_hash"] and "." not in row["domain_hash"]


def test_min_cell_gate():
    assert vi.is_publishable(30, 5) is True
    assert vi.is_publishable(29, 5) is False     # too few records
    assert vi.is_publishable(30, 4) is False     # too few customers
    assert vi.is_publishable(None, None) is False

    cells = [
        {"vendor": "zoominfo", "n": 120, "distinct_customers": 8},   # keep
        {"vendor": "apollo",   "n": 200, "distinct_customers": 3},   # drop (customers)
        {"vendor": "lusha",    "n": 12,  "distinct_customers": 9},   # drop (records)
    ]
    kept = vi.gate_cells(cells)
    assert [c["vendor"] for c in kept] == ["zoominfo"]


if __name__ == "__main__":
    tests = [v for k, v in sorted(globals().items())
             if k.startswith("test_") and callable(v)]
    for t in tests:
        t()
        print("ok:", t.__name__)
    print(f"all {len(tests)} tests passed")
