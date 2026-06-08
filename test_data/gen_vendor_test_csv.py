"""Generate a 100K-contact CSV that exercises the new Engagement Decay column.

Vendor profile (designed so the report tells a clear story):
                  Volume   Bad email   Abandoned inbox
  ZoomInfo         40%       30%         55%   ← the villain
  Apollo           25%       25%         35%
  LinkedIn         20%       15%         15%
  Organic          15%        5%          5%   ← the hero

"Bad email"      → backend flags invalid or risky (validation decay)
"Abandoned"      → has last_send but no open/reply in the last 365d
                   (engagement decay — invisible to vendors who only
                    score email syntax)

Output: /tmp/test_vendor_signals.csv
"""
import csv
import random
from datetime import datetime, timedelta

random.seed(2026)

ROWS = 100_000
OUT = "/tmp/test_vendor_signals.csv"
TODAY = datetime(2026, 6, 8)

FIRST = ["Alex","Bailey","Casey","Drew","Emerson","Finley","Gray","Harper","Indie","Jordan",
         "Kai","Logan","Morgan","Noel","Owen","Parker","Quincy","Riley","Sage","Taylor",
         "Avery","Blair","Cameron","Dakota","Ellis","Frankie","Hayden","Iris","Jamie","Kendall"]
LAST = ["Adler","Bennett","Carter","Donovan","Ellis","Foster","Grant","Hayes","Iverson","Jensen",
        "Klein","Lowell","Marsh","Nash","Owens","Pierce","Quint","Reed","Sloan","Tate",
        "Underwood","Vance","Wells","Xiao","York","Zimmer","Avery","Brooks","Cole","Daly"]
COMPANIES = ["Acme Corp","Beacon Inc","Cardinal Logistics","Delta Freight","Echo Systems",
             "Foxtrot Trading","Helix Solutions","Ion Labs","Junction Co","Keystone Mfg",
             "Lattice AI","Meridian Group","Nexus Partners","Oakridge Capital","Pioneer Networks",
             "Quantum Dynamics","Ridgeline Inc","Summit Logistics","Tidewater Co","Unity Group"]
TITLES = ["VP Sales","Director of Operations","Head of Procurement","CFO","COO",
          "Sales Manager","Logistics Manager","RevOps Lead","Account Executive","BDR",
          "VP Marketing","Director of Engineering","CRO","Chief of Staff","Procurement Lead"]
GOOD_DOMAINS = ["northstar-logistics.com","ridgelinefreight.com","cargopoint.io",
                "globalshipping.net","prologistics.co","intermodal-co.com","triumph-mfg.com",
                "freightline.us","cascadelogistics.com","apexcarriers.com","truecargo.net",
                "blueoceanship.com","velocitytrans.io","keystonefreight.com","summitfreight.net"]

# (name, volume_share, bad_email_rate, abandoned_inbox_rate)
SOURCES = [
    ("ZoomInfo", 0.40, 0.30, 0.55),
    ("Apollo",   0.25, 0.25, 0.35),
    ("LinkedIn", 0.20, 0.15, 0.15),
    ("Organic",  0.15, 0.05, 0.05),
]


def pick_source():
    r = random.random()
    cum = 0.0
    for entry in SOURCES:
        cum += entry[1]
        if r < cum:
            return entry
    return SOURCES[-1]


def gen_valid_email(first, last):
    sep = random.choice([".", "_", ""])
    fmt = random.choice([
        f"{first.lower()}{sep}{last.lower()}",
        f"{first[0].lower()}{last.lower()}",
        f"{first.lower()}{last[0].lower()}",
    ])
    return f"{fmt}@{random.choice(GOOD_DOMAINS)}"


def gen_invalid_email(first, last):
    kind = random.choice(["empty", "no_at", "two_at", "space", "trailing_dot"])
    if kind == "empty": return ""
    if kind == "no_at": return f"{first.lower()}{last.lower()}example.com"
    if kind == "two_at": return f"{first.lower()}@@{last.lower()}.com"
    if kind == "space": return f"{first.lower()} {last.lower()}@example.com"
    return f"{first.lower()}.@.com"


def gen_risky_email(first, last):
    kind = random.choice(["mailinator", "10min", "yopmail", "guerrilla", "short", "single"])
    if kind == "mailinator": return f"{first.lower()}.{last.lower()}@mailinator.com"
    if kind == "10min":      return f"{first.lower()}@10minutemail.com"
    if kind == "yopmail":    return f"{first.lower()}.{last.lower()}@yopmail.com"
    if kind == "guerrilla":  return f"{first.lower()}@guerrillamail.com"
    if kind == "short":      return f"{first[0].lower()}@{random.choice(GOOD_DOMAINS)}"
    return f"{first.lower()}.{last.lower()}@x.io"


def date_n_days_ago(n):
    return (TODAY - timedelta(days=n)).strftime("%Y-%m-%d")


def gen_engagement(is_abandoned):
    """Return (last_send, last_open, last_reply).

    Abandoned profile: rep tried to reach them — send is on file, but
    no open or reply within the 365-day cutoff. Engaged profile: recent
    send + recent open (and sometimes a reply).
    """
    if is_abandoned:
        last_send = date_n_days_ago(random.randint(30, 700))
        if random.random() < 0.4:
            # Truly silent — no opens/replies at all.
            return last_send, "", ""
        # Or: stale opens/replies older than the 365d cutoff.
        return last_send, date_n_days_ago(random.randint(400, 900)), ""
    # Engaged
    last_send = date_n_days_ago(random.randint(1, 90))
    last_open = date_n_days_ago(random.randint(1, 60))
    last_reply = date_n_days_ago(random.randint(1, 60)) if random.random() < 0.4 else ""
    return last_send, last_open, last_reply


def gen_phone(invalid=False):
    if invalid and random.random() < 0.4:
        return random.choice(["", "555-12", "abc-def-ghij", "555"])
    return f"{random.randint(200,999)}{random.randint(2000000,9999999)}"


counts = {entry[0]: {"total": 0, "invalid": 0, "risky": 0, "abandoned": 0} for entry in SOURCES}

with open(OUT, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow([
        "email", "first_name", "last_name", "company", "title", "phone", "source",
        "last_email_send_date", "last_email_open_date", "last_email_reply_date",
    ])
    for _ in range(ROWS):
        first = random.choice(FIRST)
        last = random.choice(LAST)
        company = random.choice(COMPANIES)
        title = random.choice(TITLES)
        source, _share, bad_rate, abandoned_rate = pick_source()

        if random.random() < bad_rate:
            # Bad email — half hard-invalid, half risky.
            if random.random() < 0.5:
                email = gen_invalid_email(first, last)
                counts[source]["invalid"] += 1
            else:
                email = gen_risky_email(first, last)
                counts[source]["risky"] += 1
            email_was_bad = True
        else:
            email = gen_valid_email(first, last)
            email_was_bad = False

        # Engagement decay only meaningfully applies when the mailbox is valid —
        # otherwise the contact is already counted under validation decay.
        is_abandoned = (not email_was_bad) and (random.random() < abandoned_rate)
        if is_abandoned:
            counts[source]["abandoned"] += 1
        last_send, last_open, last_reply = gen_engagement(is_abandoned)

        phone = gen_phone(invalid=email_was_bad)
        counts[source]["total"] += 1

        w.writerow([
            email, first, last, company, title, phone, source,
            last_send, last_open, last_reply,
        ])

print(f"Wrote {ROWS:,} rows to {OUT}\n")
print(f"{'Source':10s} {'Volume':>8s} {'Invalid':>9s} {'Risky':>8s} {'Abandoned':>11s}")
for source, c in counts.items():
    t = c["total"]
    print(
        f"{source:10s} {t:>8,} "
        f"{c['invalid']/t:>8.1%} {c['risky']/t:>7.1%} {c['abandoned']/t:>10.1%}"
    )
