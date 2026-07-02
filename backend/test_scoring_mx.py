"""Tests for the domain-level MX layer in scoring.email_risk.

No network required: we pre-seed scoring._MX_CACHE so domain_has_mx() returns
deterministically. Run:  python backend/test_scoring_mx.py   (or: pytest)
"""
import scoring


def _seed(domain, value):
    scoring._MX_CACHE[domain.lower()] = value


def test_default_behavior_unchanged():
    # check_mx not requested -> identical to the original syntax-only result
    assert scoring.email_risk("jane.doe@example.com") == ("valid", "syntax_ok")
    assert scoring.email_risk("bad email@x.com") == ("invalid", "malformed")
    assert scoring.email_risk("") == ("invalid", "empty")


def test_mx_present_marks_mx_ok():
    _seed("haszmx.com", True)
    assert scoring.email_risk("jane.doe@haszmx.com", check_mx=True) == ("valid", "mx_ok")


def test_no_mx_marks_invalid():
    _seed("nomx.com", False)
    assert scoring.email_risk("jane.doe@nomx.com", check_mx=True) == ("invalid", "no_mx_record")


def test_unknown_mx_never_penalizes():
    _seed("unknown.com", None)  # resolver missing / timeout
    assert scoring.email_risk("jane.doe@unknown.com", check_mx=True) == ("valid", "syntax_ok")


def test_syntax_failure_still_wins_over_mx():
    # malformed never reaches the MX stage
    assert scoring.email_risk("nope", check_mx=True) == ("invalid", "malformed")


def test_cache_is_used():
    _seed("cached.com", True)
    scoring.email_risk("a.b@cached.com", check_mx=True)
    assert scoring._MX_CACHE["cached.com"] is True


if __name__ == "__main__":
    fns = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    for fn in fns:
        fn()
        print(f"PASS {fn.__name__}")
    print(f"\nAll {len(fns)} tests passed.")
