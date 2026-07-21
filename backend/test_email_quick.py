"""Tests for the /api/email-quick endpoint (free-tool per-address verdicts).

No network required: MX answers are pre-seeded into scoring._MX_CACHE, same
approach as test_scoring_mx.py. gamil.com is deliberately seeded with LIVE MX
— real typo-squat domains accept mail — to prove the typo screen outranks the
MX check.

Run:  cd backend && python test_email_quick.py   (or: pytest test_email_quick.py)
"""
import asyncio

from fastapi import HTTPException

import scoring
import main


class _FakeClient:
    host = "test-ip"


class _FakeRequest:
    headers: dict = {}
    client = _FakeClient()

    def __init__(self, ip="test-ip"):
        self.client = _FakeClient()
        self.client.host = ip


def _call(emails, ip="test-ip"):
    req = main.EmailQuickRequest(emails=emails)
    return asyncio.run(main.email_quick(req, _FakeRequest(ip)))


def _one(email, ip=None):
    return _call([email], ip=ip or f"ip-{email}")["results"][0]


def _seed(domain, value):
    scoring._MX_CACHE[domain.lower()] = value


_seed("gmail.com", True)
_seed("yahoo.com", True)
_seed("gamil.com", True)          # live MX on a typo domain — typo must win
_seed("mailinator.com", True)
_seed("acmeinsurance.com", True)
_seed("somecompany.com", True)
_seed("deadco.example", False)


def test_valid_gmail_good_and_personal():
    r = _one("jane.doe@gmail.com")
    assert (r["verdict"], r["reason"]) == ("valid", "mx_ok")
    assert r["free_mail"] is True and r["role_account"] is False


def test_typo_domain_beats_live_mx():
    r = _one("sarah@gamil.com")
    assert (r["verdict"], r["reason"]) == ("risky", "domain_typo")
    assert r["suggestion"] == "sarah@gmail.com"


def test_tld_typo():
    r = _one("bob@yahoo.con")
    assert r["reason"] == "domain_typo" and r["suggestion"] == "bob@yahoo.com"


def test_dead_domain_invalid():
    r = _one("tom@deadco.example")
    assert (r["verdict"], r["reason"]) == ("invalid", "no_mx_record")


def test_role_account_flagged_not_penalized():
    r = _one("info@acmeinsurance.com")
    assert r["verdict"] == "valid" and r["role_account"] is True


def test_noreply_is_risky():
    r = _one("noreply@somecompany.com")
    assert (r["verdict"], r["reason"]) == ("risky", "no_reply_address")


def test_disposable_domain():
    r = _one("lead@mailinator.com")
    assert (r["verdict"], r["reason"]) == ("risky", "disposable_domain_hint")


def test_no_at_sign_is_400():
    try:
        _call(["not-an-email"])
        assert False, "expected 400"
    except HTTPException as e:
        assert e.status_code == 400


def test_dedupe_and_cap():
    out = _call(["a@gmail.com", "A@GMAIL.COM", "b@gmail.com"], ip="dedupe-ip")
    assert out["checked"] == 2
    out = _call([f"u{i}@gmail.com" for i in range(9)], ip="cap-ip")
    assert out["checked"] == main.EMAIL_QUICK_CAP


def test_rate_limit_and_ip_isolation():
    ip = "rl-ip"
    for n in range(main.EMAIL_QUICK_DAILY_IP // main.EMAIL_QUICK_CAP):
        _call([f"x{n}{i}@gmail.com" for i in range(main.EMAIL_QUICK_CAP)], ip=ip)
    try:
        _call(["one-more@gmail.com"], ip=ip)
        assert False, "expected 429"
    except HTTPException as e:
        assert e.status_code == 429
    assert "results" in _call(["ok@gmail.com"], ip="fresh-ip")


def test_response_shape():
    r = _one("shape@gmail.com")
    assert set(r.keys()) == {"email", "verdict", "reason", "suggestion", "role_account", "free_mail"}
    assert r["verdict"] in ("valid", "risky", "invalid")


if __name__ == "__main__":
    fns = [(k, v) for k, v in sorted(globals().items()) if k.startswith("test_")]
    for name, fn in fns:
        fn()
        print(f"PASS {name}")
    print(f"\n{len(fns)} tests passed")
