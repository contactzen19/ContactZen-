import re
from typing import Tuple

from email_validator import validate_email, EmailNotValidError


DISPOSABLE_DOMAIN_HINTS = {
    "mailinator", "guerrillamail", "10minutemail", "temp-mail", "yopmail"
}


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


def email_risk(email) -> Tuple[str, str]:
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
    return "valid", "syntax_ok"
