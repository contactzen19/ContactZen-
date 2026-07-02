import os
import re
from typing import Optional, Tuple

from email_validator import validate_email, EmailNotValidError

# dnspython is optional: if it isn't installed, MX checks degrade to "unknown"
# (we never penalize a contact for a check we couldn't run).
try:
    import dns.resolver as _dns_resolver
    _DNS_AVAILABLE = True
except ImportError:  # pragma: no cover - environment dependent
    _DNS_AVAILABLE = False


DISPOSABLE_DOMAIN_HINTS = {
    "mailinator", "guerrillamail", "10minutemail", "temp-mail", "yopmail"
}

# Domain-level MX is the cheap, free layer above syntax: does this domain
# accept mail at all? (Mailbox-level "does this inbox exist" is a separate,
# paid layer handled by a verification API — see verify_api.py.)
# Default OFF so existing scans/demos are unchanged; enable per-scan with the
# REACHAUDIT_MX_CHECK env var or by passing check_mx=True.
_MX_CACHE: dict = {}


def domain_has_mx(domain: str) -> Optional[bool]:
    """True = domain has MX records (can receive mail), False = none (cannot),
    None = unknown (no resolver available, or a transient/timeout error).
    Cached per domain so a large file does one lookup per unique domain."""
    if not domain:
        return False
    domain = domain.lower().strip()
    if domain in _MX_CACHE:
        return _MX_CACHE[domain]
    if not _DNS_AVAILABLE:
        _MX_CACHE[domain] = None
        return None
    try:
        answers = _dns_resolver.resolve(domain, "MX", lifetime=5.0)
        result: Optional[bool] = len(answers) > 0
    except (_dns_resolver.NXDOMAIN, _dns_resolver.NoAnswer):
        result = False
    except Exception:
        # Timeout / NoNameservers / network blip — don't penalize, mark unknown.
        result = None
    _MX_CACHE[domain] = result
    return result


def normalize_phone(phone) -> str:
    if phone is None:
        return ""
    return re.sub(r"\D", "", str(phone))


def phone_risk(phone) -> Tuple[str, str]:
    if phone is None or str(phone).strip() == "" or str(phone).lower() == "nan":
        return "missing", "missing_phone"
    digits = normalize_phone(phone)
    if len(digits) < 10:
        return "invalid", "invalid_phone"
    toll_free = ("800", "888", "877", "866", "855", "844", "833", "822")
    if digits.startswith(toll_free):
        return "risky", "shared_or_main_line_suspected"
    return "valid", "phone_ok"


def email_risk(email, check_mx: Optional[bool] = None) -> Tuple[str, str]:
    if email is None:
        return "invalid", "empty"
    email = str(email).strip()
    if email == "" or email.lower() == "nan":
        return "invalid", "empty"
    if " " in email or email.count("@") != 1:
        return "invalid", "malformed"
    try:
        v = validate_email(email, check_deliverability=False)
        normalized = v.email
    except EmailNotValidError:
        return "invalid", "syntax"
    domain = normalized.split("@")[-1].lower()
    for hint in DISPOSABLE_DOMAIN_HINTS:
        if hint in domain:
            return "risky", "disposable_domain_hint"
    local = normalized.split("@")[0]
    if len(local) < 2 or len(domain) < 4:
        return "risky", "suspicious_structure"
    # Domain-level MX layer (opt-in). A syntactically valid address on a domain
    # with no MX records cannot receive mail -> invalid. Unknown (None) is left
    # as syntax_ok so a failed lookup never silently downgrades a contact.
    if check_mx is None:
        check_mx = os.environ.get("REACHAUDIT_MX_CHECK", "0") == "1"
    if check_mx:
        mx = domain_has_mx(domain)
        if mx is False:
            return "invalid", "no_mx_record"
        if mx is True:
            return "valid", "mx_ok"
    return "valid", "syntax_ok"
